import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { logWhatsAppDispatchRealTime, DispatchLogEntry } from '@/lib/whatsapp/excel-logger';

describe('Real-Time WhatsApp Dispatch Excel & CSV Logger', () => {
  it('successfully appends dispatch records to audit Excel and CSV logs', async () => {
    const testEntries: DispatchLogEntry[] = [
      {
        timestamp: new Date().toISOString(),
        studentId: 'test_std_001',
        registrationNumber: 'MS261100037',
        studentName: 'SYEDA ZEENISH',
        phone: '9876543210',
        className: 'PLAY GROUP',
        competitionName: 'UNIQUE AND CREATIVE HANDMADE FANCY DRESS',
        schoolOrCollege: 'BACHPAN PLAY SCHOOL',
        status: 'SENT',
        provider: 'ICPaaS Gateway (100 Bulk)',
        details: 'Delivered via ICPaaS',
      },
      {
        timestamp: new Date().toISOString(),
        studentId: 'test_std_002',
        registrationNumber: 'MS261100038',
        studentName: 'MOHD HAMZA',
        phone: '9876543211',
        className: 'CLASS 1',
        competitionName: 'DRAWING',
        schoolOrCollege: 'ST XAVIERS SCHOOL',
        status: 'FAILED',
        provider: 'ICPaaS Gateway (100 Bulk)',
        details: 'Network timeout',
      },
    ];

    const result = await logWhatsAppDispatchRealTime(testEntries);
    expect(result.loggedCount).toBe(2);
    expect(fs.existsSync(result.excelPath)).toBe(true);
    expect(fs.existsSync(result.csvPath)).toBe(true);

    // Verify Excel contains the written rows
    const fileBuf = fs.readFileSync(result.excelPath);
    const wb = XLSX.read(fileBuf, { type: 'buffer' });
    expect(wb.SheetNames.length).toBeGreaterThan(0);

    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    expect(rows.length).toBeGreaterThanOrEqual(2);

    const match = rows.find((r) => r['Reg Number'] === 'MS261100037');
    expect(match).toBeDefined();
    expect(match['Dispatch Status']).toBe('SENT');
  }, 15000);
});
