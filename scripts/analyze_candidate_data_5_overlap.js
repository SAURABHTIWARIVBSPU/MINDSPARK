const XLSX = require('xlsx');
const path = require('path');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

const wb5 = XLSX.readFile(file5Path);
const wbMaster = XLSX.readFile(masterPath);

// 1. Extract all rows from Master Students
const masterSheet = wbMaster.Sheets['Master Students'];
const masterRows = XLSX.utils.sheet_to_json(masterSheet, { defval: '' });
console.log(`Loaded ${masterRows.length} rows from Master Students.`);

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

// 2. Extract all rows from CAndidate_data-5.xlsx
const file5Rows = [];
for (const sheetName of wb5.SheetNames) {
  const sheet = wb5.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  for (const r of rows) {
    // Detect reg column
    const reg = String(r['Regitrtion No'] || r['Registration'] || r['Registration No'] || '').trim().toUpperCase();
    const name = String(r['Student Name'] || '').trim();
    const father = String(r["Father's Name"] || '').trim();
    const dob = r['DOB'] || '';
    const aadhar = String(r['Aadhar Number'] || '').trim();
    const phone = String(r['Contact No.'] || r['Contact No'] || r['Phone'] || '').trim();
    const school = String(r['School Name'] || r['School / College'] || '').trim();
    const cls = String(r['Class '] || r['Class'] || '').trim();
    
    // Find competition column
    let comp = '';
    for (const k of Object.keys(r)) {
      if (k.toLowerCase().includes('battle') || k.toLowerCase().includes('fireless') || 
          k.toLowerCase().includes('quiz') || k.toLowerCase().includes('writing') || 
          k.toLowerCase().includes('essay') || k.toLowerCase().includes('poster') ||
          k.toLowerCase().includes('innovators')) {
        comp = String(r[k] || '').trim();
        break;
      }
    }

    file5Rows.push({
      sheetName,
      reg,
      name,
      father,
      dob,
      aadhar,
      phone,
      school,
      cls,
      comp,
      raw: r
    });
  }
}

console.log(`\nLoaded ${file5Rows.length} total rows from CAndidate_data-5.xlsx.`);

// 3. Check internal duplicates in CAndidate_data-5.xlsx
const file5RegMap = new Map();
const file5InternalDups = [];
for (const r of file5Rows) {
  if (r.reg) {
    if (file5RegMap.has(r.reg)) {
      file5InternalDups.push({ reg: r.reg, prev: file5RegMap.get(r.reg), curr: r });
    } else {
      file5RegMap.set(r.reg, r);
    }
  }
}
console.log(`\nInternal Duplicate Reg Numbers within CAndidate_data-5: ${file5InternalDups.length}`);

// 4. Cross-check against Master Students
let exactRegMatches = 0;
let exactNameFatherMatches = 0;
let phoneMatches = 0;
let completelyNew = 0;

const matchedByRegList = [];
const matchedByNameFatherList = [];
const completelyNewList = [];

for (const r of file5Rows) {
  const normName = r.name.toLowerCase().replace(/\s+/g, ' ');
  const normFather = r.father.toLowerCase().replace(/\s+/g, ' ');
  const nameFatherKey = `${normName}:::${normFather}`;
  const cleanPhone = r.phone.replace(/\D/g, '').slice(-10);

  const regMatch = r.reg ? masterByReg.get(r.reg) : null;
  const nameFatherMatch = masterByNameFather.get(nameFatherKey);

  if (regMatch) {
    exactRegMatches++;
    matchedByRegList.push({ file5: r, master: regMatch });
  } else if (nameFatherMatch && nameFatherMatch.length > 0) {
    exactNameFatherMatches++;
    matchedByNameFatherList.push({ file5: r, master: nameFatherMatch[0] });
  } else {
    completelyNew++;
    completelyNewList.push(r);
  }
}

console.log('\n=== CROSS-CHECK RESULTS (CAndidate_data-5 vs Master Students) ===');
console.log(`Total rows in Candidate_data-5      : ${file5Rows.length}`);
console.log(`Matching Master by Registration No : ${exactRegMatches}`);
console.log(`Matching Master by Name + Father   : ${exactNameFatherMatches}`);
console.log(`Completely New (No Reg/Name match) : ${completelyNew}`);

// Inspect registration number range in Candidate_data-5
const regs = file5Rows.map(r => r.reg).filter(Boolean);
regs.sort();
console.log(`\nReg Numbers in Candidate_data-5: count = ${regs.length}, min = ${regs[0]}, max = ${regs[regs.length - 1]}`);

// Inspect registration number range in Master Students
const masterRegs = masterRows.map(r => String(r['Registration No'] || '').trim()).filter(Boolean);
masterRegs.sort();
console.log(`Reg Numbers in Master Students: count = ${masterRegs.length}, min = ${masterRegs[0]}, max = ${masterRegs[masterRegs.length - 1]}`);

// Check what the exactRegMatches look like: are they identical records or modified?
if (matchedByRegList.length > 0) {
  console.log('\nSample comparison of first 3 matching records:');
  for (let i = 0; i < Math.min(3, matchedByRegList.length); i++) {
    const item = matchedByRegList[i];
    console.log(`Match ${i + 1} (${item.file5.reg}):`);
    console.log(`  Candidate-5: Name="${item.file5.name}", Father="${item.file5.father}", School="${item.file5.school}", Class="${item.file5.cls}", Event="${item.file5.comp}"`);
    console.log(`  Master Reg : Name="${item.master['Student Name']}", Father="${item.master["Father's Name"]}", School="${item.master['School / College']}", Class="${item.master['Class']}", Event="${item.master['Event Category']}"`);
  }
}
