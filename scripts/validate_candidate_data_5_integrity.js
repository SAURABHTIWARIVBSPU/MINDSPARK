const XLSX = require('xlsx');
const path = require('path');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

const wb5 = XLSX.readFile(file5Path);
const wbMaster = XLSX.readFile(masterPath);

const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });

// 1. Collect all Candidate_data-5 rows with cleaned fields
const rows5 = [];
for (const s of wb5.SheetNames) {
  const sheet = wb5.Sheets[s];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  data.forEach((r, idx) => {
    let reg = '', name = '', father = '', dob = '', aadhar = '', phone = '', school = '', cls = '', event = '';
    for (const [k, v] of Object.entries(r)) {
      const kl = k.toLowerCase().trim();
      const vs = String(v).trim();
      if (kl.includes('reg')) reg = vs.toUpperCase();
      else if (kl.includes('student') || kl === 'name') name = vs;
      else if (kl.includes('father')) father = vs;
      else if (kl.includes('dob') || kl.includes('birth')) dob = v;
      else if (kl.includes('aadhar')) aadhar = vs;
      else if (kl.includes('contact') || kl.includes('phone') || kl.includes('mobile')) phone = vs;
      else if (kl.includes('school') || kl.includes('college')) school = vs;
      else if (kl === 'class' || kl === 'class ') cls = vs;
      else if (k.includes('(')) event = vs;
    }
    if (!cls) cls = s;

    // Clean DOB
    let cleanDob = '';
    if (typeof dob === 'number') {
      // Excel serial date
      const date = new Date(Math.round((dob - 25569) * 86400 * 1000));
      cleanDob = date.toISOString().split('T')[0];
    } else if (typeof dob === 'string' && dob.trim()) {
      const parts = dob.trim().split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          cleanDob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          cleanDob = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      if (!cleanDob) cleanDob = dob.trim();
    }

    rows5.push({
      sheet: s,
      rowIdx: idx + 2,
      reg,
      name: name.toUpperCase().replace(/\s+/g, ' '),
      father: father.toUpperCase().replace(/\s+/g, ' '),
      dob: cleanDob,
      rawDob: dob,
      aadhar: aadhar.replace(/\D/g, ''),
      phone: phone.replace(/\D/g, '').slice(-10),
      rawPhone: phone,
      school: school.toUpperCase().replace(/\s+/g, ' '),
      cls: cls.toUpperCase().replace(/\s+/g, ' '),
      event: event.toUpperCase().replace(/\s+/g, ' '),
      raw: r
    });
  });
}

console.log(`Loaded ${rows5.length} records from Candidate_data-5.xlsx.`);

// Check for missing data
const issues = [];
rows5.forEach((r, idx) => {
  if (!r.reg) issues.push(`Row ${idx+1}: Missing Reg No`);
  if (!r.name) issues.push(`Row ${idx+1} (${r.reg}): Missing Name`);
  if (!r.father) issues.push(`Row ${idx+1} (${r.reg}): Missing Father`);
  if (!r.phone || r.phone.length !== 10) issues.push(`Row ${idx+1} (${r.reg}): Invalid/Missing Phone "${r.rawPhone}"`);
  if (!r.school) issues.push(`Row ${idx+1} (${r.reg}): Missing School`);
  if (!r.cls) issues.push(`Row ${idx+1} (${r.reg}): Missing Class`);
  if (!r.event) issues.push(`Row ${idx+1} (${r.reg}): Missing Event`);
});

console.log(`Validation Issues found: ${issues.length}`);
issues.slice(0, 10).forEach(i => console.log('  -', i));

// Check uniqueness of Registration Numbers in rows5
const regSeen = new Map();
const regDupes = [];
rows5.forEach(r => {
  if (regSeen.has(r.reg)) {
    regDupes.push({ reg: r.reg, first: regSeen.get(r.reg), duplicate: r });
  } else {
    regSeen.set(r.reg, r);
  }
});
console.log(`Duplicate Registration Numbers in Candidate_data-5: ${regDupes.length}`);
regDupes.forEach(d => console.log(`  - ${d.reg}: [${d.first.sheet}] ${d.first.name} vs [${d.duplicate.sheet}] ${d.duplicate.name}`));

// Check overlap of Registration Numbers with Master
const masterRegSet = new Set(masterRows.map(m => String(m['Registration No']).trim()));
const regOverlapWithMaster = rows5.filter(r => masterRegSet.has(r.reg));
console.log(`Registration Numbers overlapping with Master Students: ${regOverlapWithMaster.length}`);
