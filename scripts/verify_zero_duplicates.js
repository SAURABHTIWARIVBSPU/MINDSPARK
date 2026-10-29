const fs = require('fs');
const XLSX = require('xlsx');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyAll() {
  console.log('=== VERIFYING DATABASE & MASTER INTEGRITY ===\n');

  // 1. Check Supabase
  let allDbRegs = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await client
      .from('students')
      .select('registration_number, name')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allDbRegs = allDbRegs.concat(data);
    from += pageSize;
    if (data.length < pageSize) break;
  }
  console.log(`Supabase Total Students: ${allDbRegs.length}`);

  const dbRegCounts = new Map();
  allDbRegs.forEach(s => {
    dbRegCounts.set(s.registration_number, (dbRegCounts.get(s.registration_number) || 0) + 1);
  });
  let dbDups = 0;
  dbRegCounts.forEach((cnt, reg) => {
    if (cnt > 1) {
      console.error(`DB Duplicate on ${reg} (${cnt} times)`);
      dbDups++;
    }
  });
  console.log(`Supabase Duplicates: ${dbDups}`);

  // 2. Check Master Excel
  const wb = XLSX.readFile('Master_All_Students_Registry.xlsx');
  const masterRows = XLSX.utils.sheet_to_json(wb.Sheets['Master Students'], { defval: '' });
  console.log(`Master Excel Total Students: ${masterRows.length}`);

  const masterRegCounts = new Map();
  masterRows.forEach(s => {
    masterRegCounts.set(s['Registration No'], (masterRegCounts.get(s['Registration No']) || 0) + 1);
  });
  let masterDups = 0;
  masterRegCounts.forEach((cnt, reg) => {
    if (cnt > 1) {
      console.error(`Master Duplicate on ${reg} (${cnt} times)`);
      masterDups++;
    }
  });
  console.log(`Master Duplicates: ${masterDups}`);

  // 3. Cross check Master vs Supabase
  let missingInDb = 0;
  masterRows.forEach(m => {
    if (!dbRegCounts.has(m['Registration No'])) {
      console.error(`Missing in DB: ${m['Registration No']}`);
      missingInDb++;
    }
  });
  console.log(`Master Candidates Missing in DB: ${missingInDb}`);

  if (dbDups === 0 && masterDups === 0 && missingInDb === 0) {
    console.log('\n🏆 ZERO DUPLICATES CONFIRMED: 100% PERFECT DATABASE & REGISTRY HARMONY!');
  } else {
    console.error('\n❌ INTEGRITY ISSUES FOUND!');
  }
}

verifyAll();
