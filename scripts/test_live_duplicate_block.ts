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
  console.log('=== TESTING STRICT DUPLICATE REGISTRATION PREVENTION (SUPABASE/PRODUCTION) ===\n');
  const db = getDb();

  // Attempt to register a duplicate of an existing student (REHAN ALI) - Test Case 1: Standard
  try {
    await db.createStudent({
      registrationNumber: '', // auto-assign
      name: 'REHAN ALI',
      fatherName: 'IMAM ALI',
      dateOfBirth: '2015-01-01',
      phone: '9792766694',
      schoolOrCollege: 'JAMIA AMIRUL ULOOM MINAIYA',
      className: '3',
      competitionName: 'PAINT YOUR IMAGINATION',
      status: 'ACTIVE',
      createdBy: 'test_audit'
    });
    console.error('❌ FAILED Case 1: Duplicate registration was NOT blocked!');
  } catch (err: any) {
    console.log('✅ PASSED Case 1: Duplicate registration was STRICTLY BLOCKED!');
    console.log('   Error Message:', err.message);
  }

  // Test Case 2: Lowercase + DD-MM-YYYY formatted date
  try {
    await db.createStudent({
      registrationNumber: '',
      name: 'rehan ali',
      fatherName: 'imam ali',
      dateOfBirth: '01-01-2015',
      phone: '+91 9792766694',
      schoolOrCollege: 'Jamia Amirul Uloom Minaiya',
      className: '3',
      competitionName: 'DIFFERENT COMPETITION',
      status: 'ACTIVE',
      createdBy: 'test_audit'
    });
    console.error('❌ FAILED Case 2: Duplicate with case/format variations was NOT blocked!');
  } catch (err: any) {
    console.log('✅ PASSED Case 2: Duplicate with case/format variations was STRICTLY BLOCKED!');
    console.log('   Error Message:', err.message);
  }
}

main().catch(console.error);
