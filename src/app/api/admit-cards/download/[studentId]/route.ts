import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { getDb } from '@/lib/db';
import { getStorageAdapter } from '@/lib/storage';
import {
  generateAdmitCardPdf,
  computeStudentDataHash,
  ADMIT_CARD_TEMPLATE_VERSION,
} from '@/lib/pdf/template';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'admitCards.download');

    const { studentId } = await params;
    const db = getDb();
    const student = await db.getStudentById(studentId);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Enforce Committee HOLD Directive: Do not issue confirmed admit cards for ON_HOLD programs
    const { getStudentEventSchedule } = await import('@/lib/pdf/event-schedule');
    const schedule = getStudentEventSchedule(student.competitionName, student.className, student.registrationNumber);
    if (schedule.isHold) {
      return NextResponse.json(
        {
          error: `Admit card issuance locked: ${schedule.holdReason || 'Event schedule is currently ON HOLD per Committee Directive.'}`,
          status: 'ON_HOLD',
          event: schedule.eventName,
        },
        { status: 403 }
      );
    }

    const storage = getStorageAdapter();
    const cardRecord = await db.getAdmitCardByStudentId(studentId);
    const expectedHash = computeStudentDataHash(student, ADMIT_CARD_TEMPLATE_VERSION);

    let pdfBytes: Uint8Array | null = null;
    if (cardRecord?.fileId && cardRecord.sourceDataHash === expectedHash && cardRecord.status === 'READY') {
      try {
        pdfBytes = await storage.getFile(cardRecord.fileId);
      } catch (storageErr) {
        console.warn('Storage fetch fallback to dynamic generation:', storageErr);
      }
    }

    // Fallback: If not in storage or template version updated, generate fresh
    if (!pdfBytes) {
      const settings = await db.getSettings();
      pdfBytes = await generateAdmitCardPdf(student, settings);

      try {
        const fileName = `AdmitCard_${student.registrationNumber}_${student.name.replace(/\s+/g, '_')}.pdf`;
        const { fileId, storageType } = await storage.saveFile(fileName, pdfBytes, 'application/pdf');
        const now = new Date().toISOString();
        await db.saveAdmitCard({
          studentId: student.studentId,
          registrationNumber: student.registrationNumber,
          fileId,
          storageType,
          templateVersion: ADMIT_CARD_TEMPLATE_VERSION,
          sourceDataHash: expectedHash,
          status: 'READY',
          generatedAt: now,
          updatedAt: now,
        });
      } catch (cacheErr) {
        console.warn('Admit card background cache save warning:', cacheErr);
      }
    }

    await db.addAuditLog({
      actorUid: user!.uid,
      actorEmail: user!.email,
      action: 'ADMIT_CARD_DOWNLOADED',
      targetType: 'ADMIT_CARD',
      targetId: student.registrationNumber,
      details: {
        studentId: student.studentId,
        studentName: student.name,
      },
    });

    const safeFileName = `AdmitCard_${student.registrationNumber}_${student.name.replace(/\s+/g, '_')}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeFileName}"`,
      },
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
