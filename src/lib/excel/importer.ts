import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { ImportJob, Student } from '@/types';
import { mapHeaders } from './column-mapper';
import { normalizeDate, normalizePhone, normalizeText } from './normalizer';
import { DuplicateDetector } from './duplicate-detector';

export interface RowEvaluation {
  rowNumber: number;
  status: 'VALID' | 'WARNING' | 'REJECTED';
  reasons: string[];
  canonicalData: {
    registrationNumber?: string;
    name: string;
    fatherName: string;
    dateOfBirth: string;
    phone: string;
    schoolOrCollege: string;
    className: string;
    competitionName: string;
  };
  rawData: Record<string, any>;
}

export interface ImportPreviewResult {
  importId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  rejectedRows: number;
  detectedMappings: Record<string, string>;
  missingRequired: string[];
  evaluatedRows: RowEvaluation[];
  canCommit: boolean;
}

export class ExcelImporter {
  static async preview(
    buffer: Uint8Array,
    fileName: string,
    uploadedBy: string
  ): Promise<ImportPreviewResult> {
    const db = getDb();

    // 1. Calculate file fingerprint
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Read workbook
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel workbook contains no sheets');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: '',
      raw: true,
    });

    if (rawData.length === 0) {
      throw new Error('Excel worksheet contains no data rows');
    }

    // 3. Extract headers from first row
    const rawHeaders = Object.keys(rawData[0]);
    const { detectedMappings, missingRequired } = mapHeaders(rawHeaders);

    // 4. Fetch existing students for duplicate candidate evaluation
    const existingStudents = await db.getAllActiveStudents();
    const duplicateDetector = new DuplicateDetector(existingStudents);

    const evaluatedRows: RowEvaluation[] = [];
    let validCount = 0;
    let warningCount = 0;
    let rejectedCount = 0;

    // 5. Evaluate each row
    for (let i = 0; i < rawData.length; i++) {
      const rowNumber = i + 2; // Excel 1-indexed, header is row 1
      const row = rawData[i];

      const rawRegNo = detectedMappings.registrationNumber ? row[detectedMappings.registrationNumber] : '';
      const rawName = detectedMappings.name ? row[detectedMappings.name] : '';
      const rawFather = detectedMappings.fatherName ? row[detectedMappings.fatherName] : '';
      const rawDob = detectedMappings.dateOfBirth ? row[detectedMappings.dateOfBirth] : '';
      const rawPhone = detectedMappings.phone ? row[detectedMappings.phone] : '';
      const rawSchool = detectedMappings.schoolOrCollege ? row[detectedMappings.schoolOrCollege] : '';
      const rawClass = detectedMappings.className ? row[detectedMappings.className] : '';
      const rawComp = detectedMappings.competitionName ? row[detectedMappings.competitionName] : '';

      const normalizedRegNo = normalizeText(rawRegNo).toUpperCase();
      const normalizedName = normalizeText(rawName).toUpperCase();
      const normalizedFather = normalizeText(rawFather).toUpperCase();
      const normalizedDob = normalizeDate(rawDob);
      const normalizedPhone = normalizePhone(rawPhone);
      const normalizedSchool = normalizeText(rawSchool).toUpperCase();
      const normalizedClass = normalizeText(rawClass).toUpperCase();
      const normalizedComp = normalizeText(rawComp).toUpperCase() || 'GENERAL COMPETITION';

      const canonicalData = {
        registrationNumber: normalizedRegNo || undefined,
        name: normalizedName,
        fatherName: normalizedFather,
        dateOfBirth: normalizedDob,
        phone: normalizedPhone,
        schoolOrCollege: normalizedSchool,
        className: normalizedClass,
        competitionName: normalizedComp,
      };

      const reasons: string[] = [];
      let status: 'VALID' | 'WARNING' | 'REJECTED' = 'VALID';

      // Check required fields
      if (!normalizedName) {
        reasons.push('Student Name is required');
        status = 'REJECTED';
      }
      if (!normalizedFather) {
        reasons.push("Father's Name is required");
        status = 'REJECTED';
      }
      if (!normalizedDob) {
        reasons.push('Valid Date of Birth is required');
        status = 'REJECTED';
      }
      if (!normalizedPhone || normalizedPhone.length !== 10) {
        reasons.push(`Invalid contact phone (must be 10 digits, got '${rawPhone}')`);
        status = 'REJECTED';
      }
      if (!normalizedSchool) {
        reasons.push('School/College Name is required');
        status = 'REJECTED';
      }

      // Check duplicates if not already rejected
      if (status !== 'REJECTED') {
        const dupCheck = duplicateDetector.evaluate({
          rowNumber,
          registrationNumber: normalizedRegNo,
          name: normalizedName,
          fatherName: normalizedFather,
          phone: normalizedPhone,
        });

        if (dupCheck.hasConflict) {
          if (dupCheck.conflictType === 'EXACT_REG_NO' || dupCheck.conflictType === 'INTRA_FILE_DUPLICATE') {
            status = 'REJECTED';
            reasons.push(dupCheck.reason || 'Duplicate registration number conflict');
          } else {
            status = 'WARNING';
            reasons.push(dupCheck.reason || 'Duplicate candidate flagged for review');
          }
        }
      }

      if (status === 'VALID') validCount++;
      else if (status === 'WARNING') warningCount++;
      else rejectedCount++;

      evaluatedRows.push({
        rowNumber,
        status,
        reasons,
        canonicalData,
        rawData: row,
      });
    }

    const importId = `imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const importJob: ImportJob = {
      importId,
      fileName,
      fileFingerprint: hash,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      status: 'PREVIEWED',
      totalRows: evaluatedRows.length,
      validRows: validCount,
      warningRows: warningCount,
      rejectedRows: rejectedCount,
      processedRows: 0,
      mappingVersion: '1.0',
      errorReport: evaluatedRows
        .filter((r) => r.status === 'REJECTED')
        .map((r) => ({
          rowNumber: r.rowNumber,
          reason: r.reasons.join('; '),
          rawData: r.rawData,
        })),
    };

    await db.createImportJob(importJob);

    return {
      importId,
      fileName,
      totalRows: evaluatedRows.length,
      validRows: validCount,
      warningRows: warningCount,
      rejectedRows: rejectedCount,
      detectedMappings,
      missingRequired,
      evaluatedRows,
      canCommit: validCount + warningCount > 0,
    };
  }

  static async commit(
    importId: string,
    evaluatedRows: RowEvaluation[],
    actorUid: string,
    options: { includeWarnings?: boolean } = { includeWarnings: true }
  ): Promise<{ committedCount: number; studentIds: string[] }> {
    const db = getDb();
    const job = await db.getImportJobById(importId);
    if (!job) {
      throw new Error(`Import job '${importId}' not found`);
    }

    const eligibleRows = evaluatedRows.filter((r) => {
      if (r.status === 'VALID') return true;
      if (r.status === 'WARNING' && options.includeWarnings) return true;
      return false;
    });

    if (eligibleRows.length === 0) {
      throw new Error('No valid rows available to commit');
    }

    const studentsToCreate = eligibleRows.map((r) => ({
      registrationNumber: r.canonicalData.registrationNumber || '',
      name: r.canonicalData.name,
      fatherName: r.canonicalData.fatherName,
      dateOfBirth: r.canonicalData.dateOfBirth,
      phone: r.canonicalData.phone,
      schoolOrCollege: r.canonicalData.schoolOrCollege,
      className: r.canonicalData.className,
      competitionName: r.canonicalData.competitionName,
      status: 'ACTIVE' as const,
      sourceImportId: importId,
      createdBy: actorUid,
      updatedBy: actorUid,
    }));

    const result = await db.batchCreateStudents(studentsToCreate);

    await db.updateImportJob(importId, {
      status: 'COMMITTED',
      processedRows: result.createdCount,
    });

    await db.addAuditLog({
      actorUid,
      actorEmail: actorUid,
      action: 'EXCEL_IMPORT_COMMITTED',
      targetType: 'IMPORT',
      targetId: importId,
      details: {
        committedCount: result.createdCount,
        fileName: job.fileName,
      },
    });

    return {
      committedCount: result.createdCount,
      studentIds: result.studentIds,
    };
  }
}
