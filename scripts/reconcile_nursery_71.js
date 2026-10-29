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

function norm(str) {
  return String(str || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

async function reconcile() {
  console.log('=== STEP 1: LOAD RE-MAP DEFINITION ===');
  const wb6 = XLSX.readFile('CAndidate_data-6.xlsx');
  const nurSheet = wb6.Sheets['NURSERY '];
  const d6 = XLSX.utils.sheet_to_json(nurSheet, { defval: '' });

  const wbMaster = XLSX.readFile('Master_All_Students_Registry.xlsx');
  const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });

  const clashRows = masterRows.filter(r => {
    const m = String(r['Registration No']).match(/^MS26110?(\d+)$/);
    return m && parseInt(m[1], 10) >= 5137 && parseInt(m[1], 10) <= 5207;
  });
  console.log(`Found ${clashRows.length} clash candidates (5137 to 5207) in Master.`);

  // Build clean mapping: oldReg -> { oldReg, trueReg, name, father, phone, school }
  const remapPlan = [];
  clashRows.forEach(m => {
    const nameNorm = norm(m['Student Name']);
    const fatherNorm = norm(m["Father's Name"]);

    // Find in file 6 nursery sheet
    const match = d6.find(r => norm(r['Student Name']) === nameNorm && norm(r["Father's Name"]) === fatherNorm);
    if (!match) {
      throw new Error(`Could not find match in file 6 Nursery for ${m['Registration No']} (${nameNorm} / ${fatherNorm})`);
    }

    const trueReg = norm(match.Timestamp);
    if (!trueReg.startsWith('MS26110')) {
      throw new Error(`Invalid trueReg format "${trueReg}" for ${nameNorm}`);
    }

    remapPlan.push({
      oldReg: m['Registration No'],
      trueReg: trueReg,
      name: nameNorm,
      father: fatherNorm
    });
  });

  console.log(`Verified ${remapPlan.length} remap items. Checking uniqueness of trueReg...`);
  const trueRegSet = new Set();
  const masterRegSet = new Set(masterRows.map(r => r['Registration No']));
  // Exclude current clash range from masterRegSet for the check
  clashRows.forEach(r => masterRegSet.delete(r['Registration No']));

  for (const item of remapPlan) {
    if (trueRegSet.has(item.trueReg)) {
      throw new Error(`Duplicate trueReg in remap plan: ${item.trueReg}`);
    }
    trueRegSet.add(item.trueReg);
    if (masterRegSet.has(item.trueReg)) {
      throw new Error(`trueReg ${item.trueReg} already in Master outside clash range!`);
    }
  }
  console.log('✅ All trueRegs are 100% unique and vacant in Master!\n');

  console.log('=== STEP 2: UPDATE SUPABASE DATABASE ===');
  // Check if trueReg already exists for students that are NOT in our remapPlan
  const { data: existingTargetDb, error: chkErr } = await client
    .from('students')
    .select('student_id, registration_number, name')
    .in('registration_number', Array.from(trueRegSet));
  if (chkErr) throw chkErr;
  const remapNames = new Set(remapPlan.map(p => p.name));
  const trulyColliding = (existingTargetDb || []).filter(s => !remapNames.has(norm(s.name)));
  if (trulyColliding.length > 0) {
    throw new Error(`Target registration numbers clash with other students: ${JSON.stringify(trulyColliding)}`);
  }
  console.log('✅ Supabase target registration numbers verified.');

  let dbUpdatedStudents = 0;
  let dbUpdatedCards = 0;
  let idx = 0;
  for (const item of remapPlan) {
    idx++;
    // Check if already updated (e.g. from previous partial run)
    const { data: alreadyDone } = await client
      .from('students')
      .select('registration_number')
      .eq('registration_number', item.trueReg);

    if (alreadyDone && alreadyDone.length > 0) {
      console.log(`[${idx}/${remapPlan.length}] Already updated: ${item.oldReg} -> ${item.trueReg} (${item.name})`);
      dbUpdatedStudents++;
      continue;
    }

    // 1. Update students table
    const { data: sData, error: sErr } = await client
      .from('students')
      .update({
        registration_number: item.trueReg,
        updated_at: new Date().toISOString(),
        updated_by: 'reconcile_nursery_true_reg'
      })
      .eq('registration_number', item.oldReg)
      .select();

    if (sErr) {
      throw new Error(`Failed to update student ${item.oldReg} -> ${item.trueReg}: ${sErr.message}`);
    }
    if (sData && sData.length > 0) dbUpdatedStudents++;

    // 2. Update admit_cards table if exists
    const { data: cardRow } = await client
      .from('admit_cards')
      .select('*')
      .eq('registration_number', item.oldReg);

    if (cardRow && cardRow.length > 0) {
      const oldFileId = cardRow[0].file_id;
      const newFileId = oldFileId.replace(item.oldReg, item.trueReg);
      const { error: cErr } = await client
        .from('admit_cards')
        .update({
          registration_number: item.trueReg,
          file_id: newFileId,
          updated_at: new Date().toISOString()
        })
        .eq('registration_number', item.oldReg);

      if (cErr) {
        throw new Error(`Failed to update admit card for ${item.oldReg}: ${cErr.message}`);
      }
      dbUpdatedCards++;
    }
    console.log(`[${idx}/${remapPlan.length}] Updated ${item.oldReg} -> ${item.trueReg} (${item.name})`);
  }

  console.log(`✅ Supabase update completed: ${dbUpdatedStudents} students updated, ${dbUpdatedCards} admit card records updated.\n`);

  console.log('=== STEP 3: UPDATE MASTER EXCEL WORKBOOK ===');
  // Update Master_All_Students_Registry.xlsx
  const oldToNewMap = new Map(remapPlan.map(p => [p.oldReg, p.trueReg]));
  masterRows.forEach(r => {
    if (oldToNewMap.has(r['Registration No'])) {
      r['Registration No'] = oldToNewMap.get(r['Registration No']);
    }
  });

  // Re-sort masterRows by registration number
  masterRows.sort((a, b) => {
    const regA = String(a['Registration No'] || '');
    const regB = String(b['Registration No'] || '');
    return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Re-index S.No
  masterRows.forEach((r, idx) => {
    r['S.No'] = idx + 1;
  });

  // Write updated master
  const wsMaster = XLSX.utils.json_to_sheet(masterRows);
  wbMaster.Sheets['Master Students'] = wsMaster;
  XLSX.writeFile(wbMaster, 'Master_All_Students_Registry.xlsx');
  console.log(`✅ Master Excel updated successfully. Registered candidates: ${masterRows.length}`);

  // Verify that 5137-5207 is now completely empty in Master
  const remainingInClash = masterRows.filter(r => {
    const m = String(r['Registration No']).match(/^MS26110?(\d+)$/);
    return m && parseInt(m[1], 10) >= 5137 && parseInt(m[1], 10) <= 5207;
  });
  console.log(`Verification: Remaining records in 5137-5207 in Master = ${remainingInClash.length} (Expected: 0)`);

  if (remainingInClash.length !== 0) {
    throw new Error('Verification failed: Clash range still has records!');
  }

  console.log('\n🎉 PHASE 1 RECONCILIATION OF 71 NURSERY CANDIDATES COMPLETED SUCCESSFULLY!');
}

reconcile().catch(err => {
  console.error('❌ Reconcile failed:', err);
  process.exit(1);
});
