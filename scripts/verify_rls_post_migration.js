const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

async function testPostMigrationSecurity() {
  console.log('====================================================');
  console.log('🔍 POST-MIGRATION SECURITY & RLS VERIFICATION');
  console.log('====================================================\n');

  const anonClient = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const tables = ['students', 'users', 'system_settings', 'admit_cards', 'audit_logs'];
  let allDenied = true;

  console.log('--- TEST 1: Public Anon Role Direct Access (Must be DENIED) ---');
  for (const table of tables) {
    const { data, error } = await anonClient.from(table).select('*').limit(5);
    if (error) {
      console.log(`  ✅ ${table}: Access Denied (${error.message})`);
    } else if (data && data.length === 0) {
      console.log(`  ✅ ${table}: Zero rows visible to anon (RLS filtered 0/0)`);
    } else {
      console.error(`  ❌ ${table}: EXPOSED! Anon read ${data.length} rows!`);
      allDenied = false;
    }
  }

  // Test anon INSERT on system_settings
  const { error: insertError } = await anonClient.from('system_settings').insert({
    exam_title: 'Hacked Title',
    venue: 'Hacked Venue',
  });
  if (insertError) {
    console.log(`  ✅ system_settings INSERT: Denied (${insertError.message})`);
  } else {
    console.error(`  ❌ system_settings INSERT: PERMITTED TO ANON!`);
    allDenied = false;
  }

  console.log('\n--- TEST 2: Server-Side Service Role Access (Must SUCCEED) ---');
  let serviceOk = true;
  for (const table of tables) {
    const { data, count, error } = await serviceClient.from(table).select('*', { count: 'exact' }).limit(1);
    if (error) {
      console.error(`  ❌ service_role failed on ${table}: ${error.message}`);
      serviceOk = false;
    } else {
      console.log(`  ✅ ${table}: Accessible by service_role (Total: ${count ?? (data ? data.length : 0)})`);
    }
  }

  console.log('\n====================================================');
  if (allDenied && serviceOk) {
    console.log('🎉 VERIFICATION PASSED: RLS is fully locked down and server workflow is 100% operational!');
  } else if (!allDenied) {
    console.log('⚠️ VERIFICATION FAILED: RLS is still NOT active or anon policies are missing.');
  } else {
    console.log('⚠️ VERIFICATION FAILED: service_role access is impaired.');
  }
  console.log('====================================================');
}

testPostMigrationSecurity().catch(console.error);
