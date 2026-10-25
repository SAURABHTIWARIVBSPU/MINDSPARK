const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

async function runIndependentAudit() {
  console.log('========================================================================');
  console.log('🔍 INDEPENDENT VERIFICATION 1: COMPLETE DATABASE OBJECT ACCESS MATRIX');
  console.log('========================================================================\n');

  const anonClient = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const allTables = [
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

  console.log('--- TABLE PERMISSION MATRIX (ALL 14 TABLES) ---');
  const tableResults = [];

  for (const table of allTables) {
    // 1. Anon access check
    let anonStatus = '';
    let anonExposed = false;
    try {
      const { data, error } = await anonClient.from(table).select('*').limit(2);
      if (error) {
        anonStatus = `DENIED (${error.message})`;
      } else if (data && data.length > 0) {
        anonStatus = `EXPOSED! (${data.length} rows read)`;
        anonExposed = true;
      } else {
        anonStatus = `DENIED / 0 rows (RLS filtered)`;
      }
    } catch (e) {
      anonStatus = `DENIED (${e.message})`;
    }

    // 2. Service role access check
    let serviceStatus = '';
    let serviceCount = 0;
    try {
      const { data, count, error } = await serviceClient.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        serviceStatus = `FAILED (${error.message})`;
      } else {
        serviceCount = count ?? 0;
        serviceStatus = `ACCESSIBLE (${serviceCount} rows)`;
      }
    } catch (e) {
      serviceStatus = `FAILED (${e.message})`;
    }

    tableResults.push({ table, anonStatus, serviceStatus, serviceCount, anonExposed });
    console.log(`Table: ${table.padEnd(22)} | Anon: ${anonStatus.padEnd(45)} | ServiceRole: ${serviceStatus}`);
  }

  console.log('\n--- RPC FUNCTIONS AUTHORIZATION MATRIX (ALL 4 RPCs) ---');
  const rpcs = [
    'recover_stale_message_leases',
    'claim_message_job_item',
    'renew_message_job_lease',
    'complete_message_job_item',
  ];

  const rpcResults = [];
  for (const rpc of rpcs) {
    let anonRpc = '';
    try {
      const { data, error } = await anonClient.rpc(rpc, {});
      if (error) {
        anonRpc = `DENIED (${error.message})`;
      } else {
        anonRpc = `EXPOSED (Invoked successfully!)`;
      }
    } catch (e) {
      anonRpc = `DENIED (${e.message})`;
    }
    rpcResults.push({ rpc, anonRpc });
    console.log(`RPC: ${rpc.padEnd(30)} | Anon Invocation: ${anonRpc}`);
  }

  console.log('\n========================================================================');
  console.log('🔍 INDEPENDENT VERIFICATION 3: ADMIT CARD & STORAGE INTEGRITY AUDIT');
  console.log('========================================================================\n');

  // Check admit_cards table rows
  const { data: cards, count: cardCount } = await serviceClient
    .from('admit_cards')
    .select('student_id, registration_number, file_id, status, storage_type', { count: 'exact' });

  console.log(`Total rows in admit_cards table: ${cardCount}`);
  const readyCards = (cards || []).filter(c => c.status === 'READY');
  console.log(`Rows with status === 'READY': ${readyCards.length}`);

  const distinctRegs = new Set(cards.map(c => c.registration_number));
  console.log(`Distinct registration numbers in admit_cards: ${distinctRegs.size}`);

  const distinctStudentIds = new Set(cards.map(c => c.student_id));
  console.log(`Distinct student IDs in admit_cards: ${distinctStudentIds.size}`);

  // Inspect storage bucket admit-cards
  const { data: storageObjects, error: sListErr } = await serviceClient.storage
    .from('admit-cards')
    .list('', { limit: 3000 });

  if (sListErr) {
    console.error('Failed to list storage objects:', sListErr.message);
  } else {
    console.log(`Total objects listed in bucket "admit-cards": ${storageObjects?.length}`);
  }

  // Check for orphaned records or missing files
  const objectFileNames = new Set((storageObjects || []).map(o => o.name));
  let missingFiles = 0;
  for (const card of cards || []) {
    if (!objectFileNames.has(card.file_id)) {
      missingFiles++;
    }
  }
  console.log(`Cards with missing storage files: ${missingFiles}`);

  // Test storage bucket public access
  const sampleCard = cards?.[0];
  if (sampleCard) {
    const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/admit-cards/${sampleCard.file_id}`;
    const pubRes = await fetch(publicUrl);
    console.log(`Direct Public Object URL Test (${sampleCard.file_id}): HTTP ${pubRes.status} (Expected: 400/404 Unauthorized)`);

    // Test tamper resistance
    const { data: signData } = await serviceClient.storage.from('admit-cards').createSignedUrl(sampleCard.file_id, 900);
    if (signData?.signedUrl) {
      // Modify target filename in signed URL while keeping token
      const tamperedUrl = signData.signedUrl.replace(sampleCard.file_id, 'AdmitCard_MS261109999.pdf');
      const tamperRes = await fetch(tamperedUrl);
      console.log(`Signed URL Tamper Resistance Test: HTTP ${tamperRes.status} (Expected: 400 Invalid signature)`);
    }
  }
}

runIndependentAudit().catch(console.error);
