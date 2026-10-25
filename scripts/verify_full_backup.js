const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const backupPath = path.join(process.cwd(), 'backups', 'supabase_cloud_backup_full_2026-10-24T18-39-49-606Z.json');

console.log('=== VERIFYING FULL BACKUP FILE EXISTENCE & CHECKSUM ===');
if (!fs.existsSync(backupPath)) {
  console.error('FAILED: Backup file does not exist at', backupPath);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(backupPath);
const stats = fs.statSync(backupPath);
console.log(`File exists: ${backupPath}`);
console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);

const computedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
console.log(`Computed SHA-256: ${computedHash}`);

console.log('\n=== PARSING AND VALIDATING FULL BACKUP CONTENT ===');
let backupJson;
try {
  backupJson = JSON.parse(fileBuffer.toString('utf8'));
  console.log('JSON Parse: SUCCESS');
} catch (e) {
  console.error('JSON Parse: FAILED - corrupted JSON', e);
  process.exit(1);
}

console.log('Backup Timestamp:', backupJson.timestamp);
console.log('Supabase URL:', backupJson.supabaseUrl);
console.log('Tables Included:', Object.keys(backupJson.tables || {}));
console.log('Record Counts by Table:');
for (const [table, rows] of Object.entries(backupJson.tables || {})) {
  console.log(`  - ${table}: ${rows.length} rows (reported count: ${backupJson.counts?.[table]})`);
}

// Deep inspect students table
const students = backupJson.tables?.students || [];
const active = students.filter(s => s.status === 'ACTIVE');
const pending = students.filter(s => s.status === 'PENDING_REVIEW');
const testStudents = students.filter(s => s.registration_number && s.registration_number.includes('TEST'));
const officialActive = students.filter(s => s.registration_number && s.registration_number.startsWith('MS2611') && s.status === 'ACTIVE');

console.log('\n=== STUDENT DATA RECONCILIATION IN FULL BACKUP ===');
console.log(`Total students in backup: ${students.length}`);
console.log(`Total ACTIVE students: ${active.length}`);
console.log(`Total PENDING_REVIEW students: ${pending.length}`);
console.log(`Total TEST students: ${testStudents.length}`);
console.log(`Official Active Candidates (MS2611% & ACTIVE): ${officialActive.length}`);
console.log(`Users in backup: ${(backupJson.tables?.users || []).length}`);
console.log(`Settings in backup: ${(backupJson.tables?.system_settings || []).length}`);
