import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { ExcelImporter } from '@/lib/excel/importer';
import { getDb } from '@/lib/db';

describe('Excel Import Pipeline End-to-End', () => {
  function createTestWorkbookBuffer(suffix: string): { buffer: Uint8Array; reg1: string; reg2: string } {
    const reg1 = `T${suffix}1`;
    const reg2 = `T${suffix}2`;
    const phone1 = `91${suffix.padEnd(8, '7')}`;
    const phone2 = `92${suffix.padEnd(8, '8')}`;
    const data = [
      ['Registration No', 'Student Name', "Father's Name", 'DOB', 'Contact No.', 'School Name', 'Class ', 'Competition'],
      [reg1, `CANDIDATE ${suffix} A`, `FATHER ${suffix} A`, 41640, phone1, 'TEST PUBLIC SCHOOL', '10', 'ONLINE QUIZ'],
      [reg2, `CANDIDATE ${suffix} B`, `FATHER ${suffix} B`, '15/08/2010', phone2, 'TEST ACADEMY', '8', 'JUNIOR SCIENTIST'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TestSheet');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return { buffer: new Uint8Array(buf), reg1, reg2 };
  }

  it('parses Excel workbook, normalizes dates, and validates candidate rows', async () => {
    const testSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const { buffer } = createTestWorkbookBuffer(testSuffix);
    const preview = await ExcelImporter.preview(
      buffer,
      'test_upload.xlsx',
      'test_operator'
    );

    expect(preview.totalRows).toBe(2);
    expect(preview.validRows).toBe(2);
    expect(preview.rejectedRows).toBe(0);

    const first = preview.evaluatedRows[0];
    expect(first.canonicalData.name).toContain('CANDIDATE');
    expect(first.canonicalData.fatherName).toContain('FATHER');
    expect(first.canonicalData.dateOfBirth).toBe('2014-01-01'); // normalized from 41640
    expect(first.canonicalData.competitionName).toBe('ONLINE QUIZ');

    const second = preview.evaluatedRows[1];
    expect(second.canonicalData.name).toContain('CANDIDATE');
    expect(second.canonicalData.dateOfBirth).toBe('2010-08-15'); // normalized from 15/08/2010
  });

  it('commits verified records to database successfully', async () => {
    const testSuffix2 = Math.floor(1000 + Math.random() * 9000).toString();
    const { buffer, reg1 } = createTestWorkbookBuffer(testSuffix2);
    const preview = await ExcelImporter.preview(
      buffer,
      'test_upload.xlsx',
      'test_operator'
    );

    const commitResult = await ExcelImporter.commit(
      preview.importId,
      preview.evaluatedRows,
      'test_operator'
    );

    expect(commitResult.committedCount).toBe(2);

    const db = getDb();
    const s1 = await db.getStudentByRegNo(reg1);
    expect(s1).not.toBeNull();
  });
});
