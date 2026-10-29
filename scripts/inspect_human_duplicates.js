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
  const regs = ['MS261101005', 'MS261101434', 'MS261101009', 'MS261101429', 'MS261101008', 'MS261101431', 'MS261105643', 'MS261105982'];
  const { data } = await client.from('students').select('*').in('registration_number', regs).order('name');
  console.log('DETAILS OF 4 HUMAN DUPLICATE PAIRS:');
  for (const r of data) {
    console.log(`- Reg: ${r.registration_number} | Name: ${r.name} | Father: ${r.father_name} | DOB: ${r.date_of_birth} | Phone: ${r.phone} | School: ${r.school_or_college} | Class: ${r.class_name} | Event: ${r.competition_name} | CreatedBy: ${r.created_by}`);
  }
}

main().catch(console.error);
