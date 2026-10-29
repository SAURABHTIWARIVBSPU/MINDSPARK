const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const c = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: students } = await c
    .from('students')
    .select('student_id, registration_number, name, father_name, school_or_college, class_name, competition_name')
    .gte('registration_number', 'MS261105137')
    .lte('registration_number', 'MS261105209')
    .order('registration_number', { ascending: true });
  
  students.forEach(s => {
    console.log(`${s.registration_number} | ${s.name} | ${s.father_name} | ${s.school_or_college} | ${s.class_name} | ${s.competition_name}`);
  });
}

run();
