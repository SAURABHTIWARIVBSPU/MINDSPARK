const XLSX = require('xlsx');
const path = require('path');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

const wb5 = XLSX.readFile(file5Path);
const wbMaster = XLSX.readFile(masterPath);

const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });

// 1. Collect all Candidate_data-5 rows
const rows5 = [];
for (const s of wb5.SheetNames) {
  const sheet = wb5.Sheets[s];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  data.forEach((r, idx) => {
    // Detect columns
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

    rows5.push({
      sheet: s,
      rowIdx: idx + 2,
      reg,
      name: name.toUpperCase().replace(/\s+/g, ' '),
      father: father.toUpperCase().replace(/\s+/g, ' '),
      dob,
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

console.log(`Total rows in Candidate_data-5: ${rows5.length}`);

// A. Check duplicate Aadhar numbers within Candidate_data-5 (where Aadhar is valid 12 digits)
const aadharMap5 = new Map();
const aadharDups5 = [];
for (const r of rows5) {
  if (r.aadhar && r.aadhar.length === 12) {
    if (aadharMap5.has(r.aadhar)) {
      aadharDups5.push({ aadhar: r.aadhar, row1: aadharMap5.get(r.aadhar), row2: r });
    } else {
      aadharMap5.set(r.aadhar, r);
    }
  }
}
console.log(`\nDuplicate Aadhar within Candidate_data-5: ${aadharDups5.length}`);
for (const d of aadharDups5) {
  console.log(`Aadhar: ${d.aadhar}`);
  console.log(`  Row 1: [${d.row1.sheet}] Reg: ${d.row1.reg}, Name: "${d.row1.name}", Father: "${d.row1.father}", Event: "${d.row1.event}"`);
  console.log(`  Row 2: [${d.row2.sheet}] Reg: ${d.row2.reg}, Name: "${d.row2.name}", Father: "${d.row2.father}", Event: "${d.row2.event}"`);
}

// B. Check duplicate (Name + Father + School) within Candidate_data-5
const nameFatherSchoolMap5 = new Map();
const nameFatherDups5 = [];
for (const r of rows5) {
  if (r.name && r.father) {
    const key = `${r.name}:::${r.father}:::${r.school}`;
    if (nameFatherSchoolMap5.has(key)) {
      nameFatherDups5.push({ key, row1: nameFatherSchoolMap5.get(key), row2: r });
    } else {
      nameFatherSchoolMap5.set(key, r);
    }
  }
}
console.log(`\nDuplicate (Name + Father + School) within Candidate_data-5: ${nameFatherDups5.length}`);
for (const d of nameFatherDups5) {
  console.log(`Duplicate Student in File 5:`);
  console.log(`  Row 1: [${d.row1.sheet}] Reg: ${d.row1.reg}, Name: "${d.row1.name}", Father: "${d.row1.father}", Event: "${d.row1.event}"`);
  console.log(`  Row 2: [${d.row2.sheet}] Reg: ${d.row2.reg}, Name: "${d.row2.name}", Father: "${d.row2.father}", Event: "${d.row2.event}"`);
}

// C. Check cross-match against Master Students (by Phone + Name similarity, or Aadhar)
const masterPhoneNameMap = new Map();
for (const m of masterRows) {
  const mName = String(m['Student Name'] || '').toUpperCase().trim().replace(/\s+/g, ' ');
  const mFather = String(m["Father's Name"] || '').toUpperCase().trim().replace(/\s+/g, ' ');
  const mPhone = String(m['Phone Number'] || '').replace(/\D/g, '').slice(-10);
  const mReg = String(m['Registration No'] || '').trim();
  const mEvent = String(m['Event Category'] || '').trim();
  const mSchool = String(m['School / College'] || '').trim();

  if (mPhone && mName) {
    masterPhoneNameMap.set(`${mPhone}:::${mName}`, { reg: mReg, name: mName, father: mFather, phone: mPhone, event: mEvent, school: mSchool });
  }
}

const crossMatchesPhoneName = [];
for (const r of rows5) {
  if (r.phone && r.name) {
    const key = `${r.phone}:::${r.name}`;
    if (masterPhoneNameMap.has(key)) {
      crossMatchesPhoneName.push({ file5: r, master: masterPhoneNameMap.get(key) });
    }
  }
}

console.log(`\nCross-matches with Master (Exact Phone + Name): ${crossMatchesPhoneName.length}`);
for (const c of crossMatchesPhoneName) {
  console.log(`Cross Match:`);
  console.log(`  Candidate-5: Reg: ${c.file5.reg}, Name: "${c.file5.name}", Father: "${c.file5.father}", Phone: "${c.file5.phone}", Event: "${c.file5.event}"`);
  console.log(`  Master Reg : Reg: ${c.master.reg}, Name: "${c.master.name}", Father: "${c.master.father}", Phone: "${c.master.phone}", Event: "${c.master.event}"`);
}
