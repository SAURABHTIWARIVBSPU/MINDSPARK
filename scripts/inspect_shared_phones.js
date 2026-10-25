const XLSX = require('xlsx');
const path = require('path');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

const wb5 = XLSX.readFile(file5Path);
const wbMaster = XLSX.readFile(masterPath);

const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });

// Build master phone map
const masterPhoneMap = new Map();
for (const m of masterRows) {
  const p = String(m['Phone Number'] || '').replace(/\D/g, '').slice(-10);
  if (p && p.length === 10) {
    if (!masterPhoneMap.has(p)) masterPhoneMap.set(p, []);
    masterPhoneMap.get(p).push(m);
  }
}

// Build file 5 phone map
const file5PhoneMap = new Map();
const file5AllRows = [];

for (const s of wb5.SheetNames) {
  const data = XLSX.utils.sheet_to_json(wb5.Sheets[s], { defval: '' });
  data.forEach((r, idx) => {
    let reg = '', name = '', father = '', phone = '', cls = '', event = '', school = '', dob = '';
    for (const [k, v] of Object.entries(r)) {
      const kl = k.toLowerCase();
      const vs = String(v).trim();
      if (kl.includes('reg')) reg = vs.toUpperCase();
      else if (kl.includes('student') || kl === 'name') name = vs;
      else if (kl.includes('father')) father = vs;
      else if (kl.includes('contact') || kl.includes('phone') || kl.includes('mobile')) phone = vs;
      else if (kl.includes('school') || kl.includes('college')) school = vs;
      else if (kl.trim() === 'class' || kl.trim() === 'class ') cls = vs;
      else if (k.includes('(')) event = vs;
      else if (kl.includes('dob')) dob = v;
    }
    if (!cls) cls = s;
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    const obj = {
      sheet: s,
      rowIdx: idx + 2,
      reg,
      name,
      father,
      phone: cleanPhone,
      rawPhone: phone,
      school,
      cls,
      event,
      dob,
      raw: r
    };

    file5AllRows.push(obj);
    if (cleanPhone && cleanPhone.length === 10) {
      if (!file5PhoneMap.has(cleanPhone)) file5PhoneMap.set(cleanPhone, []);
      file5PhoneMap.get(cleanPhone).push(obj);
    }
  });
}

console.log(`Total rows in Candidate_data-5: ${file5AllRows.length}`);

// 1. Shared phones with Master
const sharedWithMaster = [];
for (const [phone, f5List] of file5PhoneMap.entries()) {
  if (masterPhoneMap.has(phone)) {
    const mList = masterPhoneMap.get(phone);
    sharedWithMaster.push({ phone, f5List, mList });
  }
}

console.log(`\n=== PHONE NUMBERS SHARED WITH MASTER REGISTRY ===`);
console.log(`Total shared phone numbers: ${sharedWithMaster.length}`);
for (const item of sharedWithMaster) {
  console.log(`\nPhone: ${item.phone}`);
  console.log(`  Candidate_data-5 (${item.f5List.length} rows):`);
  item.f5List.forEach(f => console.log(`    - Reg: ${f.reg}, Name: "${f.name}", Father: "${f.father}", Class: "${f.cls}", Event: "${f.event}"`));
  console.log(`  Master Students (${item.mList.length} rows):`);
  item.mList.forEach(m => console.log(`    - Reg: ${m['Registration No']}, Name: "${m['Student Name']}", Father: "${m["Father's Name"]}", Class: "${m['Class']}", Event: "${m['Event Category']}"`));
}

// 2. Shared phones within Candidate_data-5
const internalSharedPhones = [];
for (const [phone, f5List] of file5PhoneMap.entries()) {
  if (f5List.length > 1) {
    internalSharedPhones.push({ phone, f5List });
  }
}

console.log(`\n=== PHONE NUMBERS SHARED WITHIN CANDIDATE_DATA-5 ===`);
console.log(`Total phone numbers appearing multiple times in file 5: ${internalSharedPhones.length}`);
for (const item of internalSharedPhones.slice(0, 15)) {
  console.log(`\nPhone: ${item.phone} (${item.f5List.length} students)`);
  item.f5List.forEach(f => console.log(`    - Sheet: [${f.sheet}] Reg: ${f.reg}, Name: "${f.name}", Father: "${f.father}", Class: "${f.cls}", Event: "${f.event}"`));
}
