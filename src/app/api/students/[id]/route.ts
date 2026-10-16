import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { StudentFormSchema } from '@/lib/validation/student.schema';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'students.read');

    const { id } = await params;
    const db = getDb();
    const student = await db.getStudentById(id);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'students.update');

    const { id } = await params;
    const body = await req.json();
    const validated = StudentFormSchema.parse(body);

    const db = getDb();
    const updated = await db.updateStudent(id, {
      registrationNumber: validated.registrationNumber,
      name: validated.name.toUpperCase(),
      fatherName: validated.fatherName.toUpperCase(),
      dateOfBirth: validated.dateOfBirth,
      phone: validated.phone,
      schoolOrCollege: validated.schoolOrCollege.toUpperCase(),
      className: validated.className.toUpperCase(),
      competitionName: validated.competitionName.toUpperCase(),
      status: validated.status,
      updatedBy: user!.uid,
    });

    await db.addAuditLog({
      actorUid: user!.uid,
      actorEmail: user!.email,
      action: 'STUDENT_UPDATED',
      targetType: 'STUDENT',
      targetId: id,
      details: {
        registrationNumber: updated.registrationNumber,
      },
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'students.archive');

    const { id } = await params;
    const db = getDb();
    const success = await db.archiveStudent(id, user!.uid);

    if (!success) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await db.addAuditLog({
      actorUid: user!.uid,
      actorEmail: user!.email,
      action: 'STUDENT_ARCHIVED',
      targetType: 'STUDENT',
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
