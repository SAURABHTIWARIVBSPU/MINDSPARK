import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { resolveStudentWhatsAppGroup } from '@/lib/whatsapp/message-builder';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const regNo = searchParams.get('regNo');
  const studentId = searchParams.get('studentId');

  const db = getDb();
  const settings = await db.getSettings();

  let targetStudent = null;
  if (regNo) {
    targetStudent = await db.getStudentByRegNo(regNo);
  } else if (studentId) {
    targetStudent = await db.getStudentById(studentId);
  }

  let destinationUrl = settings.defaultWhatsAppGroupLink || 'https://chat.whatsapp.com/DTuxN2SADVdCm714xkPB3L';

  if (targetStudent) {
    const resolved = resolveStudentWhatsAppGroup(targetStudent, settings);
    if (resolved?.groupLink) {
      destinationUrl = resolved.groupLink;
    }

    // Mark student as OPENED / ENGAGED in real-time
    try {
      if (targetStudent.whatsappStatus !== 'READ') {
        await db.updateStudent(targetStudent.studentId, {
          whatsappStatus: 'OPENED',
          whatsappSentAt: targetStudent.whatsappSentAt || new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Failed to update group click tracking:', e);
    }
  }

  // Redirect to official WhatsApp group
  return NextResponse.redirect(destinationUrl, 307);
}
