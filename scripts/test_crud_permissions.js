const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

async function testCrud() {
  const anonClient = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const tables = [
    { name: 'students', pk: 'student_id', synthetic: { student_id: 'canary_test_probe_id', registration_number: 'MS26CANARY9999', name: 'Canary Test', father_name: 'Canary Father', date_of_birth: '2000-01-01', phone: '0000000000', school_or_college: 'Canary School', class_name: '10', competition_name: 'Quiz' } },
    { name: 'users', pk: 'uid', synthetic: { uid: 'canary_test_probe_user', email: 'canary_probe@mindspark.edu.in', display_name: 'Canary Probe' } },
    { name: 'system_settings', pk: 'id', synthetic: { id: 'canary_probe_settings' } },
    { name: 'admit_cards', pk: 'student_id', synthetic: { student_id: 'canary_probe_admit', registration_number: 'MS26CANARY9999', file_id: 'canary_probe_file' } },
    { name: 'audit_logs', pk: 'event_id', synthetic: { event_id: 'canary_probe_event', actor_uid: 'canary', actor_email: 'canary@probe.org', action: 'PROBE', target_type: 'SECURITY', target_id: 'TEST' } },
    { name: 'import_jobs', pk: 'import_id', synthetic: { import_id: 'canary_probe_import', file_name: 'canary.xlsx', uploaded_by: 'canary', status: 'PROBE' } },
    { name: 'admit_card_jobs', pk: 'job_id', synthetic: { job_id: 'canary_probe_job', created_by: 'canary', status: 'PROBE' } },
  ];

  console.log('===============================================================');
  console.log('CRITICAL CRUD PERMISSION AUDIT FOR PUBLIC ANON ROLE');
  console.log('===============================================================\n');

  const results = [];

  for (const t of tables) {
    const outcome = { table: t.name, select: null, insert: null, update: null, delete: null };

    // 1. SELECT
    const { data: sData, error: sErr } = await anonClient.from(t.name).select('*').limit(1);
    if (sErr) {
      outcome.select = `DENIED (${sErr.code || sErr.message})`;
    } else if (sData && sData.length > 0) {
      outcome.select = `EXPOSED (${sData.length} row read)`;
    } else {
      outcome.select = `FILTERED (0 rows returned)`;
    }

    // 2. INSERT
    const { data: iData, error: iErr } = await anonClient.from(t.name).insert(t.synthetic).select();
    if (iErr) {
      outcome.insert = `DENIED (${iErr.code || iErr.message})`;
    } else {
      outcome.insert = `EXPOSED (Insert succeeded!)`;
      // Clean up canary immediately
      await anonClient.from(t.name).delete().eq(t.pk, t.synthetic[t.pk]);
    }

    // 3. UPDATE probe (targeting dummy canary ID)
    const { count: uCount, error: uErr } = await anonClient.from(t.name).update({ updated_at: new Date().toISOString() }).eq(t.pk, 'non_existent_canary_probe_99999');
    if (uErr) {
      outcome.update = `DENIED (${uErr.code || uErr.message})`;
    } else {
      outcome.update = `ALLOWED (Privilege granted, rows matched: ${uCount ?? 0})`;
    }

    // 4. DELETE probe (targeting dummy canary ID)
    const { count: dCount, error: dErr } = await anonClient.from(t.name).delete().eq(t.pk, 'non_existent_canary_probe_99999');
    if (dErr) {
      outcome.delete = `DENIED (${dErr.code || dErr.message})`;
    } else {
      outcome.delete = `ALLOWED (Privilege granted, rows matched: ${dCount ?? 0})`;
    }

    results.push(outcome);
    console.log(`Table: ${t.name.padEnd(18)} | SELECT: ${outcome.select.padEnd(25)} | INSERT: ${outcome.insert.padEnd(25)} | UPDATE: ${outcome.update.padEnd(30)} | DELETE: ${outcome.delete}`);
  }

  return results;
}

testCrud().catch(console.error);
