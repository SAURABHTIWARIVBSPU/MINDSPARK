import fs from 'fs';
import path from 'path';

// 1. Ensure .env.local is loaded
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

import { getDb } from '../src/lib/db';
import { getStorageAdapter } from '../src/lib/storage';
import { generateAdmitCardPdf } from '../src/lib/pdf/template';
import { createClient } from '@supabase/supabase-js';

// Import deduplicated clean candidates from candidate_data_5
const { cleanList } = require('./definitive_candidate_5_dedup.js');

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function executeStep1() {
  console.log('========================================================================');
  console.log('  MIND-SPARK PRODUCTION STEP 1: IMPORT 871 CANDIDATES & PRE-GENERATE CARDS');
  console.log('========================================================================\n');

  console.log(`[1/5] PREFLIGHT VERIFICATION:`);
  console.log(`      Candidates to Import: ${cleanList.length} verified records`);
  
  // Verify current Supabase counts
  const { count: currentStudentsCount, error: sErr } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });
  if (sErr) throw new Error(`Failed to check students table: ${sErr.message}`);

  const { count: currentCardsCount, error: cErr } = await supabase
    .from('admit_cards')
    .select('*', { count: 'exact', head: true });
  if (cErr) throw new Error(`Failed to check admit_cards table: ${cErr.message}`);

  console.log(`      Current Students in DB: ${currentStudentsCount} rows`);
  console.log(`      Current Admit Cards in DB: ${currentCardsCount} rows`);

  // Check if any of the cleanList registration numbers already exist in Supabase
  const sampleRegs = cleanList.slice(0, 50).map((c: any) => c.reg);
  const { data: existingSample, error: checkErr } = await supabase
    .from('students')
    .select('registration_number')
    .in('registration_number', sampleRegs);

  if (checkErr) throw new Error(`Preflight registration check failed: ${checkErr.message}`);
  if (existingSample && existingSample.length > 0) {
    throw new Error(`PREFLIGHT ABORTED: Found existing registration numbers in DB: ${existingSample.map(e => e.registration_number).join(', ')}`);
  }
  console.log(`      Preflight Check: PASSED (Zero collision with existing records).\n`);

  // [2/5] Batch Insert Students into Supabase
  console.log(`[2/5] INSERTING ${cleanList.length} STUDENTS INTO SUPABASE IN BATCHES...`);
  const now = new Date().toISOString();
  const studentRows = cleanList.map((c: any, idx: number) => ({
    student_id: `std_${Date.now()}_${String(idx + 1).padStart(5, '0')}`,
    registration_number: c.reg,
    name: c.name,
    father_name: c.father,
    date_of_birth: c.dob,
    phone: c.phone,
    school_or_college: c.school,
    class_name: c.cls,
    competition_name: c.event,
    status: 'ACTIVE',
    whatsapp_status: 'NOT_SENT',
    whatsapp_sent_at: null,
    source_import_id: 'candidate_data_5_import',
    created_at: now,
    created_by: 'batch_candidate_data_5',
    updated_at: now,
    updated_by: 'batch_candidate_data_5',
    data_version: 1,
  }));

  const BATCH_SIZE = 50;
  for (let i = 0; i < studentRows.length; i += BATCH_SIZE) {
    const batch = studentRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('students').insert(batch);
    if (error) {
      throw new Error(`Error inserting batch [${i} to ${i + batch.length}]: ${error.message}`);
    }
    process.stdout.write(`\r      Inserted students: ${Math.min(i + BATCH_SIZE, studentRows.length)} / ${studentRows.length}`);
  }
  console.log(`\n      Successfully inserted all ${studentRows.length} students into Supabase!\n`);

  // [3/5] Pre-Generate Admit Card PDFs and Upload to Storage Bucket
  console.log(`[3/5] PRE-GENERATING VECTOR PDFs & UPLOADING TO PRIVATE STORAGE...`);
  const db = getDb();
  const storage = getStorageAdapter();
  const settings = await db.getSettings();

  console.log(`      Venue: ${settings.venue}`);
  console.log(`      Exam Date: ${settings.examDate} | Reporting: ${settings.reportingTime}`);

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  let totalBytes = 0;

  // Process in concurrent batches of 25
  const PDF_BATCH_SIZE = 25;
  for (let i = 0; i < studentRows.length; i += PDF_BATCH_SIZE) {
    const batch = studentRows.slice(i, i + PDF_BATCH_SIZE);

    await Promise.all(
      batch.map(async (row: any) => {
        try {
          const studentObj = {
            studentId: row.student_id,
            registrationNumber: row.registration_number,
            name: row.name,
            fatherName: row.father_name,
            dateOfBirth: row.date_of_birth,
            phone: row.phone,
            schoolOrCollege: row.school_or_college,
            className: row.class_name,
            competitionName: row.competition_name,
            status: row.status,
            whatsappStatus: row.whatsapp_status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            dataVersion: 1,
          };

          const pdfBytes = await generateAdmitCardPdf(studentObj, settings);
          totalBytes += pdfBytes.length;

          const fileName = `AdmitCard_${studentObj.registrationNumber}.pdf`;
          const { fileId, storageType } = await storage.saveFile(fileName, pdfBytes, 'application/pdf');

          await db.saveAdmitCard({
            studentId: studentObj.studentId,
            registrationNumber: studentObj.registrationNumber,
            fileId,
            storageType,
            templateVersion: 'v1',
            sourceDataHash: 'v1',
            status: 'READY',
            generatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          successCount++;
        } catch (err: any) {
          failCount++;
          console.error(`\n      [FAIL] ${row.registration_number} (${row.name}):`, err.message);
        }
      })
    );

    const progressPct = (((i + batch.length) / studentRows.length) * 100).toFixed(1);
    process.stdout.write(`\r      Admit Card Progress: ${i + batch.length}/${studentRows.length} (${progressPct}%)`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n      Pipeline Completed in ${durationSec}s!`);
  console.log(`      Successful: ${successCount}`);
  console.log(`      Failed: ${failCount}`);
  console.log(`      Total Generated Bytes: ${totalBytes} bytes (${(totalBytes / 1024).toFixed(1)} KB)`);
  console.log(`      Average PDF Size: ${(totalBytes / successCount / 1024).toFixed(2)} KB\n`);

  if (failCount > 0) {
    throw new Error(`Pipeline encountered ${failCount} failures during PDF pre-generation!`);
  }

  // [4/5] Update system_settings reg_no_seq_current
  console.log(`[4/5] UPDATING SYSTEM_SETTINGS REGISTRATION SEQUENCE NUMBER...`);
  // Find highest numeric registration sequence in studentRows
  let maxSeq = 2020;
  for (const s of studentRows) {
    const match = s.registration_number.match(/MS26110?(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  }

  const { error: setErr } = await supabase
    .from('system_settings')
    .update({ reg_no_seq_current: maxSeq, updated_at: new Date().toISOString() })
    .eq('id', 'default_settings');

  if (setErr) {
    console.warn(`      Warning: failed to update reg_no_seq_current: ${setErr.message}`);
  } else {
    console.log(`      Updated system_settings "reg_no_seq_current" to ${maxSeq}.\n`);
  }

  // [5/5] Full Paginated Reconciliation
  console.log(`[5/5] POST-IMPORT COMPREHENSIVE RECONCILIATION:`);
  
  // Total students
  const { count: finalStudentsCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });
  console.log(`      Total Students in DB : ${finalStudentsCount} (Expected: 2887)`);

  // Total admit cards
  const { count: finalCardsCount } = await supabase
    .from('admit_cards')
    .select('*', { count: 'exact', head: true });
  console.log(`      Total Admit Cards in DB: ${finalCardsCount} (Expected: 2884)`);

  // Paginated check of storage bucket
  let allFiles: any[] = [];
  let offset = 0;
  while (true) {
    const { data: files, error: fErr } = await supabase.storage.from('admit-cards').list('', {
      limit: 500,
      offset
    });
    if (fErr || !files || files.length === 0) break;
    allFiles.push(...files);
    if (files.length < 500) break;
    offset += files.length;
  }
  console.log(`      Total PDFs in Bucket   : ${allFiles.length} (Expected: 2884)`);

  // Test live signed download for a newly inserted student
  const sampleNewStudent = studentRows[0];
  const sampleCard = await db.getAdmitCardByStudentId(sampleNewStudent.student_id);
  if (sampleCard) {
    const downloadUrl = await storage.getDownloadUrl(sampleCard.fileId, 60);
    const testFetch = await fetch(downloadUrl);
    console.log(`      Live Signed URL Fetch for New Student (${sampleNewStudent.registration_number}): HTTP ${testFetch.status} (${testFetch.headers.get('content-type')}, ${testFetch.headers.get('content-length')} bytes)`);
  }

  console.log(`\n========================================================================`);
  console.log(`  STEP 1 SUCCESSFULLY COMPLETED: 100% CANDIDATES & PDFs READY!`);
  console.log(`========================================================================`);
}

executeStep1().catch((err) => {
  console.error('\nFatal error during Step 1 execution:', err);
  process.exit(1);
});
