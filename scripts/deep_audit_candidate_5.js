const XLSX = require('xlsx');
const path = require('path');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

const wb5 = XLSX.readFile(file5Path);
const wbMaster = XLSX.readFile(masterPath);

const masterSheet = wbMaster.Sheets['Master Students'];
const masterRows = XLSX.utils.sheet_to_json(masterSheet, { defval: '' });

// Build master indexes
const masterByReg = new Map();
const masterByNameFather = new Map();
const masterByPhone = new Map();

for (const r of masterRows) {
  const reg = String(r['Registration No'] || '').trim().toUpperCase();
  const name = String(r['Student Name'] || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const father = String(r["Father's Name"] || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const phone = String(r['Phone Number'] || '').replace(/\D/g, '').slice(-10);

  if (reg) masterByReg.set(reg, r);
  if (name && father) {
    const key = `${name}:::${father}`;
    if (!masterByNameFather.has(key)) masterByNameFather.set(key, []);
    masterByNameFather.get(key).push(r);
  }
  if (phone && phone.length === 10) {
    if (!masterByPhone.has(phone)) masterByPhone.set(phone, []);
    masterByPhone.get(phone).push(r);
  }
}

// Inspect all sheets and columns in Candidate_data-5
const allRows = [];
const sheetStats = [];

for (const sheetName of wb5.SheetNames) {
  const sheet = wb5.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  sheetStats.push({ sheetName, count: rows.length, cols });

  rows.forEach((r, idx) => {
    // Detect Registration
    let reg = '';
    for (const k of Object.keys(r)) {
      if (k.toLowerCase().includes('reg') || k.toLowerCase().includes('registration')) {
        reg = String(r[k] || '').trim().toUpperCase();
        break;
      }
    }

    // Detect Name
    let name = '';
    for (const k of Object.keys(r)) {
      if (k.toLowerCase().includes('student') || k.toLowerCase().includes('candidate') || k.toLowerCase() === 'name') {
        name = String(r[k] || '').trim();
        break;
      }
    }

    // Detect Father Name
    let father = '';
    for (const k of Object.keys(r)) {
      if (k.toLowerCase().includes('father')) {
        father = String(r[k] || '').trim();
        break;
      }
    }

    // Detect DOB
    let dob = '';
    for (const k of Object.keys(r)) {
      if (k.toLowerCase().includes('dob') || k.toLowerCase().includes('birth')) {
        dob = r[k];
        break;
      }
    }

    // Detect Phone
    let phone = '';
    for (const k of Object.keys(r)) {
      if (k.toLowerCase().includes('contact') || k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile')) {
        phone = String(r[k] || '').trim();
        break;
      }
    }

    // Detect School
    let school = '';
    for (const k of Object.keys(r)) {
      if (k.toLowerCase().includes('school') || k.toLowerCase().includes('college') || k.toLowerCase().includes('institution')) {
        school = String(r[k] || '').trim();
        break;
      }
    }

    // Detect Class
    let cls = '';
    for (const k of Object.keys(r)) {
      if (k.trim().toLowerCase() === 'class' || k.trim().toLowerCase() === 'class ') {
        cls = String(r[k] || '').trim();
        break;
      }
    }
    if (!cls) cls = sheetName; // fallback to sheetName if class column absent

    // Detect Event / Competition
    let event = '';
    for (const k of Object.keys(r)) {
      const kl = k.toLowerCase();
      if (kl.includes('battle') || kl.includes('fireless') || kl.includes('quiz') || 
          kl.includes('writing') || kl.includes('essay') || kl.includes('poster') ||
          kl.includes('innovator') || kl.includes('event') || kl.includes('competition') ||
          kl.includes('category') || kl.includes('paint') || kl.includes('scientist')) {
        event = String(r[k] || '').trim();
        break;
      }
    }

    allRows.push({
      sheetName,
      rowIdx: idx + 2, // 1-indexed Excel row (header is 1)
      reg,
      name,
      father,
      dob,
      phone,
      school,
      cls,
      event,
      raw: r
    });
  });
}

console.log('=== 1. SHEET & COLUMN ANALYSIS ===');
for (const s of sheetStats) {
  console.log(`Sheet: "${s.sheetName}" | Rows: ${s.count}`);
  console.log(`  Columns:`, s.cols);
}

console.log('\n=== 2. FIELD VALIDATION & MISSING DATA AUDIT ===');
let missingReg = 0;
let missingName = 0;
let missingFather = 0;
let missingDob = 0;
let missingPhone = 0;
let missingSchool = 0;
let missingClass = 0;
let missingEvent = 0;

for (const r of allRows) {
  if (!r.reg) missingReg++;
  if (!r.name) missingName++;
  if (!r.father) missingFather++;
  if (!r.dob) missingDob++;
  if (!r.phone) missingPhone++;
  if (!r.school) missingSchool++;
  if (!r.cls) missingClass++;
  if (!r.event) missingEvent++;
}

console.log(`Total Rows Analyzed: ${allRows.length}`);
console.log(`Missing Registration No: ${missingReg}`);
console.log(`Missing Student Name   : ${missingName}`);
console.log(`Missing Father Name    : ${missingFather}`);
console.log(`Missing DOB            : ${missingDob}`);
console.log(`Missing Phone Number   : ${missingPhone}`);
console.log(`Missing School/College : ${missingSchool}`);
console.log(`Missing Class          : ${missingClass}`);
console.log(`Missing Event Category : ${missingEvent}`);

console.log('\n=== 3. INTERNAL DUPLICATE REGISTRATION NUMBERS IN CANDIDATE_DATA-5 ===');
const regMap = new Map();
const internalRegDups = [];
for (const r of allRows) {
  if (r.reg) {
    if (regMap.has(r.reg)) {
      internalRegDups.push({ reg: r.reg, row1: regMap.get(r.reg), row2: r });
    } else {
      regMap.set(r.reg, r);
    }
  }
}
console.log(`Total duplicate Registration numbers within Candidate_data-5: ${internalRegDups.length}`);
for (const d of internalRegDups) {
  console.log(`Duplicate Reg: ${d.reg}`);
  console.log(`  Row A: Sheet "${d.row1.sheetName}", Row ${d.row1.rowIdx}, Name: "${d.row1.name}", Father: "${d.row1.father}", Event: "${d.row1.event}"`);
  console.log(`  Row B: Sheet "${d.row2.sheetName}", Row ${d.row2.rowIdx}, Name: "${d.row2.name}", Father: "${d.row2.father}", Event: "${d.row2.event}"`);
}

console.log('\n=== 4. CROSS-CHECK WITH MASTER REGISTRY (NAME + FATHER MATCHES) ===');
const nameFatherCrossMatches = [];
for (const r of allRows) {
  const normName = r.name.toLowerCase().replace(/\s+/g, ' ');
  const normFather = r.father.toLowerCase().replace(/\s+/g, ' ');
  const key = `${normName}:::${normFather}`;
  const matches = masterByNameFather.get(key);
  if (matches && matches.length > 0) {
    nameFatherCrossMatches.push({ file5Row: r, masterMatch: matches[0] });
  }
}
console.log(`Candidates in Candidate_data-5 with identical (Name + Father's Name) in Master: ${nameFatherCrossMatches.length}`);
for (const m of nameFatherCrossMatches) {
  console.log(`Match:`);
  console.log(`  Candidate-5: Reg: ${m.file5Row.reg}, Name: "${m.file5Row.name}", Father: "${m.file5Row.father}", Event: "${m.file5Row.event}", Phone: "${m.file5Row.phone}", School: "${m.file5Row.school}"`);
  console.log(`  Master Reg : Reg: ${m.masterMatch['Registration No']}, Name: "${m.masterMatch['Student Name']}", Father: "${m.masterMatch["Father's Name"]}", Event: "${m.masterMatch['Event Category']}", Phone: "${m.masterMatch['Phone Number']}", School: "${m.masterMatch['School / College']}"`);
}
