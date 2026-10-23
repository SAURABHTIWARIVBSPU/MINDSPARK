import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import {
  getTestStaffList,
  addTestStaffRecipient,
  updateStaffDispatchStatus,
} from '@/lib/excel/test-staff-manager';
import { ICPaaSAdapter } from '@/lib/whatsapp/icpaas.adapter';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staffList = await getTestStaffList();
    return NextResponse.json({ success: true, count: staffList.length, staff: staffList });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action = 'dispatch' } = body;

    // Action 1: Add new teacher/staff with duplicate protection
    if (action === 'add') {
      assertPermission(user, 'students.create');
      const { name, phone, designation, school, email, notes } = body;

      if (!name || !phone) {
        return NextResponse.json(
          { error: 'Both Teacher Name and Mobile Number are required.' },
          { status: 400 }
        );
      }

      const result = await addTestStaffRecipient({
        name,
        phone,
        designation,
        school,
        email,
        notes,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const updatedList = await getTestStaffList();
      return NextResponse.json({
        success: true,
        message: `Teacher '${result.recipient?.name}' registered successfully without duplicate.`,
        recipient: result.recipient,
        staff: updatedList,
      });
    }

    // Action 2: Dispatch test message to teachers
    if (action === 'dispatch') {
      assertPermission(user, 'messages.send');
      const {
        phones = [],
        templateName = 'admit_card_new',
        templateLanguage = 'en',
        customText = '',
      } = body;

      const staffList = await getTestStaffList();
      const targetStaff =
        Array.isArray(phones) && phones.length > 0
          ? staffList.filter((s) => phones.includes(s.phone))
          : staffList;

      if (targetStaff.length === 0) {
        return NextResponse.json(
          { error: 'No valid teacher/staff recipients found for dispatch.' },
          { status: 400 }
        );
      }

      const db = getDb();
      const settings = await db.getSettings();
      const origin = req.nextUrl.origin;
      const adapter = new ICPaaSAdapter();

      const results = [];
      let successCount = 0;
      let failCount = 0;

      for (const teacher of targetStaff) {
        const testRegNo = `TEACHER_${teacher.phone.slice(-4)}`;
        const sampleMessage =
          customText && customText.trim()
            ? customText
                .replace(/{name}/g, teacher.name)
                .replace(/{reg_no}/g, testRegNo)
                .replace(/{registrationNumber}/g, testRegNo)
                .replace(/{venue}/g, settings.venue || 'MSITM DEGREE COLLEGE GONDA')
            : `*Meena Shah Public School, Gonda*\n*Mind Spark Competition- 2026*\n\nDear Participant,\n\nYour form has been successfully enrolled for Mind Spark Competition 2026.\nThis is your Registration Number: ${testRegNo}\n\nAfter 26th October, we will provide a link on your WhatsApp to download your admit card. You can enter your Registration Number and Date of Birth to download your admit card.\n\n\n*नोट: आप सभी प्रतिभागियों के लिए नीचे दिए गए अपने Competition से संबंधित व्हाट्सएप ग्रुप लिंक पर क्लिक करके जॉइन करना अनिवार्य है।*\n👇\nLink: https://chat.whatsapp.com/DTuxN2SADVdCm714xkPB3L\n\n*Thank you,*\n*Team Meena Shah Public School, Gonda*`;

        // Parameters matching approved Meta template admit_card_new
        const bodyParams = [
          settings.competitionTitle || 'Mind Spark Competition- 2026',
          `Participant ${teacher.name}`,
          `Your form has been successfully enrolled for Mind Spark Competition 2026 This is your Registration Number: ${testRegNo}`,
          'After 26th October, we will provide a link on your WhatsApp to download your admit card. You can enter your Registration Number and Date of Birth to download your admit card.',
          'Join whatspp group for more update https://chat.whatsapp.com/DTuxN2SADVdCm714xkPB3L',
        ];

        const sendResult = await adapter.sendMessage(teacher.phone, sampleMessage, {
          templateName,
          language: templateLanguage,
          bodyParams,
        });

        const status = sendResult.success ? 'SENT' : 'FAILED';
        await updateStaffDispatchStatus(
          teacher.phone,
          status,
          sendResult.success ? 'Delivered via ICPaaS' : sendResult.error
        );

        if (sendResult.success) {
          successCount++;
        } else {
          failCount++;
        }

        results.push({
          name: teacher.name,
          phone: teacher.phone,
          success: sendResult.success,
          error: sendResult.error,
        });
      }

      const updatedList = await getTestStaffList();

      return NextResponse.json({
        success: true,
        total: targetStaff.length,
        successCount,
        failCount,
        results,
        staff: updatedList,
      });
    }

    return NextResponse.json({ error: `Unknown action: '${action}'` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
