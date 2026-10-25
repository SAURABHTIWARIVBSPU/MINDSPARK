const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

async function inspectDb() {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('=== CHECKING ALL KNOWN TABLES IN PUBLIC SCHEMA ===');
  const candidateTables = [
    'students', 'users', 'system_settings', 'admit_cards', 'audit_logs',
    'import_jobs', 'admit_card_jobs', 'candidates', 'profiles', 'registrations',
    'settings', 'logs', 'events', 'schools'
  ];

  for (const t of candidateTables) {
    const { data, count, error } = await client.from(t).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`  ✓ Table exists: "${t}" | Total rows: ${count}`);
    } else if (error.code === '42P01') {
      // 42P01 is undefined_table
    } else {
      console.log(`  ? Table "${t}": ${error.message} (Code: ${error.code})`);
    }
  }

  console.log('\n=== CHECKING STORAGE BUCKETS ===');
  const { data: buckets, error: bErr } = await client.storage.listBuckets();
  if (bErr) {
    console.error('Storage bucket check error:', bErr.message);
  } else {
    for (const b of buckets) {
      console.log(`  Bucket: "${b.name}" | Public: ${b.public} | Created: ${b.created_at}`);
    }
  }
}

inspectDb().catch(console.error);
