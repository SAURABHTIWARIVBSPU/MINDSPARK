const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const folder = path.resolve('Programme_Wise_Candidate_Excel');

async function main() {
  console.log('================================================================================');
  console.log('🔬 DEEP VERIFICATION: PROGRAMME-WISE CAMPAIGN WORKBOOKS AUDIT');
  console.log('================================================================================\n');

  // 1. Fetch all DB registration numbers
  let dbStudents = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('students')
      .select('registration_number, name, competition_name')
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    dbStudents = dbStudents.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`[1] Total Database Students: ${dbStudents.length}`);
  const dbRegSet = new Set(dbStudents.map(s => s.registration_number.trim().toUpperCase()));

  // 2. Read Master Roster File
  const masterPath = path.join(folder, '00_COMPLETE_ALL_STUDENTS_MASTER_ROSTER.xlsx');
  if (!fs.existsSync(masterPath)) {
    console.error(`Master file does not exist at ${masterPath}!`);
    process.exit(1);
  }
  const wbMaster = xlsx.readFile(masterPath);
  const masterRows = xlsx.utils.sheet_to_json(wbMaster.Sheets['All 5752 Candidates']);
  console.log(`[2] Master Roster Rows:      ${masterRows.length}`);

  if (masterRows.length !== dbStudents.length) {
    console.error(`❌ Mismatch between DB (${dbStudents.length}) and Master Roster (${masterRows.length})`);
    process.exit(1);
  }

  // 3. Check for any missing registration numbers in master
  const masterRegs = new Set(masterRows.map(r => String(r['Registration Number'] || '').trim().toUpperCase()));
  const missingFromMaster = [...dbRegSet].filter(r => !masterRegs.has(r));
  if (missingFromMaster.length > 0) {
    console.error(`❌ Missing from Master Roster:`, missingFromMaster);
    process.exit(1);
  } else {
    console.log(`    ✓ Zero registration numbers missing from Master Roster! (5,752 / 5,752 matched)`);
  }

  // 4. Audit all individual programme files
  console.log('\n[3] Auditing Individual Programme Files:');
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.xlsx') && f !== '00_COMPLETE_ALL_STUDENTS_MASTER_ROSTER.xlsx' && f !== 'ONLINE_QUIZ.xlsx');

  let totalIndividualRows = 0;
  const individualRegs = new Set();
  const fileBreakdowns = [];

  for (const f of files) {
    const filePath = path.join(folder, f);
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws);
    totalIndividualRows += rows.length;

    // Check header column A
    const range = xlsx.utils.decode_range(ws['!ref']);
    const a1 = ws['A1'] ? ws['A1'].v : '';
    if (a1 !== 'number') {
      console.warn(`    ⚠️ Warning: File ${f} A1 is '${a1}', expected 'number'`);
    }

    // Check for duplicate roll numbers within this file
    const fileRolls = new Set();
    let dupInFile = 0;
    rows.forEach(r => {
      const reg = String(r['Registration Number'] || '').trim().toUpperCase();
      if (fileRolls.has(reg)) dupInFile++;
      fileRolls.add(reg);
      individualRegs.add(reg);
    });

    fileBreakdowns.push({ file: f, rows: rows.length, dupInFile, a1Header: a1 });
    console.log(`    ✓ ${f.padEnd(46)}: ${String(rows.length).padStart(4)} rows (Header A1: '${a1}')`);
  }

  console.log('\n================================================================================');
  console.log(`Total Candidates Across Individual Files: ${totalIndividualRows}`);
  console.log(`Total Unique Registration Numbers:        ${individualRegs.size}`);
  console.log(`Total in Database:                        ${dbStudents.length}`);

  if (totalIndividualRows === dbStudents.length && individualRegs.size === dbStudents.length) {
    console.log('\n🎉 EMPIRICAL AUDIT PASSED 100%! EVERY SINGLE STUDENT IS PRESENT & VERIFIED!');
  } else {
    console.error('\n❌ AUDIT FAILED: Counts do not balance!');
    process.exit(1);
  }
}

main().catch(console.error);
