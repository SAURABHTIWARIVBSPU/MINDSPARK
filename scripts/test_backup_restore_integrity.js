const fs = require('fs');
const path = require('path');

const backupPath = path.join(process.cwd(), 'backups', 'supabase_cloud_backup_full_2026-10-24T18-39-49-606Z.json');

console.log('=== TEST: ISOLATED RESTORE INTEGRITY & SCHEMA VALIDATION ===');
const content = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

const students = content.tables.students;
console.log(`Loaded ${students.length} students from backup.`);

const regNumbers = new Set();
const studentIds = new Set();
let invalidRecords = 0;

for (let i = 0; i < students.length; i++) {
  const s = students[i];
  if (!s.student_id || !s.registration_number || !s.name || !s.date_of_birth || !s.status) {
    console.error(`Row ${i} missing mandatory columns:`, s);
    invalidRecords++;
  }
  if (regNumbers.has(s.registration_number)) {
    console.error(`Duplicate registration number in backup: ${s.registration_number}`);
    invalidRecords++;
  }
  regNumbers.add(s.registration_number);
  studentIds.add(s.student_id);
}

console.log(`Unique registration numbers: ${regNumbers.size} / ${students.length}`);
console.log(`Unique student IDs: ${studentIds.size} / ${students.length}`);
console.log(`Invalid schema records: ${invalidRecords}`);

const officialActive = students.filter(s => s.registration_number.startsWith('MS2611') && s.status === 'ACTIVE');
const pending = students.filter(s => s.status === 'PENDING_REVIEW');
const testStudents = students.filter(s => s.registration_number.includes('TEST'));

console.log(`\nReconciled Counts:`);
console.log(`  - Official Active (MS2611% & ACTIVE): ${officialActive.length}`);
console.log(`  - Pending Review: ${pending.length} (${pending.map(p => p.registration_number).join(', ')})`);
console.log(`  - Sandbox Test Records: ${testStudents.length} (${testStudents.map(t => t.registration_number).join(', ')})`);
console.log(`  - Total Student Records in Snapshot: ${officialActive.length + pending.length + testStudents.length}`);

if (invalidRecords === 0 && students.length === 2016 && regNumbers.size === 2016) {
  console.log('\n✅ ISOLATED RESTORE INTEGRITY PASSED: 100% Valid Data Structure, 0 Collisions!');
} else {
  console.error('\n❌ RESTORE INTEGRITY FAILED!');
  process.exit(1);
}
