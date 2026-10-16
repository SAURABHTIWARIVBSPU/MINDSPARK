import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { StudentFormSchema } from '@/lib/validation/student.schema';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'students.read');

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const search = searchParams.get('search') || '';
    const competition = searchParams.get('competition') || '';
    const className = searchParams.get('className') || '';
    const status = searchParams.get('status') || '';

    const db = getDb();
    const result = await db.getStudents({
      page,
      pageSize,
      search,
      competition: competition || undefined,
      className: className || undefined,
      status: status || undefined,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'students.create');

    const body = await req.json();
    const validated = StudentFormSchema.parse(body);

    const db = getDb();
    const student = await db.createStudent({
      registrationNumber: validated.registrationNumber || '',
      name: validated.name.toUpperCase(),
      fatherName: validated.fatherName.toUpperCase(),
      dateOfBirth: validated.dateOfBirth,
      phone: validated.phone,
      schoolOrCollege: validated.schoolOrCollege.toUpperCase(),
      className: validated.className.toUpperCase(),
      competitionName: validated.competitionName.toUpperCase(),
      status: validated.status,
      createdBy: user!.uid,
      updatedBy: user!.uid,
    });

    await db.addAuditLog({
      actorUid: user!.uid,
      actorEmail: user!.email,
      action: 'STUDENT_CREATED',
      targetType: 'STUDENT',
      targetId: student.studentId,
      details: {
        registrationNumber: student.registrationNumber,
        name: student.name,
      },
    });

    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
