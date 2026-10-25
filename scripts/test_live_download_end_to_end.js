const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

async function testLiveAdmitCardWorkflow() {
  console.log('=== VERIFYING LIVE ADMIT CARD DOWNLOAD END-TO-END ===');
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Pick an active candidate
  const { data: cand } = await client.from('students').select('registration_number, date_of_birth, name').eq('status', 'ACTIVE').limit(1).single();
  console.log(`Testing with candidate: ${cand.registration_number}`);

  // 2. Check admit_cards record
  const { data: cardRecord } = await client.from('admit_cards').select('*').eq('registration_number', cand.registration_number).single();
  console.log(`Admit card record found: status=${cardRecord.status}, file_id=${cardRecord.file_id}, storage_type=${cardRecord.storage_type}`);

  // 3. Generate signed URL from private bucket
  const { data: signedData, error: signErr } = await client.storage
    .from('admit-cards')
    .createSignedUrl(cardRecord.file_id, 900);

  if (signErr) {
    console.error('Failed to generate signed URL:', signErr.message);
    process.exit(1);
  }

  console.log('Signed URL generated successfully (valid for 900s).');

  // 4. Fetch binary PDF using the signed URL
  const fetchRes = await fetch(signedData.signedUrl);
  console.log(`Fetch via signed URL HTTP Status: ${fetchRes.status} ${fetchRes.statusText}`);
  console.log(`Content-Type: ${fetchRes.headers.get('content-type')}`);
  const pdfBuf = await fetchRes.arrayBuffer();
  console.log(`Downloaded PDF Size: ${pdfBuf.byteLength} bytes (~${(pdfBuf.byteLength / 1024).toFixed(1)} KB)`);

  // Verify vector PDF magic bytes (%PDF)
  const magic = Buffer.from(pdfBuf.slice(0, 4)).toString();
  console.log(`Magic Bytes: "${magic}" (expected: "%PDF")`);

  if (fetchRes.status === 200 && magic === '%PDF') {
    console.log('\n🎉 END-TO-END WORKFLOW VERIFIED: Private Bucket Storage + Signed URL Streaming is 100% OPERATIONAL!');
  } else {
    console.error('\n❌ Verification Failed!');
    process.exit(1);
  }
}

testLiveAdmitCardWorkflow().catch(console.error);
