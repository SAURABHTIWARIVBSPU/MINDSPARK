/**
 * Production Admit Card Pre-Generation Script
 * 
 * Safely generates single-page vector PDFs for all active, scheduled students
 * and stores them in private storage with indexed metadata.
 * 
 * Strict Directives:
 * - Excludes test candidates (MS26TEST*)
 * - Excludes on-hold competitions (Junior Scientist, Graduation Quiz, Essay Writing)
 * - Skips already up-to-date admit cards with valid hashes
 * 
 * Usage:
 *   npx tsx scripts/pregenerate_admit_cards.ts --dry-run     (Simulated run for first 10 students)
 *   npx tsx scripts/pregenerate_admit_cards.ts --live        (Executes full batch generation)
 */

import fs from 'fs';
import path from 'path';

// Ensure .env.local is loaded in standalone script runner
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
import { generateAdmitCardPdf, computeStudentDataHash, ADMIT_CARD_TEMPLATE_VERSION } from '../src/lib/pdf/template';
import { getStudentEventSchedule } from '../src/lib/pdf/event-schedule';

async function main() {
  const isLive = process.argv.includes('--live');
  const isDryRun = !isLive || process.argv.includes('--dry-run');

  console.log(`=======================================================`);
  console.log(`  MIND-SPARK PRODUCTION ADMIT CARD GENERATION PIPELINE`);
  console.log(`  Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE EXECUTION'}`);
  console.log(`=======================================================\n`);

  const db = getDb();
  const storage = getStorageAdapter();
  const settings = await db.getSettings();

  console.log(`[1/5] Loaded System Settings:`);
  console.log(`      Venue: ${settings.venue}`);
  console.log(`      Exam Date: ${settings.examDate} | Reporting: ${settings.reportingTime}\n`);

  console.log(`[2/5] Fetching Registered Candidates from Database...`);
  const allStudents = [];
  let page = 1;
  const pageSize = 500;
  while (true) {
    const queryResult = await db.getStudents({ status: 'ACTIVE', page, pageSize });
    if (!queryResult.students.length) break;
    allStudents.push(...queryResult.students);
    if (queryResult.students.length < pageSize) break;
    page++;
  }
  console.log(`      Fetched ${allStudents.length} total active records from database.`);

  // 1. Filter out test candidates
  const realCandidates = allStudents.filter(
    (s) => s.registrationNumber.startsWith('MS2611') && s.status === 'ACTIVE'
  );
  const testCandidateCount = allStudents.length - realCandidates.length;

  // 2. Separate active scheduled vs on-hold
  const scheduledEligibleStudents: any[] = [];
  const onHoldStudents: any[] = [];

  realCandidates.forEach(student => {
    const sched = getStudentEventSchedule(student.competitionName, student.className, student.registrationNumber);
    if (sched.isHold) {
      onHoldStudents.push({ student, sched });
    } else {
      scheduledEligibleStudents.push(student);
    }
  });

  console.log(`      Audit Breakdown:`);
  console.log(`      - Test Records Excluded:          ${testCandidateCount}`);
  console.log(`      - On-Hold Candidates Excluded:    ${onHoldStudents.length} (Junior Scientist, Graduation Quiz, Essay Writing)`);
  console.log(`      - Official Eligible for Cards:    ${scheduledEligibleStudents.length}\n`);

  // 3. Fetch existing admit cards from database to enable incremental skipping
  console.log(`[3/5] Querying Existing Admit Cards in DB...`);
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const existingCardMap = new Map<string, any>();
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from('admit_cards')
      .select('registration_number, file_id, source_data_hash, status')
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    data.forEach((c: any) => existingCardMap.set(String(c.registration_number).trim(), c));
    from += 1000;
    if (data.length < 1000) break;
  }
  console.log(`      Found ${existingCardMap.size} existing admit cards registered in database.\n`);

  // Target candidates
  const targetStudents = isDryRun ? scheduledEligibleStudents.slice(0, 10) : scheduledEligibleStudents;
  console.log(`[4/5] Executing Generation for ${targetStudents.length} Eligible Candidates...`);

  const startTime = Date.now();
  let generatedCount = 0;
  let skippedUpToDateCount = 0;
  let failCount = 0;
  let totalBytes = 0;

  const batchSize = 20;
  for (let i = 0; i < targetStudents.length; i += batchSize) {
    const batch = targetStudents.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (student) => {
        try {
          const expectedHash = computeStudentDataHash(student, ADMIT_CARD_TEMPLATE_VERSION);
          const existing = existingCardMap.get(student.registrationNumber);

          // If already generated with matching hash and READY status, skip regeneration
          if (existing && existing.source_data_hash === expectedHash && existing.status === 'READY') {
            skippedUpToDateCount++;
            return;
          }

          // Generate vector PDF in memory (~16ms)
          const pdfBytes = await generateAdmitCardPdf(student, settings);
          totalBytes += pdfBytes.length;

          if (!isDryRun) {
            const fileName = `AdmitCard_${student.registrationNumber}_${student.name.replace(/\s+/g, '_')}.pdf`;
            const { fileId, storageType } = await storage.saveFile(fileName, pdfBytes, 'application/pdf');

            const now = new Date().toISOString();
            await db.saveAdmitCard({
              studentId: student.studentId,
              registrationNumber: student.registrationNumber,
              fileId,
              storageType,
              templateVersion: ADMIT_CARD_TEMPLATE_VERSION,
              sourceDataHash: expectedHash,
              status: 'READY',
              generatedAt: now,
              updatedAt: now,
            });
          }
          generatedCount++;
        } catch (err: any) {
          failCount++;
          console.error(`\n      [FAIL] ${student.registrationNumber} (${student.name}):`, err.message);
        }
      })
    );

    const processed = i + batch.length;
    const progressPct = ((processed / targetStudents.length) * 100).toFixed(1);
    process.stdout.write(`\r      Progress: ${processed}/${targetStudents.length} (${progressPct}%) [New: ${generatedCount}, Cached: ${skippedUpToDateCount}, Failed: ${failCount}]`);
  }

  const durationMs = Date.now() - startTime;
  console.log(`\n\n[5/5] Generation Pipeline Complete!`);
  console.log(`      Eligible Active Candidates:    ${scheduledEligibleStudents.length}`);
  console.log(`      Newly Generated & Saved:      ${generatedCount}`);
  console.log(`      Already Up-to-Date (Skipped):  ${skippedUpToDateCount}`);
  console.log(`      Failures:                      ${failCount}`);
  console.log(`      Total Generated Bytes:         ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`      Total Elapsed Time:            ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`      Throughput:                    ${((generatedCount + skippedUpToDateCount) / (durationMs / 1000 || 1)).toFixed(1)} cards/sec\n`);

  if (isDryRun) {
    console.log(`[NOTE] This was a DRY-RUN. Run with --live to generate and upload live documents.`);
  }
}

main().catch((err) => {
  console.error('\nFatal error during pre-generation:', err);
  process.exit(1);
});
