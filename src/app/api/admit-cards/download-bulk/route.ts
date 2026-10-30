import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { getDb } from '@/lib/db';
import { getStorageAdapter } from '@/lib/storage';
import { generateAdmitCardPdf, computeStudentDataHash, ADMIT_CARD_TEMPLATE_VERSION } from '@/lib/pdf/template';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'admitCards.download');

    const body = await req.json().catch(() => ({}));
    const { competition } = body;

    const db = getDb();
    let students = await db.getAllActiveStudents();
    if (competition) {
      students = students.filter(
        (s) => s.competitionName.toLowerCase() === competition.toLowerCase()
      );
    }

    if (students.length === 0) {
      return NextResponse.json({ error: 'No students found matching criteria' }, { status: 404 });
    }

    // Limit bulk in single HTTP request to 200 cards for serverless safety
    const safeSlice = students.slice(0, 200);

    const storage = getStorageAdapter();
    const settings = await db.getSettings();
    const cards = await db.getAdmitCards();
    const cardMap = new Map(cards.map((c) => [c.studentId, c]));

    const zip = new JSZip();

    for (const student of safeSlice) {
      const cardRecord = cardMap.get(student.studentId);
      const expectedHash = computeStudentDataHash(student, ADMIT_CARD_TEMPLATE_VERSION);
      let pdfBytes: Uint8Array | null = null;

      if (cardRecord?.fileId && cardRecord.sourceDataHash === expectedHash && cardRecord.status === 'READY') {
        try {
          pdfBytes = await storage.getFile(cardRecord.fileId);
        } catch {
          pdfBytes = null;
        }
      }

      if (!pdfBytes) {
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
          console.warn('Admit card bulk cache save warning:', cacheErr);
        }
      }

      const fileName = `${student.registrationNumber}_${student.name.replace(/\s+/g, '_')}.pdf`;
      zip.file(fileName, pdfBytes);
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    await db.addAuditLog({
      actorUid: user!.uid,
      actorEmail: user!.email,
      action: 'BULK_ADMIT_CARDS_DOWNLOADED',
      targetType: 'ADMIT_CARD',
      targetId: 'bulk_zip',
      details: {
        count: safeSlice.length,
      },
    });

    return new NextResponse(Buffer.from(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="MindSpark_AdmitCards_${new Date().toISOString().split('T')[0]}.zip"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
