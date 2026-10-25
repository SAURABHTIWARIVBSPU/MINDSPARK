const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

const wb5 = XLSX.readFile(file5Path);
const wbMaster = XLSX.readFile(masterPath);

const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });
console.log(`Current Master Students Count: ${masterRows.length}`);

// Normalization functions
function parseDob(raw, className) {
  if (!raw) {
    if (className === 'UKG') return '2019-01-01';
    if (className === 'LKG') return '2020-01-01';
    if (className === 'NURSERY') return '2021-01-01';
    if (className === 'PLAY GROUP') return '2022-01-01';
    return '2010-01-01';
  }
  if (typeof raw === 'number') {
    const utc_days = Math.floor(raw - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const yyyy = date_info.getUTCFullYear();
    const mm = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date_info.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const str = String(raw).trim();
  const m1 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) {
    const dd = m1[1].padStart(2, '0');
    const mm = m1[2].padStart(2, '0');
    const yyyy = m1[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const m2 = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m2) {
    const yyyy = m2[1];
    const mm = m2[2].padStart(2, '0');
    const dd = m2[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return str || '2010-01-01';
}

function normalizeClass(raw, sheetName) {
  let s = String(raw || '').trim().toUpperCase();
  if (!s || s === 'CLASS') s = sheetName.toUpperCase();
  if (s === 'PLAY GROUP' || s === 'PLAYGROUP') return 'PLAY GROUP';
  if (s === 'NURSERY' || s === 'NUR') return 'NURSERY';
  if (s === 'LKG') return 'LKG';
  if (s === 'UKG') return 'UKG';
  if (s.includes('GRADUATION') || s.includes('BBA') || s.includes('BCA') || s.includes('COLLEGE')) return 'GRADUATION';
  const num = s.replace(/\D/g, '');
  if (num) return num;
  return s;
}

function normalizeCompetition(raw, sheetName) {
  const s = String(raw || '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (s.includes('COLOUR BY NUMBER') || s.includes('COLOR BY NUMBER')) return 'COLOUR BY NUMBER';
  if (s.includes('JOIN THE DOTS')) return 'JOIN THE DOTS AND COLOUR';
  if (s.includes('COMPLETE THE PICTURE')) return 'COMPLETE THE PICTURE AND COLOUR';
  if (s.includes('CLAY CHAMPS')) return 'CLAY CHAMPS';
  if (s.includes('DRESS TO IMPRESS') || s.includes('DREES TO IMPRESS')) return 'DRESS TO IMPRESS';
  if (s.includes('PAINT YOUR')) return 'PAINT YOUR IMAGINATION';
  if (s.includes('WRITING STARS')) return 'WRITING STARS';
  if (s.includes('POSTER ARTIST')) return 'POSTER ARTIST';
  if (s.includes('BATTLE OF BRAIN')) return 'BATTLE OF BRAINS';
  if (s.includes('FIRELESS')) return 'FIRELESS COOKING';
  if (s.includes('JUNIOR SCIENTIST') || s.includes('JUNIOR SCEINTIST')) return 'JUNIOR SCIENTIST';
  if (s.includes('ONLINE QUIZ') || s.includes('ONLIINE QUIZ')) return 'ONLINE QUIZ';
  if (s.includes('YOUNG INNOVAT')) return 'YOUNG INNOVATORS';
  if (s.includes('WRITING QUEST')) return 'WRITING QUEST';
  if (s.includes('ESSAY WRITING')) return 'ESSAY WRITING';
  if (s.includes('FANCY DRESS') || s.includes('HANDMADE FANCY')) return 'UNIQUE AND CREATIVE HANDMADE FANCY DRESS';
  return s;
}

// 1. Build master indexing
const masterRegSet = new Set();
const masterNameFatherEventSet = new Set();
const masterPhoneSet = new Set();

for (const m of masterRows) {
  const reg = String(m['Registration No'] || '').trim().toUpperCase();
  const name = String(m['Student Name'] || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const father = String(m["Father's Name"] || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const event = String(m['Event Category'] || '').trim().toUpperCase().replace(/\s+/g, ' ');
  const phone = String(m['Phone Number'] || '').replace(/\D/g, '').slice(-10);

  if (reg) masterRegSet.add(reg);
  if (name && father && event) masterNameFatherEventSet.add(`${name}:::${father}:::${event}`);
  if (phone && phone.length === 10) masterPhoneSet.add(phone);
}

// 2. Extract and inspect all rows from Candidate_data-5.xlsx
const extractedCandidates = [];
const excludedRecords = [];
const seenFile5Regs = new Set();
const seenFile5NameFatherEvent = new Set();

for (const sheetName of wb5.SheetNames) {
  const sheet = wb5.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  rows.forEach((r, idx) => {
    let reg = '', name = '', father = '', dob = '', aadhar = '', phone = '', school = '', cls = '', rawComp = '';
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
      else if (k.includes('(')) rawComp = vs;
    }

    const normClass = normalizeClass(cls, sheetName);
    const normEvent = normalizeCompetition(rawComp, sheetName);
    const cleanDob = parseDob(dob, normClass);
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const normName = name.toUpperCase().replace(/\s+/g, ' ');
    const normFather = father.toUpperCase().replace(/\s+/g, ' ');
    const normSchool = school.toUpperCase().replace(/\s+/g, ' ') || 'NOT SPECIFIED';

    const record = {
      sheetName,
      excelRow: idx + 2,
      reg,
      name: normName,
      father: normFather,
      dob: cleanDob,
      phone: cleanPhone || 'NOT SPECIFIED',
      school: normSchool,
      cls: normClass,
      event: normEvent,
      aadhar: aadhar.replace(/\D/g, ''),
      raw: r
    };

    // --- DEDUPLICATION RULES ---
    // Rule 1: Check duplicate registration number within File 5
    if (seenFile5Regs.has(reg)) {
      excludedRecords.push({
        record,
        reason: `Duplicate Registration No "${reg}" within Candidate_data-5.xlsx`
      });
      return;
    }

    // Rule 2: Check if exact same candidate (Name + Father + Event) already in Master
    const nameFatherEventKey = `${normName}:::${normFather}:::${normEvent}`;
    if (masterNameFatherEventSet.has(nameFatherEventKey)) {
      excludedRecords.push({
        record,
        reason: `Already registered in Master Students for identical event "${normEvent}"`
      });
      return;
    }

    // Rule 3: Check if exact same candidate (Name + Father + Event) appears twice within File 5
    if (seenFile5NameFatherEvent.has(nameFatherEventKey)) {
      excludedRecords.push({
        record,
        reason: `Duplicate submission for identical event "${normEvent}" within Candidate_data-5.xlsx`
      });
      return;
    }

    // Rule 4: Check if registration number already in Master
    if (masterRegSet.has(reg)) {
      excludedRecords.push({
        record,
        reason: `Registration No "${reg}" already exists in Master Students`
      });
      return;
    }

    // If passed all rules, candidate is unique and valid!
    seenFile5Regs.add(reg);
    seenFile5NameFatherEvent.add(nameFatherEventKey);
    extractedCandidates.push(record);
  });
}

console.log(`\n=== DEDUPLICATION & FILTERING SUMMARY ===`);
console.log(`Total rows in Candidate_data-5.xlsx: ${extractedCandidates.length + excludedRecords.length}`);
console.log(`Valid Unique Candidates to Add     : ${extractedCandidates.length}`);
console.log(`Excluded Duplicate Records         : ${excludedRecords.length}`);

console.log('\n--- DETAILED EXCLUDED RECORDS ---');
excludedRecords.forEach((ex, i) => {
  console.log(`\n[${i + 1}] Excluded: ${ex.record.reg} - ${ex.record.name} (Father: ${ex.record.father})`);
  console.log(`    Sheet: ${ex.record.sheetName}, Row: ${ex.record.excelRow}`);
  console.log(`    Event: ${ex.record.event}, Phone: ${ex.record.phone}`);
  console.log(`    Reason: ${ex.reason}`);
});

console.log('\n--- SAMPLE CLEAN CANDIDATES TO BE ADDED (FIRST 5) ---');
extractedCandidates.slice(0, 5).forEach((c, i) => {
  console.log(`[${i + 1}] Reg: ${c.reg} | Name: ${c.name} | Father: ${c.father} | Class: ${c.cls} | Event: ${c.event} | Phone: ${c.phone} | School: ${c.school}`);
});
