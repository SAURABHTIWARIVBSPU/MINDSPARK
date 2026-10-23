const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
});

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('=== STEP 1: CHECK & CREATE 2 TEST CANDIDATES ===');
  const testPhones = ['8948905711', '9795600217'];

  for (const phone of testPhones) {
    const { data: existing } = await supabase
      .from('students')
      .select('*')
      .eq('phone', phone);

    if (existing && existing.length > 0) {
      console.log(`Candidate with phone ${phone} already exists:`, existing[0].registration_number, existing[0].name);
    } else {
      const regNo = phone === '8948905711' ? 'MS26TEST8948' : 'MS26TEST9795';
      const studentId = `std_test_${phone}`;
      const newStudent = {
        student_id: studentId,
        registration_number: regNo,
        name: `TEST CANDIDATE (${phone})`,
        father_name: 'TEST FATHER / GUARDIAN',
        date_of_birth: '2008-01-01',
        phone: phone,
        school_or_college: 'MEENA SHAH MEMORIAL TEST CAMPUS',
        class_name: phone === '8948905711' ? 'CLASS 10' : 'CLASS 12',
        competition_name: 'ONLINE QUIZ',
        status: 'ACTIVE',
        whatsapp_status: 'NOT_SENT',
        created_by: 'admin_test',
        updated_by: 'admin_test',
        data_version: 1,
      };

      const { data, error } = await supabase.from('students').insert([newStudent]).select();
      if (error) {
        console.error(`Error inserting test student for ${phone}:`, error);
      } else {
        console.log(`Created test candidate for ${phone}: RegNo=${regNo}`);
      }
    }
  }

  console.log('\n=== STEP 2: PROBE ICPAAS GATEWAY ===');
  const apiKey = env.ICPAAS_API_KEY;
  const username = env.ICPAAS_USERNAME || 'meenashahschool';
  const senderMobile = env.ICPAAS_MOBILE || '8707744749';
  console.log('ICPaaS Config:', { username, senderMobile, apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING' });

  // Probe possible ICPaaS API endpoints
  const probeEndpoints = [
    'https://icpaas.in/api/v1/whatsapp/send',
    'https://icpaas.in/api/whatsapp/send',
    'https://icpaas.in/api/v1/send',
    'https://icpaas.in/api/send',
    'https://icpaas.in/Client/MyProfile/Index',
  ];

  for (const endpoint of probeEndpoints) {
    try {
      console.log(`\nProbing: ${endpoint}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          apikey: apiKey,
          apiKey: apiKey,
          username: username,
          sender: senderMobile,
          mobile: '918948905711',
          to: '918948905711',
          message: 'Test verification message from Mind-Spark Examination Council',
        }),
      });

      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`Response snippet:`, text.substring(0, 300));
    } catch (e) {
      console.log(`Fetch error:`, e.message);
    }
  }
}

run().catch(console.error);
