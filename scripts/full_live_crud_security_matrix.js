const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, l) => {
  const [k, ...v] = l.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

const anonClient = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const tables = [
  'students',
  'users',
  'system_settings',
  'admit_cards',
  'audit_logs',
  'import_jobs',
  'admit_card_jobs',
  'message_jobs',
  'message_job_items',
  'message_attempts',
  'message_templates',
  'whatsapp_accounts',
  'worker_assignments',
  'worker_installations',
];

const rpcs = [
  'recover_stale_message_leases',
  'claim_message_job_item',
  'renew_message_job_lease',
  'complete_message_job_item',
];

async function runMatrix() {
  console.log('================================================================');
  console.log('PART 1: OBJECT-BY-OBJECT LIVE CRUD TEST VIA PUBLIC (ANON) ROLE');
  console.log('================================================================');

  const matrix = [];

  for (const table of tables) {
    // 1. SELECT
    let selRes = 'UNKNOWN';
    try {
      const { data, error } = await anonClient.from(table).select('*').limit(1);
      if (error) {
        selRes = `DENIED: ${error.message} (code: ${error.code})`;
      } else if (data && data.length > 0) {
        selRes = `EXPOSED: ${data.length} records returned`;
      } else {
        selRes = `BLOCKED: 0 records (RLS filtered)`;
      }
    } catch (e) {
      selRes = `DENIED: ${e.message}`;
    }

    // 2. INSERT
    let insRes = 'UNKNOWN';
    try {
      const { data, error } = await anonClient.from(table).insert({ dummy_fake_col: 'hack' });
      if (error) {
        insRes = `DENIED: ${error.message} (code: ${error.code})`;
      } else {
        insRes = `EXPOSED: Insert succeeded!`;
      }
    } catch (e) {
      insRes = `DENIED: ${e.message}`;
    }

    // 3. UPDATE
    let updRes = 'UNKNOWN';
    try {
      const { data, error } = await anonClient.from(table).update({ dummy_col: 'hack' }).neq('dummy_col', 'xyz');
      if (error) {
        updRes = `DENIED: ${error.message} (code: ${error.code})`;
      } else {
        updRes = `EXPOSED: Update succeeded!`;
      }
    } catch (e) {
      updRes = `DENIED: ${e.message}`;
    }

    // 4. DELETE
    let delRes = 'UNKNOWN';
    try {
      const { data, error } = await anonClient.from(table).delete().neq('dummy_col', 'xyz');
      if (error) {
        delRes = `DENIED: ${error.message} (code: ${error.code})`;
      } else {
        delRes = `EXPOSED: Delete succeeded!`;
      }
    } catch (e) {
      delRes = `DENIED: ${e.message}`;
    }

    // Service Role Verification
    let srvRes = 'UNKNOWN';
    let srvCount = 0;
    try {
      const { data, count, error } = await serviceClient.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        srvRes = `ERROR: ${error.message}`;
      } else {
        srvCount = count ?? 0;
        srvRes = `OPERATIONAL (${srvCount} rows)`;
      }
    } catch (e) {
      srvRes = `ERROR: ${e.message}`;
    }

    matrix.push({ table, selRes, insRes, updRes, delRes, srvRes, srvCount });
    console.log(`\nTABLE: ${table}`);
    console.log(`  Anon SELECT : ${selRes}`);
    console.log(`  Anon INSERT : ${insRes}`);
    console.log(`  Anon UPDATE : ${updRes}`);
    console.log(`  Anon DELETE : ${delRes}`);
    console.log(`  Service Role: ${srvRes}`);
  }

  console.log('\n================================================================');
  console.log('PART 2: LIVE RPC FUNCTION AUTHORIZATION MATRIX');
  console.log('================================================================');

  for (const rpc of rpcs) {
    let anonStatus = '';
    try {
      const { data, error } = await anonClient.rpc(rpc, {});
      if (error) {
        anonStatus = `DENIED / REJECTED: ${error.message} (code: ${error.code})`;
      } else {
        anonStatus = `EXPOSED: Function executed anonymously!`;
      }
    } catch (e) {
      anonStatus = `DENIED: ${e.message}`;
    }
    console.log(`RPC: ${rpc.padEnd(30)} -> ${anonStatus}`);
  }

  console.log('\n================================================================');
  console.log('PART 3: STORAGE ACCESS RESTRICTION MATRIX');
  console.log('================================================================');

  // Bucket details
  const { data: buckets, error: bErr } = await serviceClient.storage.listBuckets();
  if (bErr) {
    console.error('Bucket list error:', bErr.message);
  } else {
    for (const b of buckets || []) {
      console.log(`Bucket: "${b.name}" | Public: ${b.public ? 'YES (UNSAFE)' : 'NO (PRIVATE - SECURE)'} | Created: ${b.created_at}`);
    }
  }

  // Direct anon file download attempt without signed token
  const samplePdfName = 'AdmitCard_MS261100001.pdf';
  const directPublicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/admit-cards/${samplePdfName}`;
  const anonDirectRes = await fetch(directPublicUrl);
  console.log(`Direct Public Anon Access to "${samplePdfName}": HTTP ${anonDirectRes.status} (${anonDirectRes.statusText})`);

  // Anon download from authenticated endpoint without token
  const authUrl = `${env.SUPABASE_URL}/storage/v1/object/authenticated/admit-cards/${samplePdfName}`;
  const anonAuthRes = await fetch(authUrl, {
    headers: { 'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
  });
  console.log(`Anon Access to /authenticated/ endpoint: HTTP ${anonAuthRes.status} (${anonAuthRes.statusText})`);

  // Service role signed URL generation
  const { data: signData, error: signErr } = await serviceClient.storage
    .from('admit-cards')
    .createSignedUrl(samplePdfName, 60);

  if (signErr) {
    console.log(`Signed URL Generation: FAILED (${signErr.message})`);
  } else {
    console.log(`Signed URL Generation: SUCCESS (URL generated)`);
    // Authorized fetch
    const signedFetch = await fetch(signData.signedUrl);
    console.log(`Authorized Fetch with Signed Token: HTTP ${signedFetch.status} (${signedFetch.headers.get('content-type')}, ${signedFetch.headers.get('content-length')} bytes)`);
    
    // Tamper attempt: change filename
    const tamperedUrl = signData.signedUrl.replace(samplePdfName, 'AdmitCard_MS261100002.pdf');
    const tamperFetch = await fetch(tamperedUrl);
    console.log(`Tampered URL Fetch (Cross-Candidate Access): HTTP ${tamperFetch.status} (${tamperFetch.statusText})`);
  }
}

runMatrix().catch(console.error);
