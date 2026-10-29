const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const c = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Try inserting a duplicate registration number to test constraint
  const { data: s } = await c.from('students').select('registration_number').limit(1).single();
  console.log('Testing duplicate insertion with existing reg:', s.registration_number);
  const { error } = await c.from('students').insert({
    student_id: 'test_constraint_check',
    registration_number: s.registration_number,
    name: 'TEST DUPLICATE',
    father_name: 'TEST',
    date_of_birth: '2015-01-01',
    phone: '9999999999',
    school_or_college: 'TEST SCHOOL',
    class_name: '1',
    competition_name: 'CLAY CHAMPS'
  });
  console.log('Insert error on duplicate (expected unique constraint):', error ? error.message : 'NO ERROR (WARNING!)');
}
check();
