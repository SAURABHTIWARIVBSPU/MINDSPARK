const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[k] = v;
  }
});

const API_KEY = env.ICPAAS_API_KEY || 'f4aaf8f8-1866-49e6-b035-fa06093b010d';
const PHONE_NUMBER_ID = '1346032508598977';
const WABA_ID = '1119511721006574';
const SENDER_NUMBER = '918429718299';

async function testEndpoint(desc, url, method, body, headers = {}) {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    console.log(`[${res.status}] ${desc} ->`, text.slice(0, 300));
    return { status: res.status, text };
  } catch (err) {
    console.log(`[ERR] ${desc} ->`, err.message);
  }
}

async function main() {
  console.log('Testing with WABA Channels details:');
  console.log('API_KEY:', API_KEY);
  console.log('PHONE_NUMBER_ID:', PHONE_NUMBER_ID);
  console.log('WABA_ID:', WABA_ID);
  console.log('SENDER_NUMBER:', SENDER_NUMBER);

  // 1. Meta style endpoint: /{version}/{phoneNumberId}/messages
  for (const v of ['v18.0', 'v1.0', 'v19.0', 'v17.0']) {
    await testEndpoint(
      `Meta Send (${v}) to 8948905711`,
      `https://icpaas.in/${v}/${PHONE_NUMBER_ID}/messages`,
      'POST',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '918948905711',
        type: 'text',
        text: { body: 'Mindspark 2026 Test Message' }
      }
    );
  }

  // 2. Templates for WABA: /{version}/{wabaId}/message_templates
  for (const v of ['v18.0', 'v1.0']) {
    await testEndpoint(
      `Get WABA Templates (${v})`,
      `https://icpaas.in/${v}/${WABA_ID}/message_templates`,
      'GET'
    );
  }

  // 3. SingleSendingAPI: /api/v1/send with from = PHONE_NUMBER_ID
  await testEndpoint(
    'Unified Send from=PHONE_NUMBER_ID',
    'https://icpaas.in/api/v1/send',
    'POST',
    {
      channel: 'WhatsApp',
      to: ['918948905711'],
      from: PHONE_NUMBER_ID,
      content: {
        data: {
          text: 'Mindspark 2026 Test Message'
        }
      }
    }
  );

  // 4. SingleSendingAPI: /api/v1/send with from = SENDER_NUMBER
  await testEndpoint(
    'Unified Send from=SENDER_NUMBER',
    'https://icpaas.in/api/v1/send',
    'POST',
    {
      channel: 'WhatsApp',
      to: ['918948905711'],
      from: SENDER_NUMBER,
      content: {
        data: {
          text: 'Mindspark 2026 Test Message'
        }
      }
    }
  );
}

main();
