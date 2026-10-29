import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { StudentFormSchema } from '@/lib/validation/student.schema';
import { validateStudentEligibility } from '@/lib/validation/eligibility';

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

    // Validate eligibility for the updated competition & class
    const eligibility = validateStudentEligibility(validated.competitionName, validated.className);
    if (!eligibility.valid) {
      return NextResponse.json(
        {
          error: eligibility.error || 'Invalid competition program or incompatible class grade.',
          eventKey: eligibility.eventKey
        },
        { status: 400 }
      );
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'admin-console';
    const adminProvenance = `ADMIN_PANEL:${user!.email || user!.uid}`;

    const db = getDb();
    const updated = await db.updateStudent(id, {
      registrationNumber: validated.registrationNumber,
      name: validated.name.toUpperCase(),
      fatherName: validated.fatherName.toUpperCase(),
      dateOfBirth: validated.dateOfBirth,
      phone: validated.phone,
      schoolOrCollege: validated.schoolOrCollege.toUpperCase(),
      className: validated.className.toUpperCase(),
      competitionName: eligibility.canonicalCompetition,
      status: validated.status,
      updatedBy: adminProvenance,
    });

    await db.addAuditLog({
      actorUid: user!.uid,
      actorEmail: user!.email,
      action: 'STUDENT_UPDATED_ADMIN_PANEL',
      targetType: 'STUDENT',
      targetId: id,
      details: {
        source: 'ADMIN_PANEL',
        registrationNumber: updated.registrationNumber,
        name: updated.name,
        competitionName: updated.competitionName,
        className: updated.className,
        editorEmail: user!.email,
        editorRole: user!.role,
        clientIp,
        userAgent,
        updatedAt: new Date().toISOString(),
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
