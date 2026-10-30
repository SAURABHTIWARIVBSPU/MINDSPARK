import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { StudentFormSchema } from '@/lib/validation/student.schema';
import { validateStudentEligibility } from '@/lib/validation/eligibility';
import { registerCandidateInRankCache } from '@/lib/pdf/event-schedule';

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

    // 1. Authoritative Program & Class Eligibility Validation
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

    // 2. Real-Time Venue & Batch Capacity Check
    if (eligibility.schedule.isHold && eligibility.schedule.holdReason?.includes('maximum venue capacity')) {
      return NextResponse.json(
        {
          error: eligibility.schedule.holdReason,
          status: 'OVER_CAPACITY_BLOCKED',
          eventKey: eligibility.eventKey
        },
        { status: 409 }
      );
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'admin-console';
    const adminProvenance = `ADMIN_PANEL:${user!.email || user!.uid}`;

    const db = getDb();
    // 3. Register candidate in rank cache to reserve sequential rank
    const student = await db.createStudent({
      registrationNumber: validated.registrationNumber || '',
      name: validated.name.toUpperCase(),
      fatherName: validated.fatherName.toUpperCase(),
      dateOfBirth: validated.dateOfBirth,
      phone: validated.phone,
      schoolOrCollege: validated.schoolOrCollege.toUpperCase(),
      className: validated.className.toUpperCase(),
      competitionName: eligibility.canonicalCompetition,
      status: validated.status,
      sourceImportId: 'ADMIN_PANEL',
      registrationSource: 'ADMIN_PANEL',
      createdBy: adminProvenance,
      updatedBy: adminProvenance,
    });

    registerCandidateInRankCache(student.competitionName, student.className, student.registrationNumber);

    await db.addAuditLog({
      actorUid: user!.uid,
      actorEmail: user!.email,
      action: 'STUDENT_REGISTERED_ADMIN_PANEL',
      targetType: 'STUDENT',
      targetId: student.studentId,
      details: {
        registrationSource: 'ADMIN_PANEL',
        registrationNumber: student.registrationNumber,
        name: student.name,
        fatherName: student.fatherName,
        phone: student.phone,
        competitionName: student.competitionName,
        className: student.className,
        schoolOrCollege: student.schoolOrCollege,
        registeredByEmail: user!.email,
        registeredByRole: user!.role,
        clientIp,
        userAgent,
        isHold: eligibility.isHold,
        holdReason: eligibility.holdReason,
        registeredAt: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        student,
        schedule: {
          eventKey: eligibility.eventKey,
          examTime: eligibility.schedule.examTime,
          reportingTime: eligibility.schedule.reportingTime,
          venue: `${eligibility.schedule.venueMain} - ${eligibility.schedule.venueDetail}`,
          shiftBatch: eligibility.schedule.batchInfo,
          isHold: eligibility.isHold,
          holdReason: eligibility.holdReason,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    let status = 400;
    if (err.message?.includes('Unauthorized')) {
      status = 403;
    } else if (err.message?.includes('DUPLICATE REGISTRATION CONFLICT') || err.message?.includes('COLLISION')) {
      status = 409;
    }
    return NextResponse.json({ error: err.message }, { status });
  }
}
