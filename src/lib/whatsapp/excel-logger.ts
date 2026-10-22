import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { Student, WhatsAppStatus } from '@/types';

export interface DispatchLogEntry {
  timestamp: string;
  studentId: string;
  registrationNumber: string;
  studentName: string;
  phone: string;
  className: string;
  competitionName: string;
  schoolOrCollege: string;
  status: WhatsAppStatus;
  provider: string;
  details?: string;
}

const LOGS_DIR = path.join(process.cwd(), 'storage', 'whatsapp_logs');
const AUDIT_EXCEL_PATH = path.join(LOGS_DIR, 'whatsapp_dispatch_audit_log.xlsx');
const AUDIT_CSV_PATH = path.join(LOGS_DIR, 'whatsapp_dispatch_audit_log.csv');
const MASTER_WORKBOOK_PATH = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

/**
 * Ensures directory exists safely
 */
function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Appends entries to the persistent real-time dispatch audit logs (Excel + CSV)
 */
export async function logWhatsAppDispatchRealTime(
  entries: DispatchLogEntry[]
): Promise<{ loggedCount: number; excelPath: string; csvPath: string }> {
  if (!entries || entries.length === 0) {
    return { loggedCount: 0, excelPath: AUDIT_EXCEL_PATH, csvPath: AUDIT_CSV_PATH };
  }

  ensureLogsDir();

  // 1. Append to CSV for atomic, crash-proof, non-locking real-time streaming
  try {
    const csvHeader =
      'Timestamp,Registration Number,Student Name,Phone,Class,Competition,School,Status,Provider,Student ID,Details\n';
    const csvExists = fs.existsSync(AUDIT_CSV_PATH);

    const csvRows = entries.map((e) => {
      const cleanDetails = (e.details || '').replace(/[\r\n,]/g, ' ');
      const cleanSchool = (e.schoolOrCollege || '').replace(/[\r\n,]/g, ' ');
      const cleanComp = (e.competitionName || '').replace(/[\r\n,]/g, ' ');
      const cleanName = (e.studentName || '').replace(/[\r\n,]/g, ' ');
      return `"${e.timestamp}","${e.registrationNumber}","${cleanName}","${e.phone}","${e.className}","${cleanComp}","${cleanSchool}","${e.status}","${e.provider}","${e.studentId}","${cleanDetails}"`;
    });

    const csvContent = (csvExists ? '' : csvHeader) + csvRows.join('\n') + '\n';
    fs.appendFileSync(AUDIT_CSV_PATH, csvContent, 'utf-8');
  } catch (err) {
    console.error('Failed to append to WhatsApp dispatch CSV log:', err);
  }

  // 2. Update dedicated Excel Audit Workbook
  try {
    let workbook: XLSX.WorkBook;
    let existingRows: any[] = [];

    if (fs.existsSync(AUDIT_EXCEL_PATH)) {
      try {
        const fileBuffer = fs.readFileSync(AUDIT_EXCEL_PATH);
        workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0] || 'Dispatch Log';
        const worksheet = workbook.Sheets[sheetName];
        if (worksheet) {
          existingRows = XLSX.utils.sheet_to_json(worksheet);
        }
      } catch {
        workbook = XLSX.utils.book_new();
      }
    } else {
      workbook = XLSX.utils.book_new();
    }

    const formattedNewRows = entries.map((e) => ({
      'Dispatch Time': e.timestamp,
      'Reg Number': e.registrationNumber,
      'Student Name': e.studentName,
      'Mobile Number': e.phone,
      'Class': e.className,
      'Competition / Event': e.competitionName,
      'School / College': e.schoolOrCollege,
      'Dispatch Status': e.status,
      'Gateway Provider': e.provider,
      'Database ID': e.studentId,
      'Remarks': e.details || 'Admit Card Release Notification',
    }));

    const combinedRows = [...existingRows, ...formattedNewRows];
    const newWs = XLSX.utils.json_to_sheet(combinedRows);

    // Set column widths
    newWs['!cols'] = [
      { wch: 22 }, // Dispatch Time
      { wch: 15 }, // Reg Number
      { wch: 26 }, // Student Name
      { wch: 14 }, // Mobile Number
      { wch: 14 }, // Class
      { wch: 32 }, // Competition
      { wch: 35 }, // School
      { wch: 14 }, // Status
      { wch: 18 }, // Provider
      { wch: 25 }, // Database ID
      { wch: 35 }, // Remarks
    ];

    const outWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(outWb, newWs, 'WhatsApp Dispatch Log');
    XLSX.writeFile(outWb, AUDIT_EXCEL_PATH);
  } catch (err) {
    console.error('Failed to update WhatsApp audit Excel log:', err);
  }

  // 3. Sync to Master_All_Students_Registry.xlsx (Sheet: Messaging Log and Master Students)
  try {
    if (fs.existsSync(MASTER_WORKBOOK_PATH)) {
      const masterBuf = fs.readFileSync(MASTER_WORKBOOK_PATH);
      const masterWb = XLSX.read(masterBuf, { type: 'buffer' });

      // Update Messaging Log sheet
      let msgLogRows: any[] = [];
      const msgLogSheetName = 'Messaging Log';
      if (masterWb.Sheets[msgLogSheetName]) {
        msgLogRows = XLSX.utils.sheet_to_json(masterWb.Sheets[msgLogSheetName]);
      }

      const masterLogEntries = entries.map((e) => ({
        'Timestamp': e.timestamp,
        'Registration Number': e.registrationNumber,
        'Name': e.studentName,
        'Phone': e.phone,
        'Competition': e.competitionName,
        'School': e.schoolOrCollege,
        'WhatsApp Status': e.status,
        'Provider': e.provider,
        'Details': e.details || 'Batch 100 ICPaaS Dispatch',
      }));

      const updatedMsgLog = [...msgLogRows, ...masterLogEntries];
      const newMsgWs = XLSX.utils.json_to_sheet(updatedMsgLog);
      masterWb.Sheets[msgLogSheetName] = newMsgWs;
      if (!masterWb.SheetNames.includes(msgLogSheetName)) {
        masterWb.SheetNames.push(msgLogSheetName);
      }

      // Update Master Students sheet status column for matched reg numbers
      if (masterWb.Sheets['Master Students']) {
        const studentMap = new Map<string, { status: WhatsAppStatus; time: string }>();
        entries.forEach((e) => {
          studentMap.set(e.registrationNumber.toUpperCase(), {
            status: e.status,
            time: e.timestamp,
          });
        });

        const masterStudents: any[] = XLSX.utils.sheet_to_json(masterWb.Sheets['Master Students']);
        let updatedCount = 0;
        masterStudents.forEach((row) => {
          const reg = String(row['Registration Number'] || row['registrationNumber'] || '').trim().toUpperCase();
          if (studentMap.has(reg)) {
            const updateInfo = studentMap.get(reg)!;
            row['WhatsApp Status'] = updateInfo.status;
            row['WhatsApp Sent At'] = updateInfo.time;
            updatedCount++;
          }
        });

        if (updatedCount > 0) {
          masterWb.Sheets['Master Students'] = XLSX.utils.json_to_sheet(masterStudents);
        }
      }

      XLSX.writeFile(masterWb, MASTER_WORKBOOK_PATH);
    }
  } catch (err) {
    console.error('Failed to sync status to Master_All_Students_Registry.xlsx:', err);
  }

  return {
    loggedCount: entries.length,
    excelPath: AUDIT_EXCEL_PATH,
    csvPath: AUDIT_CSV_PATH,
  };
}
