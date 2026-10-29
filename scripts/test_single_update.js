const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testInsert() {
  const testId = `std_${Date.now()}_test`;
  console.log('Inserting candidate with reg MS261105137 and student_id', testId);
  const { data, error } = await client
    .from('students')
    .insert({
      student_id: testId,
      registration_number: 'MS261105137',
      name: 'IRAM',
      father_name: 'WAHEED KHAN',
      date_of_birth: '12-05-2011',
      phone: '9839191790',
      school_or_college: 'SIR SYED GIRLS INTER COLLEGE',
      class_name: '9',
      competition_name: 'ONLINE QUIZ',
      status: 'ACTIVE',
      whatsapp_status: 'NOT_SENT'
    })
    .select();
  console.log('Insert result:', data ? 'SUCCESS' : 'FAILED', error ? error.message : 'OK');

  if (data && data.length > 0) {
    await client.from('students').delete().eq('student_id', testId);
    console.log('Cleaned up test record.');
  }
}

testInsert();
