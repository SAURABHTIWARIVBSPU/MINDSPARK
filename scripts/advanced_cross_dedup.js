const XLSX = require('xlsx');
const path = require('path');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

const wb5 = XLSX.readFile(file5Path);
const wbMaster = XLSX.readFile(masterPath);

const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });

function cleanText(str) {
  return String(str || '')
    .toUpperCase()
    .replace(/\b(MR|MRS|MD|MOHD|MOHAMMAD|MOHAMED|SHEIKH|SHAIKH|KUMAR|PRASAD|SINGH|VERMA|KHAN|ANSARI)\b/g, '')
    .replace(/[^A-Z]/g, '');
}

function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '').slice(-10);
}

// Build smart index of Master
const masterEntries = masterRows.map(m => {
  return {
    reg: String(m['Registration No'] || '').trim(),
    name: String(m['Student Name'] || '').trim().toUpperCase(),
    father: String(m["Father's Name"] || '').trim().toUpperCase(),
    phone: normalizePhone(m['Phone Number']),
    cls: String(m['Class'] || '').trim().toUpperCase(),
    event: String(m['Event Category'] || '').trim().toUpperCase(),
    school: String(m['School / College'] || '').trim().toUpperCase(),
    cleanName: cleanText(m['Student Name']),
    cleanFather: cleanText(m["Father's Name"])
  };
});

// Scan Candidate_data-5
const file5Entries = [];
for (const s of wb5.SheetNames) {
  const data = XLSX.utils.sheet_to_json(wb5.Sheets[s], { defval: '' });
  data.forEach((r, idx) => {
    let reg = '', name = '', father = '', phone = '', school = '', cls = '', comp = '';
    for (const [k, v] of Object.entries(r)) {
      const kl = k.toLowerCase().trim();
      const vs = String(v).trim();
      if (kl.includes('reg')) reg = vs.toUpperCase();
      else if (kl.includes('student') || kl === 'name') name = vs;
      else if (kl.includes('father')) father = vs;
      else if (kl.includes('contact') || kl.includes('phone') || kl.includes('mobile')) phone = vs;
      else if (kl.includes('school') || kl.includes('college')) school = vs;
      else if (kl === 'class' || kl === 'class ') cls = vs;
      else if (k.includes('(')) comp = vs;
    }
    file5Entries.push({
      sheet: s,
      rowIdx: idx + 2,
      reg,
      name: name.toUpperCase().replace(/\s+/g, ' '),
      father: father.toUpperCase().replace(/\s+/g, ' '),
      phone: normalizePhone(phone),
      cls: (cls || s).toUpperCase().replace(/\s+/g, ' '),
      comp: comp.toUpperCase().replace(/\s+/g, ' '),
      school: school.toUpperCase().replace(/\s+/g, ' '),
      cleanName: cleanText(name),
      cleanFather: cleanText(father),
      raw: r
    });
  });
}

console.log(`Loaded ${masterEntries.length} Master entries and ${file5Entries.length} File 5 entries.`);

// Find all matches where:
// Case 1: Same Phone AND same clean student name
// Case 2: Same clean student name AND same clean father name
const matchedPairs = [];

for (const f5 of file5Entries) {
  for (const m of masterEntries) {
    let matchType = null;
    if (f5.phone && m.phone && f5.phone === m.phone && f5.cleanName && m.cleanName && f5.cleanName === m.cleanName) {
      matchType = 'SAME_PHONE_AND_NAME';
    } else if (f5.cleanName && m.cleanName && f5.cleanFather && m.cleanFather && 
               f5.cleanName === m.cleanName && f5.cleanFather === m.cleanFather && f5.cleanName.length >= 3) {
      matchType = 'SAME_NAME_AND_FATHER';
    }

    if (matchType) {
      matchedPairs.push({ matchType, f5, m });
    }
  }
}

console.log(`\nFound ${matchedPairs.length} potential matches with Master:`);
matchedPairs.forEach((p, idx) => {
  console.log(`\n[${idx + 1}] Type: ${p.matchType}`);
  console.log(`  File 5: Reg: ${p.f5.reg}, Name: "${p.f5.name}", Father: "${p.f5.father}", Phone: "${p.f5.phone}", Class: "${p.f5.cls}", Event: "${p.f5.comp}"`);
  console.log(`  Master: Reg: ${p.m.reg}, Name: "${p.m.name}", Father: "${p.m.father}", Phone: "${p.m.phone}", Class: "${p.m.cls}", Event: "${p.m.event}"`);
});
