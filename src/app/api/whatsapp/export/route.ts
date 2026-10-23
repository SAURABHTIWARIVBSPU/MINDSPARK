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
  getCategoryGroupLink,
} from '@/lib/whatsapp/message-builder';
import { normalizePhone, sanitizeForSpreadsheet } from '@/lib/excel/normalizer';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'messages.prepare');

    let body: any = {};
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await req.json().catch(() => ({}));
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        body = Object.fromEntries(formData.entries());
      }
    }

    const {
      studentIds = [],
      templateType = 'REGISTRATION_CONFIRMATION',
      customMessage = '',
      format = 'xlsx',
      statusFilter = '',
    } = body;

    const db = getDb();
    const settings = await db.getSettings();
    const allActive = await db.getAllActiveStudents();

    let targetStudents = allActive;
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      const idSet = new Set(studentIds);
      targetStudents = allActive.filter((s) => idSet.has(s.studentId));
    } else if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'SENT') {
        targetStudents = allActive.filter((s) => ['SENT', 'DELIVERED', 'READ', 'OPENED'].includes(s.whatsappStatus || ''));
      } else if (statusFilter === 'NOT_SENT') {
        targetStudents = allActive.filter((s) => !s.whatsappStatus || s.whatsappStatus === 'NOT_SENT');
      } else if (statusFilter === 'FAILED') {
        targetStudents = allActive.filter((s) => s.whatsappStatus === 'FAILED');
      }
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
      'Class Category',
      'Competition',
      'Assigned WhatsApp Group Link',
      'Personalized Message',
      'WhatsApp Status',
      'Last Sent At',
    ];

    const mapStudentToRow = (s: typeof allActive[0]) => {
      const cleanPhone = normalizePhone(s.phone);
      const renderedMsg = renderMessageTemplate(rawTemplate, s, settings, origin);
      const waLink = generateWhatsAppLink(s, settings, renderedMsg);
      const assignedGroupLink = getCategoryGroupLink(s.competitionName, settings, s.className);

      return [
        sanitizeForSpreadsheet(s.registrationNumber),
        sanitizeForSpreadsheet(s.name),
        sanitizeForSpreadsheet(s.phone),
        cleanPhone,
        waLink,
        sanitizeForSpreadsheet(s.schoolOrCollege),
        sanitizeForSpreadsheet(s.className),
        s.className || 'General',
        sanitizeForSpreadsheet(s.competitionName),
        assignedGroupLink,
        renderedMsg,
        s.whatsappStatus || 'NOT_SENT',
        s.whatsappSentAt || '',
      ];
    };

    const colWidths = [
      { wch: 16 },
      { wch: 22 },
      { wch: 15 },
      { wch: 15 },
      { wch: 35 },
      { wch: 28 },
      { wch: 10 },
      { wch: 14 },
      { wch: 24 },
      { wch: 45 },
      { wch: 50 },
      { wch: 14 },
      { wch: 20 },
    ];

    const allRows = targetStudents.map(mapStudentToRow);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...allRows]);
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'WhatsApp_Dispatch');

    // Sheet 2: Dispatched / Sent Students
    const sentStudents = targetStudents.filter((s) => ['SENT', 'DELIVERED', 'READ', 'OPENED'].includes(s.whatsappStatus || ''));
    const sentRows = sentStudents.map(mapStudentToRow);
    const sentWorksheet = XLSX.utils.aoa_to_sheet([headers, ...sentRows]);
    sentWorksheet['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(workbook, sentWorksheet, 'Dispatched_Sent');

    // Sheet 3: Pending Queue Students (Unsent)
    const pendingStudents = targetStudents.filter((s) => !s.whatsappStatus || s.whatsappStatus === 'NOT_SENT');
    const pendingRows = pendingStudents.map(mapStudentToRow);
    const pendingWorksheet = XLSX.utils.aoa_to_sheet([headers, ...pendingRows]);
    pendingWorksheet['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(workbook, pendingWorksheet, 'Pending_Queue');

    // Sheet 4: Summary Metrics
    const failedStudents = targetStudents.filter((s) => s.whatsappStatus === 'FAILED');
    const compCounts: Record<string, { total: number; sent: number; pending: number; failed: number }> = {};
    for (const s of targetStudents) {
      const c = s.competitionName || 'OTHER';
      if (!compCounts[c]) compCounts[c] = { total: 0, sent: 0, pending: 0, failed: 0 };
      compCounts[c].total++;
      if (['SENT', 'DELIVERED', 'READ', 'OPENED'].includes(s.whatsappStatus || '')) compCounts[c].sent++;
      else if (s.whatsappStatus === 'FAILED') compCounts[c].failed++;
      else compCounts[c].pending++;
    }

    const summaryHeaders = ['Metric / Category', 'Count / Details'];
    const summaryRows: any[][] = [
      ['Total Target Candidates', targetStudents.length],
      ['Total Active Database Registry', allActive.length],
      ['Dispatched (Sent / Delivered)', sentStudents.length],
      ['Pending Queue (Awaiting Send)', pendingStudents.length],
      ['Delivery Failed', failedStudents.length],
      ['Report Generated At', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
      [],
      ['Competition Breakdown:', ''],
      ['Competition Name', 'Total', 'Sent', 'Pending', 'Failed'],
      ...Object.entries(compCounts).map(([name, counts]) => [name, counts.total, counts.sent, counts.pending, counts.failed]),
    ];
    const summaryWorksheet = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
    summaryWorksheet['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary_Report');

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

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'messages.prepare');

    const fs = await import('fs');
    const path = await import('path');
    const auditPath = path.join(process.cwd(), 'storage', 'whatsapp_logs', 'whatsapp_dispatch_audit_log.xlsx');

    if (fs.existsSync(auditPath)) {
      const buffer = fs.readFileSync(auditPath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="whatsapp_realtime_audit_log.xlsx"',
        },
      });
    }

    // Fallback: Generate real-time log of all students from DB
    const db = getDb();
    const students = await db.getAllActiveStudents();
    const logRows = students.map((s) => ({
      'Registration Number': s.registrationNumber,
      'Student Name': s.name,
      'Mobile Phone': s.phone,
      'Class': s.className,
      'Competition / Event': s.competitionName,
      'School': s.schoolOrCollege,
      'WhatsApp Status': s.whatsappStatus || 'NOT_SENT',
      'Sent At': s.whatsappSentAt || 'N/A',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(logRows);
    XLSX.utils.book_append_sheet(wb, ws, 'RealTime_WhatsApp_Log');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="whatsapp_students_audit_log.xlsx"',
      },
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Audit log retrieval failed' }, { status });
  }
}
