import fs from 'fs';
import path from 'path';

// Load .env.local
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

import { getDb } from '../src/lib/db';
import { generateAdmitCardPdf } from '../src/lib/pdf/template';
import { getStudentEventSchedule } from '../src/lib/pdf/event-schedule';

async function testGeneration() {
  console.log('=== TESTING ADMIT CARD GENERATION FOR RECONCILED CANDIDATES ===\n');
  const db = getDb();
  const settings = await db.getSettings();

  const testRegs = [
    'MS261103118', // Remapped Nursery student (ZOHAN)
    'MS261105024', // Remapped Nursery student (KIYAANSH AGARWAL)
    'MS261105137', // File 7 candidate (IRAM, Sir Syed Girls IC)
    'MS261105203', // File 7 candidate (JINAT, Sir Syed Montessori)
    'MS261105600', // File 8 candidate (VEDANSH NIGAM)
    'MS261106049', // File 8 candidate (End of range)
  ];

  for (const reg of testRegs) {
    const student = await db.getStudentByRegNo(reg);
    if (!student) {
      console.error(`❌ Student ${reg} NOT FOUND in DB!`);
      continue;
    }
    const sched = getStudentEventSchedule(student.competitionName, student.className, student.registrationNumber);
    console.log(`Student ${reg}: ${student.name} | Class: ${student.className} | Event: ${student.competitionName}`);
    console.log(`  Schedule -> Venue: ${sched.venueDetail} | Exam Time: ${sched.examTime} | Reporting: ${sched.reportingTime} | Shift: ${sched.batchInfo}`);

    const pdfBytes = await generateAdmitCardPdf(student, settings);
    console.log(`  PDF Generated: ${pdfBytes.length} bytes (Valid PDF header: ${Buffer.from(pdfBytes.slice(0, 4)).toString() === '%PDF' ? 'YES' : 'NO'})\n`);
  }

  // Test an ON HOLD student
  const holdStudent = await db.getStudentByRegNo('MS261100067'); // Junior Scientist or Graduation Quiz
  if (holdStudent) {
    const sched = getStudentEventSchedule(holdStudent.competitionName, holdStudent.className, holdStudent.registrationNumber);
    console.log(`Hold check: ${holdStudent.registrationNumber} (${holdStudent.competitionName}) -> isHold: ${sched.isHold} (Reason: ${sched.holdReason})`);
  }
}

testGeneration().catch(console.error);
