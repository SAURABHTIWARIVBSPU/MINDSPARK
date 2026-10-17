import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import {
  renderMessageTemplate,
  generateWhatsAppLink,
  WHATSAPP_TEMPLATES,
  WhatsAppTemplateId,
} from '@/lib/whatsapp/message-builder';
import { normalizePhone, sanitizeForSpreadsheet } from '@/lib/excel/normalizer';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'messages.prepare');

    const body = await req.json().catch(() => ({}));
    const {
      studentIds = [],
      templateType = 'REGISTRATION_CONFIRMATION',
      customMessage = '',
      format = 'xlsx',
    } = body;

    const db = getDb();
    const settings = await db.getSettings();
    const allActive = await db.getAllActiveStudents();

    let targetStudents = allActive;
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      const idSet = new Set(studentIds);
      targetStudents = allActive.filter((s) => idSet.has(s.studentId));
    }

    const templateDef =
      WHATSAPP_TEMPLATES[templateType as WhatsAppTemplateId] ||
      WHATSAPP_TEMPLATES.REGISTRATION_CONFIRMATION;
    const rawTemplate =
      customMessage && customMessage.trim() ? customMessage : templateDef.defaultText;
    const origin = req.nextUrl.origin;

    const headers = [
      'Registration Number',
      'Candidate Name',
      'Phone Number',
      'Clean 10-Digit Phone',
      'WhatsApp Click-to-Chat Link',
      'School / College',
      'Class',
      'Competition',
      'Personalized Message',
      'WhatsApp Status',
      'Last Sent At',
    ];

    const rows = targetStudents.map((s) => {
      const cleanPhone = normalizePhone(s.phone);
      const renderedMsg = renderMessageTemplate(rawTemplate, s, settings, origin);
      const waLink = generateWhatsAppLink(s, settings, renderedMsg);

      return [
        sanitizeForSpreadsheet(s.registrationNumber),
        sanitizeForSpreadsheet(s.name),
        sanitizeForSpreadsheet(s.phone),
        cleanPhone,
        waLink,
        sanitizeForSpreadsheet(s.schoolOrCollege),
        sanitizeForSpreadsheet(s.className),
        sanitizeForSpreadsheet(s.competitionName),
        renderedMsg,
        s.whatsappStatus || 'NOT_SENT',
        s.whatsappSentAt || '',
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!cols'] = [
      { wch: 16 },
      { wch: 22 },
      { wch: 15 },
      { wch: 15 },
      { wch: 35 },
      { wch: 28 },
      { wch: 10 },
      { wch: 20 },
      { wch: 50 },
      { wch: 14 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'WhatsApp_Dispatch');

    const dateStr = new Date().toISOString().split('T')[0];
    const isCsv = format.toLowerCase() === 'csv';

    if (isCsv) {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="whatsapp_broadcast_${dateStr}.csv"`,
        },
      });
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="whatsapp_dispatch_${dateStr}.xlsx"`,
      },
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Export generation failed' }, { status });
  }
}
