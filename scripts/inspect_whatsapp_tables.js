const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

async function inspectExtraTables() {
  const serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const anonClient = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const extraTables = [
    'message_jobs',
    'message_job_items',
    'message_attempts',
    'message_templates',
    'whatsapp_accounts',
    'worker_assignments',
    'worker_installations',
  ];

  console.log('=== INSPECTING 7 ADDITIONAL TABLES (SERVICE_ROLE VS ANON) ===\n');

  for (const table of extraTables) {
    const { count: sCount, error: sErr } = await serviceClient.from(table).select('*', { count: 'exact', head: true });
    const { data: aData, count: aCount, error: aErr } = await anonClient.from(table).select('*', { count: 'exact' }).limit(3);

    console.log(`Table: "${table}"`);
    console.log(`  service_role count: ${sErr ? sErr.message : sCount}`);
    if (aErr) {
      console.log(`  anon access: DENIED (${aErr.message})`);
    } else {
      console.log(`  anon access: EXPOSED! Anon can read ${aCount} total rows (sample fetched: ${aData ? aData.length : 0})`);
    }
  }

  console.log('\n=== TESTING RPC FUNCTIONS VIA ANON ===');
  const rpcs = [
    'claim_message_job_item',
    'renew_message_job_lease',
    'recover_stale_message_leases',
    'complete_message_job_item',
  ];

  for (const rpc of rpcs) {
    const { data, error } = await anonClient.rpc(rpc, {});
    console.log(`RPC "${rpc}" via anon:`, error ? error.message : 'SUCCESS');
  }
}

inspectExtraTables().catch(console.error);
