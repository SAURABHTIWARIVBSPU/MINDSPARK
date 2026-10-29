const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function alignStudentIds() {
  console.log('Finding students whose student_id contains 5137-5207 but registration_number is different...');
  const { data: mismatched, error } = await client
    .from('students')
    .select('student_id, registration_number')
    .ilike('student_id', 'std_reg_ms261105%');

  if (error) throw error;
  console.log(`Found ${mismatched.length} students with std_reg_ms261105%`);

  let aligned = 0;
  for (const s of mismatched) {
    const expectedId = `std_reg_${s.registration_number.toLowerCase()}`;
    if (s.student_id !== expectedId) {
      console.log(`Aligning student_id: ${s.student_id} -> ${expectedId} (for reg ${s.registration_number})`);
      
      // Update admit_cards first if any references
      await client
        .from('admit_cards')
        .update({ student_id: expectedId })
        .eq('student_id', s.student_id);

      // Update students table
      const { error: updErr } = await client
        .from('students')
        .update({ student_id: expectedId })
        .eq('registration_number', s.registration_number);

      if (updErr) {
        console.error(`Failed to update student_id for ${s.registration_number}:`, updErr.message);
      } else {
        aligned++;
      }
    }
  }
  console.log(`✅ Aligned ${aligned} student_ids successfully!`);
}

alignStudentIds();
