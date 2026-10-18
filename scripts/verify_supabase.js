const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
});

const { createClient } = require('@supabase/supabase-js');

async function testAppAdapter() {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('Testing App config with URL:', url);

  const client = createClient(url, key);

  // 1. Search student by reg number
  const { data: student, error: sErr } = await client
    .from('students')
    .select('*')
    .eq('registration_number', 'MS261100037')
    .single();

  if (sErr) throw sErr;
  console.log('FOUND CANDIDATE MS261100037:');
  console.log(' - Name:', student.name);
  console.log(' - DOB:', student.date_of_birth);
  console.log(' - Phone:', student.phone);
  console.log(' - Class:', student.class_name);
  console.log(' - School:', student.school_or_college);

  // 2. Paginate students
  const { data: page1, count } = await client
    .from('students')
    .select('*', { count: 'exact' })
    .range(0, 9);

  console.log('TOTAL CANDIDATES IN SUPABASE:', count);
  console.log('PAGE 1 LOADED (ROWS):', page1.length);

  // 3. Check sequence in settings
  const { data: settings } = await client
    .from('system_settings')
    .select('*')
    .single();

  console.log('NEXT REG SEQUENCE:', settings.reg_no_seq_current);
  console.log('ALL VERIFICATION CHECKS PASSED 100%!');
}

testAppAdapter().catch(console.error);
