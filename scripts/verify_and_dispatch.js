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

const apiKey = env.ICPAAS_API_KEY || 'f4aaf8f8-1866-49e6-b035-fa06093b010d';
const apiUrl = env.ICPAAS_API_URL || 'https://icpaas.in/api/v1/send';
const senderMobile = env.ICPAAS_MOBILE || '8707744749';

async function dispatchMessage(phone, studentName, regNo) {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const messageText = `Dear ${studentName}, your Mind-Spark 2026 Registration Number is ${regNo}. Please note: Admit Cards will be available for download starting 25 October 2026. Keep this registration number safe!`;

  // Payload structure as per official ICPaaS SingleSendingAPI Swagger / Postman
  const payload = {
    channel: 'WhatsApp',
    to: [`91${cleanPhone}`],
    from: senderMobile,
    apiKey: apiKey,
    content: {
      data: {
        text: messageText,
        templatepayload: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          type: 'template',
          template: {
            name: 'admit_card_notice',
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: studentName },
                  { type: 'text', text: regNo },
                  { type: 'text', text: '25 October 2026' }
                ]
              }
            ]
          }
        }
      }
    }
  };

  console.log(`\n--------------------------------------------------`);
  console.log(`Dispatching to Candidate: ${studentName} (${cleanPhone})`);
  console.log(`Reg No: ${regNo}`);
  console.log(`Endpoint: POST ${apiUrl}`);

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const status = res.status;
    const responseText = await res.text();
    let responseJson = null;
    try { responseJson = JSON.parse(responseText); } catch {}

    console.log(`HTTP Status: ${status} ${res.statusText}`);
    console.log(`Response Body:`, responseJson || responseText);

    return {
      success: res.ok,
      status,
      response: responseJson || responseText
    };
  } catch (err) {
    console.error(`Dispatch Network Error:`, err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

async function main() {
  console.log('=== STEP 1: VERIFY TEST CANDIDATES IN SUPABASE ===');
  const testPhones = ['8948905711', '9795600217'];

  const { data: candidates, error } = await supabase
    .from('students')
    .select('*')
    .in('phone', testPhones);

  if (error) {
    console.error('Error fetching students:', error);
    return;
  }

  console.log(`Found ${candidates.length} test candidates in live database:`);
  candidates.forEach(c => {
    console.log(`- Reg: ${c.registration_number} | Name: ${c.name} | Phone: ${c.phone} | Status: ${c.whatsapp_status}`);
  });

  console.log('\n=== STEP 2: EXECUTE LIVE DISPATCH TO TEST NUMBERS ===');
  for (const c of candidates) {
    const result = await dispatchMessage(c.phone, c.name, c.registration_number);

    // Update status in database
    const newStatus = result.success ? 'SENT' : (result.status === 401 ? 'GATEWAY_AUTH_REQUIRED' : 'FAILED');
    const { error: updateErr } = await supabase
      .from('students')
      .update({
        whatsapp_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('student_id', c.student_id);

    if (updateErr) {
      console.error(`Failed to update student status in DB:`, updateErr.message);
    } else {
      console.log(`Database updated: ${c.name} status -> ${newStatus}`);
    }
  }

  console.log('\n=== TEST VERIFICATION RUN FINISHED ===');
}

main().catch(console.error);
