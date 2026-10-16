import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { getDb } from '@/lib/db';
import { getStorageAdapter } from '@/lib/storage';
import { generateAdmitCardPdf } from '@/lib/pdf/template';

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

    const storage = getStorageAdapter();
    const cardRecord = await db.getAdmitCardByStudentId(studentId);

    let pdfBytes: Uint8Array | null = null;
    if (cardRecord?.fileId) {
      pdfBytes = await storage.getFile(cardRecord.fileId);
    }

    // Fallback: If not in storage or not generated yet, generate fresh
    if (!pdfBytes) {
      const settings = await db.getSettings();
      pdfBytes = await generateAdmitCardPdf(student, settings);
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
