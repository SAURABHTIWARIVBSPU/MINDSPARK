const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Read environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const idx = line.indexOf('=');
      if (idx > 0 && !line.startsWith('#')) {
        const k = line.slice(0, idx).trim();
        let v = line.slice(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        env[k] = v;
      }
    });
}

const apiKey = (env.ICPAAS_API_KEY || '').trim();
const phoneNumberId = env.ICPAAS_PHONE_NUMBER_ID || env.WHATSAPP_PHONE_NUMBER_ID || '1346032508598977';
const apiUrl = env.ICPAAS_API_URL || `https://icpaas.in/v23.0/${phoneNumberId}/messages`;
const templateName = env.ICPAAS_TEMPLATE_NAME || 'admit_card_new';

console.log('--- TEST STAFF WHATSAPP DISPATCHER ---');
console.log('API URL:', apiUrl);
console.log('Phone Number ID:', phoneNumberId);
console.log('Template Name:', templateName);

const REGISTRY_PATH = path.join(process.cwd(), 'Test_Teachers_And_Staff_Registry.xlsx');

if (!fs.existsSync(REGISTRY_PATH)) {
  console.error('Registry file not found at:', REGISTRY_PATH);
  process.exit(1);
}

const workbook = XLSX.readFile(REGISTRY_PATH);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(worksheet);

console.log(`Found ${rows.length} records in ${sheetName}.`);

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.slice(-10);
}

async function sendWhatsAppMessage(phone, name, regNo) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length !== 10) {
    return { success: false, error: 'Invalid 10-digit phone' };
  }

  const bodyParams = [
    'Mind Spark Competition- 2026',
    `Participant ${name}`,
    `Your form has been successfully enrolled for Mind Spark Competition 2026 This is your Registration Number: ${regNo}`,
    'After 26th October, we will provide a link on your WhatsApp to download your admit card. You can enter your Registration Number and Date of Birth to download your admit card.',
    'Join whatspp group for more update https://chat.whatsapp.com/DTuxN2SADVdCm714xkPB3L',
  ];

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: `91${cleanPhone}`,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: bodyParams.map((v) => ({
            type: 'text',
            text: v,
          })),
        },
      ],
    },
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resText = await res.text();
    let resJson = null;
    try {
      resJson = JSON.parse(resText);
    } catch {}

    if (!res.ok) {
      const errMsg =
        resJson?.error?.message ||
        resJson?.message ||
        resText ||
        `HTTP ${res.status}`;
      return { success: false, error: errMsg };
    }

    const messageId =
      resJson?.messages?.[0]?.id ||
      resJson?.id ||
      `wamid_${Date.now()}`;
    return { success: true, messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function run() {
  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row['Teacher / Staff Name'] || `Staff_${i + 1}`;
    const rawPhone = row['Mobile Number (10 Digit)'];
    const phone = normalizePhone(rawPhone);
    const regNo = `TEST_${phone.slice(-4)}`;

    console.log(`\n[${i + 1}/${rows.length}] Dispatching to: ${name} (+91 ${phone})...`);

    const result = await sendWhatsAppMessage(phone, name, regNo);

    if (result.success) {
      console.log(`  ✓ SUCCESS! Meta Message ID: ${result.messageId}`);
      row['WhatsApp Status'] = 'SENT';
      row['Last Dispatch Date'] = nowStr;
      row['Notes / Verification Status'] = `Delivered via ICPaaS (Meta ID: ${result.messageId})`;
      successCount++;
    } else {
      console.log(`  ✗ FAILED: ${result.error}`);
      row['WhatsApp Status'] = 'FAILED';
      row['Last Dispatch Date'] = nowStr;
      row['Notes / Verification Status'] = `Failed: ${result.error}`;
      failCount++;
    }

    // Small delay between sends
    await new Promise((r) => setTimeout(r, 400));
  }

  // Update Excel file
  const updatedWorksheet = XLSX.utils.json_to_sheet(rows);
  updatedWorksheet['!cols'] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 25 },
    { wch: 30 },
    { wch: 35 },
    { wch: 28 },
    { wch: 18 },
    { wch: 24 },
    { wch: 50 },
  ];

  const updatedWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(updatedWorkbook, updatedWorksheet, sheetName);
  XLSX.writeFile(updatedWorkbook, REGISTRY_PATH);

  console.log('\n=============================================');
  console.log(`DISPATCH COMPLETED: ${successCount} Succeeded, ${failCount} Failed.`);
  console.log(`Real-time audit log saved to: ${REGISTRY_PATH}`);
  console.log('=============================================');
}

run();
