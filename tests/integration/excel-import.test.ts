import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { ExcelImporter } from '@/lib/excel/importer';
import { getDb } from '@/lib/db';

describe('Excel Import End-to-End on datagenrate.xlsx', () => {
  const sampleFilePath = path.join(process.cwd(), 'datagenrate.xlsx');

  beforeAll(async () => {
    // Reset test database records to ensure clean import state
    const dbPath = path.join(process.cwd(), '.data', 'mind_spark_db.json');
    if (fs.existsSync(dbPath)) {
      try {
        const content = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        content.students = [];
        content.imports = [];
        fs.writeFileSync(dbPath, JSON.stringify(content, null, 2), 'utf-8');
      } catch (e) {}
    }
  });

  it('verifies datagenrate.xlsx exists and has data', () => {
    expect(fs.existsSync(sampleFilePath)).toBe(true);
  });

  it('parses datagenrate.xlsx, normalizes serial dates, and identifies 18 students', async () => {
    const fileBuffer = fs.readFileSync(sampleFilePath);
    const preview = await ExcelImporter.preview(
      new Uint8Array(fileBuffer),
      'datagenrate.xlsx',
      'test_operator'
    );

    expect(preview.totalRows).toBe(18);
    expect(preview.validRows).toBe(18);
    expect(preview.rejectedRows).toBe(0);

    // Verify first row: MEENAKSHI GUPTA, Reg No MS211001, DOB 2008-05-31 (from 39599)
    const firstRow = preview.evaluatedRows[0];
    expect(firstRow.canonicalData.registrationNumber).toBe('MS211001');
    expect(firstRow.canonicalData.name).toBe('MEENAKSHI GUPTA');
    expect(firstRow.canonicalData.fatherName).toBe('RAKESH KUMAR GUPTA');
    expect(firstRow.canonicalData.dateOfBirth).toBe('2008-05-31');
    expect(firstRow.canonicalData.phone).toBe('7007440076');
    expect(firstRow.canonicalData.competitionName).toBe('ONLINE QUIZ');

    // Verify commit
    const commitResult = await ExcelImporter.commit(
      preview.importId,
      preview.evaluatedRows,
      'test_operator'
    );

    expect(commitResult.committedCount).toBe(18);

    // Verify DB contains records
    const db = getDb();
    const student = await db.getStudentByRegNo('MS211001');
    expect(student).not.toBeNull();
    expect(student?.name).toBe('MEENAKSHI GUPTA');
    expect(student?.phone).toBe('7007440076');
  });
});
