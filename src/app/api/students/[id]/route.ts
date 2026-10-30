import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { StudentFormSchema } from '@/lib/validation/student.schema';
import { validateStudentEligibility } from '@/lib/validation/eligibility';
import { registerCandidateInRankCache, transferCandidateRank, reallocateCandidateEvent, resolveEventKey } from '@/lib/pdf/event-schedule';
import { getStorageAdapter } from '@/lib/storage';

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
    const db = getDb();
    const existingStudent = await db.getStudentById(id);

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

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

    // Check capacity for updated program
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

    // 1. Immediately invalidate old admit card and remove previous physical PDF file from storage
    const oldCard = await db.getAdmitCardByStudentId(id);
    if (oldCard?.fileId) {
      try {
        const storage = getStorageAdapter();
        await storage.deleteFile(oldCard.fileId);
      } catch (storageErr) {
        console.warn('Old admit card storage file deletion warning:', storageErr);
      }
    }
    await db.deleteAdmitCardByStudentId(id);

    // 2. Perform atomic student update
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

    // 3. Timing & Schedule Permanence Guarantee:
    // Only re-rank if event program/grade actually changed.
    // Never re-rank or alter shifts for edits to Name, Father, DOB, Phone, or School!
    const oldEventKey = resolveEventKey(existingStudent.competitionName, existingStudent.className);
    const newEventKey = resolveEventKey(updated.competitionName, updated.className);
    const eventChanged = oldEventKey !== newEventKey;

    if (eventChanged) {
      reallocateCandidateEvent(
        updated.registrationNumber,
        existingStudent.competitionName,
        existingStudent.className,
        updated.competitionName,
        updated.className
      );
    } else if (existingStudent.registrationNumber !== updated.registrationNumber) {
      transferCandidateRank(
        existingStudent.registrationNumber,
        updated.registrationNumber,
        updated.competitionName,
        updated.className
      );
    }

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
