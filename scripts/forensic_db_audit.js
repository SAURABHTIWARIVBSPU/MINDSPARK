const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')];
    })
);

const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('====================================================');
  console.log('FORENSIC AUDIT LAYER 1: SUPABASE POSTGRES CONSTRAINTS');
  console.log('====================================================\n');

  // 1. Direct RPC or Table inspection
  // Test Unique Constraint on registration_number directly
  console.log('--- 1. Testing Database Unique Constraint on registration_number ---');
  const dummyReg = 'MS261100001'; // Known existing student NOOR FATIMA or similar
  const testStudent = {
    student_id: 'std_test_collision_' + Date.now(),
    registration_number: dummyReg,
    name: 'TEST COLLISION CANDIDATE',
    father_name: 'TEST FATHER',
    date_of_birth: '2010-01-01',
    phone: '9999999999',
    school_or_college: 'TEST SCHOOL',
    class_name: 'NURSERY',
    competition_name: 'COLOUR BY NUMBER',
    status: 'ACTIVE'
  };

  const { data: insertData, error: insertError } = await client
    .from('students')
    .insert(testStudent)
    .select();

  if (insertError) {
    console.log(`[PASS] DB strictly rejected duplicate registration_number: code=${insertError.code}, message="${insertError.message}"`);
  } else {
    console.error(`[FAIL - CRITICAL RISK] Database allowed duplicate registration_number! Clean up:`, insertData);
    await client.from('students').delete().eq('student_id', testStudent.student_id);
  }

  // 2. Check for duplicate records in existing 5,752 students
  console.log('\n--- 2. Auditing 5,752 Database Records for Duplicates ---');
  let allStudents = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await client
      .from('students')
      .select('student_id, registration_number, name, father_name, phone, class_name, competition_name')
      .range(from, from + batchSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allStudents.push(...data);
    from += batchSize;
  }
  console.log(`Total active records queried: ${allStudents.length}`);

  const regCounts = new Map();
  const humanDuplicates = [];
  const humanSet = new Map();

  for (const s of allStudents) {
    const reg = (s.registration_number || '').trim().toUpperCase();
    regCounts.set(reg, (regCounts.get(reg) || 0) + 1);

    const humanKey = `${(s.name || '').trim().toUpperCase()}|${(s.father_name || '').trim().toUpperCase()}|${(s.class_name || '').trim().toUpperCase()}|${(s.competition_name || '').trim().toUpperCase()}`;
    if (humanSet.has(humanKey)) {
      humanDuplicates.push({ existing: humanSet.get(humanKey), duplicate: s });
    } else {
      humanSet.set(humanKey, s);
    }
  }

  const dupRegs = [...regCounts.entries()].filter(([k, count]) => count > 1);
  console.log(`Duplicate Registration Numbers in DB: ${dupRegs.length}`);
  if (dupRegs.length > 0) {
    console.error('CRITICAL: Duplicate registration numbers found:', dupRegs);
  } else {
    console.log('[PASS] ZERO duplicate registration numbers exist in Supabase.');
  }

  console.log(`Identical Human Name+Father+Class+Event duplicates in DB: ${humanDuplicates.length}`);
  if (humanDuplicates.length > 0) {
    console.log('Sample human duplicates in dataset:');
    humanDuplicates.slice(0, 5).forEach((d, i) => {
      console.log(`  [${i+1}] Reg1=${d.existing.registration_number} (${d.existing.name}) vs Reg2=${d.duplicate.registration_number} (${d.duplicate.name})`);
    });
  }

  // 3. Inspect admit_cards uniqueness
  console.log('\n--- 3. Auditing admit_cards table integrity ---');
  let allCards = [];
  from = 0;
  while (true) {
    const { data, error } = await client
      .from('admit_cards')
      .select('student_id, registration_number, status')
      .range(from, from + batchSize - 1);
    if (error) break;
    if (!data || data.length === 0) break;
    allCards.push(...data);
    from += batchSize;
  }
  console.log(`Total admit card records in DB: ${allCards.length}`);
  const cardRegCounts = new Map();
  for (const c of allCards) {
    const reg = (c.registration_number || '').trim().toUpperCase();
    cardRegCounts.set(reg, (cardRegCounts.get(reg) || 0) + 1);
  }
  const dupCards = [...cardRegCounts.entries()].filter(([k, count]) => count > 1);
  console.log(`Duplicate Admit Cards per registration_number: ${dupCards.length}`);
  if (dupCards.length > 0) {
    console.error('CRITICAL: Duplicate admit card records found:', dupCards.slice(0, 5));
  } else {
    console.log('[PASS] ZERO duplicate admit cards per candidate in database.');
  }
}

main().catch(console.error);
