const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[k] = v;
  }
});
const { createClient } = require('@supabase/supabase-js');
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
  console.log('=== SYNCING MASTER REGISTRY (5,749 STUDENTS) TO SUPABASE ===\n');

  // Load all registration numbers currently in Supabase
  console.log('1. Fetching all existing registration numbers from Supabase...');
  let existingDbRegs = new Set();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await client
      .from('students')
      .select('registration_number')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    data.forEach(d => existingDbRegs.add(String(d.registration_number).trim()));
    from += pageSize;
    if (data.length < pageSize) break;
  }
  console.log(`   Found ${existingDbRegs.size} existing candidate records in Supabase.`);

  // Load Master Registry
  const wbMaster = XLSX.readFile('Master_All_Students_Registry.xlsx');
  const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });
  console.log(`2. Loaded ${masterRows.length} candidates from Master_All_Students_Registry.xlsx.`);

  // Find missing candidates
  const missingInDb = masterRows.filter(r => !existingDbRegs.has(String(r['Registration No']).trim()));
  console.log(`3. Candidates to insert into Supabase: ${missingInDb.length}\n`);

  if (missingInDb.length === 0) {
    console.log('✅ Supabase is already completely in sync with Master Registry!');
    return;
  }

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < missingInDb.length; i += batchSize) {
    const chunk = missingInDb.slice(i, i + batchSize);
    const dbRows = chunk.map((c, chunkIdx) => {
      const reg = String(c['Registration No']).trim();
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const studentId = `std_${Date.now()}_${i + chunkIdx}_${uniqueSuffix}`;

      return {
        student_id: studentId,
        registration_number: reg,
        name: String(c['Student Name'] || '').trim().toUpperCase(),
        father_name: String(c["Father's Name"] || '').trim().toUpperCase(),
        date_of_birth: String(c['Date of Birth'] || '01-01-2015').trim(),
        phone: String(c['Phone Number'] || '0000000000').replace(/\D/g, '').slice(-10) || '0000000000',
        school_or_college: String(c['School / College'] || 'MEENA SHAH PUBLIC SCHOOL').trim().toUpperCase(),
        class_name: String(c['Class'] || '').trim().toUpperCase(),
        competition_name: String(c['Event Category'] || '').trim().toUpperCase(),
        status: 'ACTIVE',
        whatsapp_status: 'NOT_SENT',
        created_by: 'batch_candidate_data_7_8',
        updated_by: 'batch_candidate_data_7_8',
        data_version: 1
      };
    });

    const { error: insErr } = await client
      .from('students')
      .insert(dbRows);

    if (insErr) {
      throw new Error(`Failed to insert batch [${i} to ${i + chunk.length}]: ${insErr.message}`);
    }

    inserted += chunk.length;
    console.log(`   Inserted ${inserted} / ${missingInDb.length} candidates...`);
  }

  console.log(`\n✅ Successfully inserted all ${inserted} candidates into Supabase!`);

  // Update system_settings
  console.log('4. Updating system_settings.reg_no_seq_current to 6049...');
  await client
    .from('system_settings')
    .update({
      reg_no_seq_current: 6049,
      updated_at: new Date().toISOString()
    })
    .eq('id', 'default_settings');

  // Verify total count in Supabase
  const { count: finalDbCount, error: cntErr } = await client
    .from('students')
    .select('*', { count: 'exact', head: true });
  console.log(`\n🎉 FINAL SUPABASE STUDENTS COUNT: ${finalDbCount} (Errors: ${cntErr ? cntErr.message : 'NONE'})`);

  // Save portal snapshot with latest data
  const jsonSnapshotPath = path.resolve('.data', 'master_students_4887_snapshot.json');
  fs.writeFileSync(jsonSnapshotPath, JSON.stringify({
    totalCount: masterRows.length,
    updatedAt: new Date().toISOString(),
    students: masterRows
  }, null, 2));
  console.log(`✅ Refreshed portal snapshot at: ${jsonSnapshotPath}`);
}

sync().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
