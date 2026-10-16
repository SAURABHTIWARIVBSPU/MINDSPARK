import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { getDb } from '@/lib/db';
import { getStorageAdapter } from '@/lib/storage';
import { generateAdmitCardPdf } from '@/lib/pdf/template';

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
      let pdfBytes: Uint8Array | null = null;

      if (cardRecord?.fileId) {
        pdfBytes = await storage.getFile(cardRecord.fileId);
      }

      if (!pdfBytes) {
        pdfBytes = await generateAdmitCardPdf(student, settings);
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
      },
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
