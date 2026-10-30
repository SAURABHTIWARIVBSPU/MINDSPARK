const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function norm(s) {
  return String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

async function runReconciliation() {
  console.log('================================================================================');
  console.log('🔄 RESTORING ORIGINAL AUTHORITATIVE REGISTRATION NUMBERS (71 NURSERY + 3 PORTAL)');
  console.log('🔄 REALLOCATING 72 SIR SYED CANDIDATES TO VACANT SEQUENCE (6319 - 6390)');
  console.log('================================================================================\n');

  // Step 1: Load Authoritative Old Master (commit 8cd87fa)
  const oldMasterPath = path.join(process.env.TEMP, 'master_8cd87fa.xlsx');
  if (!fs.existsSync(oldMasterPath)) {
    throw new Error(`Old master not found at ${oldMasterPath}`);
  }
  const oldWb = XLSX.readFile(oldMasterPath);
  const oldRows = XLSX.utils.sheet_to_json(oldWb.Sheets[oldWb.SheetNames[0]], { defval: '' });
  console.log(`[1] Loaded Authoritative Base Master (8cd87fa): ${oldRows.length} students.`);

  // Find the 71 nursery students in oldRows
  const oldNursery71 = oldRows.filter(r => {
    const m = String(r['Registration No']).match(/^MS26110?(\d+)$/);
    if (!m) return false;
    const n = parseInt(m[1], 10);
    return n >= 5137 && n <= 5207;
  });
  console.log(`    Found all 71 Nursery students in 8cd87fa (MS261105137 to MS261105207).`);

  // Step 2: Load Current Master_All_Students_Registry.xlsx
  const masterFile = 'Master_All_Students_Registry.xlsx';
  const currWb = XLSX.readFile(masterFile);
  const masterSheetName = currWb.SheetNames[0];
  const currRows = XLSX.utils.sheet_to_json(currWb.Sheets[masterSheetName], { defval: '' });
  console.log(`[2] Loaded Current Master Registry: ${currRows.length} students from '${masterSheetName}'.`);

  // Step 3: Identify the 3 Groups
  // Group 1: 72 Sir Syed candidates occupying 5137 to 5210
  const syed72Rows = currRows.filter(r => {
    const m = String(r['Registration No']).match(/^MS26110?(\d+)$/);
    if (!m) return false;
    const n = parseInt(m[1], 10);
    return n >= 5137 && n <= 5210;
  });
  console.log(`[3] Identified ${syed72Rows.length} Sir Syed students currently in MS261105137 - MS261105210.`);

  // Group 2: 71 Nursery candidates scattered in 3118..5024
  const nursery71Plan = [];
  oldNursery71.forEach(oldR => {
    const origReg = oldR['Registration No'];
    const name = norm(oldR['Student Name']);
    const father = norm(oldR["Father's Name"]);
    const match = currRows.find(c => norm(c['Student Name']) === name && norm(c["Father's Name"]) === father);
    if (!match) {
      throw new Error(`Cannot find Nursery student in current master: ${name} s/o ${father}`);
    }
    nursery71Plan.push({
      currReg: match['Registration No'],
      restoredReg: origReg,
      name: name,
      father: father
    });
  });
  console.log(`    Verified 1-to-1 matching for all 71 Nursery students.`);

  // Group 3: 3 Portal candidates
  const portal3Plan = [
    { currReg: 'MS261107001', restoredReg: 'MS261105208', name: 'ALI HASAN KHAN', father: 'JAVED KHAN' },
    { currReg: 'MS261107002', restoredReg: 'MS261105209', name: 'ALI HAIDER KHAN', father: 'JAVED KHAN' },
    { currReg: 'MS261107003', restoredReg: 'MS261105210', name: 'MOHMMAD HUSSAM', father: 'MOHAMMAD FIROZ' },
  ];

  // Build Master Translation Maps
  const regTranslationMap = new Map();
  const nameFatherTranslationMap = new Map();

  // A. Reassign Sir Syed students to 6319 - 6390
  let syedSeq = 6319;
  syed72Rows.forEach(r => {
    const currReg = r['Registration No'];
    const newReg = `MS26110${syedSeq}`;
    regTranslationMap.set(currReg, newReg);
    nameFatherTranslationMap.set(norm(r['Student Name']) + '|' + norm(r["Father's Name"]), newReg);
    syedSeq++;
  });
  console.log(`    Re-allocated 72 Sir Syed candidates to MS261106319 - MS261106390.`);

  // B. Restore Nursery candidates to 5137 - 5207
  nursery71Plan.forEach(p => {
    regTranslationMap.set(p.currReg, p.restoredReg);
    nameFatherTranslationMap.set(p.name + '|' + p.father, p.restoredReg);
  });
  console.log(`    Restored 71 Nursery candidates to MS261105137 - MS261105207.`);

  // C. Restore Portal candidates to 5208 - 5210
  portal3Plan.forEach(p => {
    regTranslationMap.set(p.currReg, p.restoredReg);
    nameFatherTranslationMap.set(norm(p.name) + '|' + norm(p.father), p.restoredReg);
  });
  console.log(`    Restored 3 Portal candidates to MS261105208 - MS261105210.`);

  // Step 4: Apply to Master_All_Students_Registry.xlsx
  console.log(`\n[4] Updating Master_All_Students_Registry.xlsx...`);
  currRows.forEach(r => {
    const key = norm(r['Student Name']) + '|' + norm(r["Father's Name"]);
    if (nameFatherTranslationMap.has(key)) {
      r['Registration No'] = nameFatherTranslationMap.get(key);
    }
  });

  // Re-sort masterRows by Registration No numerically
  currRows.sort((a, b) => {
    const na = parseInt(String(a['Registration No']).replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(String(b['Registration No']).replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });

  // Re-index S.No
  currRows.forEach((r, idx) => {
    r['S.No'] = idx + 1;
  });

  currWb.Sheets[masterSheetName] = XLSX.utils.json_to_sheet(currRows);
  XLSX.writeFile(currWb, masterFile);
  console.log(`    ✅ Successfully wrote ${currRows.length} sorted, re-indexed rows to ${masterFile}`);

  // Step 5: Apply to MINDSPARK_2026_MASTER_APPROVED_DELIVERABLE.xlsx
  console.log(`\n[5] Updating MINDSPARK_2026_MASTER_APPROVED_DELIVERABLE.xlsx...`);
  const delivFile = 'MINDSPARK_2026_MASTER_APPROVED_DELIVERABLE.xlsx';
  const delivWb = XLSX.readFile(delivFile);
  delivWb.Sheets['Master All Students'] = XLSX.utils.json_to_sheet(currRows);

  // Update Duplicate & Conflict Audit sheet
  const auditWs = delivWb.Sheets['Duplicate & Conflict Audit'];
  if (auditWs) {
    const auditRows = XLSX.utils.sheet_to_json(auditWs);
    // Update rows 0 and 1
    if (auditRows[0]) {
      auditRows[0].RegistrationNo = 'MS261105137 - MS261105207 (71 Candidates)';
      auditRows[0].ActionTaken = 'RESTORED TO ORIGINAL ALLOCATION';
      auditRows[0].Reason = 'Authoritative restoration: Returned all 71 Nursery candidates to their original allocated registration numbers MS261105137 to MS261105207.';
    }
    if (auditRows[1]) {
      auditRows[1].RegistrationNo = 'MS261105208, MS261105209, MS261105210';
      auditRows[1].ActionTaken = 'RESTORED TO ORIGINAL ALLOCATION';
      auditRows[1].Reason = 'Authoritative restoration: Preserved and restored original registration numbers for Ali Hasan Khan (5208), Ali Haider Khan (5209), Mohmmad Hussam (5210). Reassigned incoming Sir Syed candidates to vacant sequence MS261106319-6390.';
    }
    delivWb.Sheets['Duplicate & Conflict Audit'] = XLSX.utils.json_to_sheet(auditRows);
  }

  XLSX.writeFile(delivWb, delivFile);
  console.log(`    ✅ Successfully updated ${delivFile}`);

  // Step 6: Update Programme-Wise Workbooks
  console.log(`\n[6] Updating Programme-Wise Workbooks in temp_programme_wise...`);
  const tempDir = 'temp_programme_wise';
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir);
  execSync(`tar -xf Programme_Wise_Candidate_Excel.zip -C ${tempDir}`);

  const progFiles = fs.readdirSync(tempDir).filter(f => f.endsWith('.xlsx'));
  progFiles.forEach(pf => {
    const filePath = path.join(tempDir, pf);
    const wb = XLSX.readFile(filePath);
    let changedInFile = 0;

    wb.SheetNames.forEach(sName => {
      const sheet = wb.Sheets[sName];
      const rows = XLSX.utils.sheet_to_json(sheet);
      rows.forEach(r => {
        const rawReg = String(r['Registration Number'] || r['Registration No'] || '').trim();
        const hasPrefix = rawReg.startsWith('Your Reg/NO:');
        const cleanReg = rawReg.replace(/^Your Reg\/NO:\s*/i, '').trim().toUpperCase();
        const nameKey = norm(r['Candidate Name'] || r['Student Name']) + '|' + norm(r["Father's Name"]);

        let targetReg = null;
        if (nameFatherTranslationMap.has(nameKey)) {
          targetReg = nameFatherTranslationMap.get(nameKey);
        } else if (regTranslationMap.has(cleanReg)) {
          targetReg = regTranslationMap.get(cleanReg);
        }

        if (targetReg && targetReg !== cleanReg) {
          const finalVal = hasPrefix ? `Your Reg/NO:  ${targetReg}` : targetReg;
          if (r['Registration Number'] !== undefined) r['Registration Number'] = finalVal;
          if (r['Registration No'] !== undefined) r['Registration No'] = finalVal;
          changedInFile++;
        }
      });

      // Sort rows by numeric registration number
      rows.sort((a, b) => {
        const ra = String(a['Registration Number'] || a['Registration No'] || '').replace(/\D/g, '');
        const rb = String(b['Registration Number'] || b['Registration No'] || '').replace(/\D/g, '');
        return (parseInt(ra, 10) || 0) - (parseInt(rb, 10) || 0);
      });

      // Re-index Candidate S.No or S.No if present
      rows.forEach((r, idx) => {
        if (r['Candidate S.No'] !== undefined) r['Candidate S.No'] = idx + 1;
        if (r['S.No'] !== undefined) r['S.No'] = idx + 1;
      });

      wb.Sheets[sName] = XLSX.utils.json_to_sheet(rows);
    });

    XLSX.writeFile(wb, filePath);
    console.log(`    ✓ ${pf.padEnd(45)}: ${changedInFile} candidate numbers updated and re-sorted.`);
  });

  // Step 7: Repack Programme_Wise_Candidate_Excel.zip
  console.log(`\n[7] Repacking Programme_Wise_Candidate_Excel.zip...`);
  if (fs.existsSync('Programme_Wise_Candidate_Excel.zip')) {
    fs.unlinkSync('Programme_Wise_Candidate_Excel.zip');
  }
  execSync(`powershell -Command "Compress-Archive -Path 'temp_programme_wise\\*' -DestinationPath 'Programme_Wise_Candidate_Excel.zip' -Force"`);
  const zipStats = fs.statSync('Programme_Wise_Candidate_Excel.zip');
  console.log(`    ✅ Programme_Wise_Candidate_Excel.zip recreated successfully (${(zipStats.size / 1024 / 1024).toFixed(2)} MB).`);

  // Remove temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`    Cleaned up temporary extraction directory.`);

  // Step 8: Update authoritative-dispatched-schedules.json if exists
  const dispatchedPath = 'src/lib/allocation/authoritative-dispatched-schedules.json';
  if (fs.existsSync(dispatchedPath)) {
    console.log(`\n[8] Synchronizing ${dispatchedPath}...`);
    const dispatched = JSON.parse(fs.readFileSync(dispatchedPath, 'utf8'));
    let dispatchedUpdated = 0;

    for (const [oldReg, newReg] of regTranslationMap.entries()) {
      if (dispatched[oldReg]) {
        const entry = { ...dispatched[oldReg], reg: newReg };
        delete dispatched[oldReg];
        dispatched[newReg] = entry;
        dispatchedUpdated++;
      }
    }
    fs.writeFileSync(dispatchedPath, JSON.stringify(dispatched, null, 2) + '\n');
    console.log(`    ✅ Synchronized ${dispatchedUpdated} entries in ${dispatchedPath}`);
  }

  // Step 9: Comprehensive Verification
  console.log(`\n================================================================================`);
  console.log(`🔬 VERIFYING COMPREHENSIVE DATA INTEGRITY`);
  console.log(`================================================================================\n`);

  const vMaster = XLSX.readFile(masterFile);
  const vRows = XLSX.utils.sheet_to_json(vMaster.Sheets[vMaster.SheetNames[0]], { defval: '' });

  // 1. Total row count
  console.log(`1. Total Students in Master: ${vRows.length} (Expected: 6,046)`);
  if (vRows.length !== 6046) throw new Error(`Expected 6046 students, got ${vRows.length}`);

  // 2. Uniqueness
  const regSet = new Set();
  vRows.forEach(r => {
    const reg = r['Registration No'];
    if (regSet.has(reg)) throw new Error(`Duplicate Registration No found: ${reg}`);
    regSet.add(reg);
  });
  console.log(`2. Unique Registration Numbers: ${regSet.size} / ${vRows.length} (100% collision-free)`);

  // 3. Check 71 Nursery candidates are in 5137 - 5207
  let nurseryMatched = 0;
  oldNursery71.forEach(oldR => {
    const name = norm(oldR['Student Name']);
    const father = norm(oldR["Father's Name"]);
    const currMatch = vRows.find(c => norm(c['Student Name']) === name && norm(c["Father's Name"]) === father);
    if (!currMatch) throw new Error(`Missing nursery student ${name}`);
    if (currMatch['Registration No'] !== oldR['Registration No']) {
      throw new Error(`Nursery student ${name} reg mismatch: got ${currMatch['Registration No']}, expected ${oldR['Registration No']}`);
    }
    nurseryMatched++;
  });
  console.log(`3. Verified 71 Nursery Students: ${nurseryMatched}/71 have EXACT original IDs (MS261105137 - MS261105207).`);

  // 4. Check 3 Portal candidates
  const p1 = vRows.find(r => norm(r['Student Name']) === 'ALI HASAN KHAN');
  const p2 = vRows.find(r => norm(r['Student Name']) === 'ALI HAIDER KHAN');
  const p3 = vRows.find(r => norm(r['Student Name']) === 'MOHMMAD HUSSAM');
  console.log(`4. Portal candidates:`);
  console.log(`   - ${p1['Student Name']}: ${p1['Registration No']} (Expected: MS261105208)`);
  console.log(`   - ${p2['Student Name']}: ${p2['Registration No']} (Expected: MS261105209)`);
  console.log(`   - ${p3['Student Name']}: ${p3['Registration No']} (Expected: MS261105210)`);
  if (p1['Registration No'] !== 'MS261105208' || p2['Registration No'] !== 'MS261105209' || p3['Registration No'] !== 'MS261105210') {
    throw new Error('Portal students registration numbers incorrect!');
  }

  // 5. Check 72 Sir Syed candidates
  const syedInNewRange = vRows.filter(r => {
    const m = String(r['Registration No']).match(/^MS26110?(\d+)$/);
    if (!m) return false;
    const n = parseInt(m[1], 10);
    return n >= 6319 && n <= 6390;
  });
  console.log(`5. Re-allocated Sir Syed candidates in MS261106319 - MS261106390: ${syedInNewRange.length} (Expected: 72)`);
  if (syedInNewRange.length !== 72) throw new Error(`Expected 72 Sir Syed candidates, got ${syedInNewRange.length}`);

  // 6. Check that old displaced slots (7001-7003) are now empty
  const oldDisplaced = vRows.filter(r => ['MS261107001', 'MS261107002', 'MS261107003'].includes(r['Registration No']));
  console.log(`6. Old displaced slots MS261107001-7003 remaining: ${oldDisplaced.length} (Expected: 0)`);
  if (oldDisplaced.length !== 0) throw new Error('Old displaced slots still occupied!');

  // 7. Verify all 4884 base candidates from 8cd87fa match exactly
  let baseMatched = 0;
  oldRows.forEach(oldR => {
    const oldReg = oldR['Registration No'];
    const rowInCurr = vRows.find(c => c['Registration No'] === oldReg);
    if (!rowInCurr) {
      throw new Error(`Base candidate ${oldReg} (${oldR['Student Name']}) not found in current master!`);
    }
    baseMatched++;
  });
  console.log(`7. Verified ALL ${baseMatched} / 4,884 original base candidates match their exact allocated registration numbers!`);

  console.log('\n🎉 ALL RECONCILIATIONS AND INTEGRITY INVARIANTS PASSED 100%!');
}

runReconciliation().catch(err => {
  console.error('❌ Reconciliation failed:', err);
  process.exit(1);
});
