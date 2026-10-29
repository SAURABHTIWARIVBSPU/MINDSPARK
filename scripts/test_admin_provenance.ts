const fs = require('fs');
if (fs.existsSync('.env.local')) {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach((line) => {
    const [k, ...v] = line.split('=');
    if (k && v.length) {
      process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}
const { getDb } = require('../src/lib/db');

async function main() {
  console.log('=== VERIFYING ADMIN PANEL PROVENANCE & DATABASE TRACEABILITY ===\n');
  const db = getDb();

  // 1. Create a student with ADMIN_PANEL provenance
  const testStudent = {
    registrationNumber: '', // auto-assign
    name: `AUDIT PROVENANCE CANDIDATE ${Date.now()}`,
    fatherName: 'AUDIT FATHER',
    dateOfBirth: '2012-05-15',
    phone: '9876549999',
    schoolOrCollege: 'AUDIT TEST SCHOOL',
    className: '5',
    competitionName: 'PAINT YOUR IMAGINATION',
    status: 'ACTIVE',
    sourceImportId: 'ADMIN_PANEL',
    registrationSource: 'ADMIN_PANEL',
    createdBy: 'ADMIN_PANEL:superadmin@mindspark.edu.in',
    updatedBy: 'ADMIN_PANEL:superadmin@mindspark.edu.in'
  };

  const created = await db.createStudent(testStudent);
  console.log('Created Student Record:');
  console.log('  Student ID:          ', created.studentId);
  console.log('  Registration Number: ', created.registrationNumber);
  console.log('  Source Import ID:    ', created.sourceImportId);
  console.log('  Registration Source: ', created.registrationSource);
  console.log('  Created By:          ', created.createdBy);

  // 2. Fetch back from DB to verify persistence
  const fetched = await db.getStudentById(created.studentId);
  console.log('\nFetched Student Record from Database:');
  console.log('  Fetched Source Import ID:    ', fetched.sourceImportId);
  console.log('  Fetched Registration Source: ', fetched.registrationSource);
  console.log('  Fetched Created By:          ', fetched.createdBy);

  const isProvValid = (fetched.sourceImportId === 'ADMIN_PANEL') && 
                      (fetched.registrationSource === 'ADMIN_PANEL') && 
                      (fetched.createdBy.startsWith('ADMIN_PANEL:'));

  if (isProvValid) {
    console.log('\n✅ PASSED: Database unequivocally records ADMIN_PANEL origin!');
  } else {
    console.error('\n❌ FAILED: Provenance was not properly persisted in database!');
    process.exit(1);
  }

  // 3. Clean up test student so database stays clean
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    await c.from('students').delete().eq('student_id', created.studentId);
    console.log('Cleaned up test record from database.');
  }
}

main().catch(console.error);
