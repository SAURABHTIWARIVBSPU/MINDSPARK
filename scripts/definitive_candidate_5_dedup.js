const XLSX = require('xlsx');
const path = require('path');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

const wb5 = XLSX.readFile(file5Path);
const wbMaster = XLSX.readFile(masterPath);

const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });

function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '').slice(-10);
}

function cleanText(str) {
  return String(str || '')
    .toUpperCase()
    .replace(/\b(MR|MRS|MD|MOHD|MOHAMMAD|MOHAMED|SHEIKH|SHAIKH|KUMAR|PRASAD|SINGH|VERMA|KHAN|ANSARI)\b/g, '')
    .replace(/[^A-Z]/g, '');
}

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

// 1. Collect all rows from Candidate_data-5 in sheet order
const allFile5 = [];
for (const s of wb5.SheetNames) {
  const data = XLSX.utils.sheet_to_json(wb5.Sheets[s], { defval: '' });
  data.forEach((r, idx) => {
    let reg = '', name = '', father = '', dob = '', aadhar = '', phone = '', school = '', cls = '', comp = '';
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
      else if (k.includes('(')) comp = vs;
    }

    const normClass = normalizeClass(cls, s);
    const normEvent = normalizeCompetition(comp, s);
    const cleanDob = parseDob(dob, normClass);
    const cleanPhone = normalizePhone(phone);
    const normName = name.toUpperCase().replace(/\s+/g, ' ');
    const normFather = father.toUpperCase().replace(/\s+/g, ' ');
    const normSchool = school.toUpperCase().replace(/\s+/g, ' ') || 'NOT SPECIFIED';

    allFile5.push({
      sheet: s,
      rowIdx: idx + 2,
      reg,
      name: normName,
      father: normFather,
      phone: cleanPhone || 'NOT SPECIFIED',
      dob: cleanDob,
      school: normSchool,
      cls: normClass,
      event: normEvent,
      aadhar: aadhar.replace(/\D/g, ''),
      cleanName: cleanText(normName),
      cleanFather: cleanText(normFather)
    });
  });
}

// 2. Perform definitive deduplication
const cleanList = [];
const excludedList = [];

// Specific known duplicate IDs/signatures
const knownDuplicatesToDrop = new Set([
  'LKG_MS261102883', // Erroneous LKG entry for Class 5 Mohd Hussainn
  'Class 4 to Class 5_MS261102883_row94', // Identical row 94 in Class 4-5
  'Class 11 to Class 12_MS261102824_row212', // Identical row 212 in Class 11-12
  'MS261102768', // Duplicate Shivani Agarwal (row 178)
  'MS261102788', // Duplicate Aashika Jain (row 193)
  'MS261102616', // Duplicate Hifza Khan (already MS261101908 in Master)
  'MS261102636', // Duplicate Hifza Khan (already MS261101908 in Master)
  'MS261102692', // Duplicate Areeb Khan (already MS261100621 in Master)
  'MS261102361', // Duplicate Ashfiya Ansari (already MS261100695 in Master)
]);

const seenRegs = new Set();
const seenSignatures = new Set();

for (const r of allFile5) {
  // Construct identifiers
  const customId = `${r.sheet}_${r.reg}_row${r.rowIdx}`;
  const sheetRegId = `${r.sheet}_${r.reg}`;

  let excludeReason = null;

  if (knownDuplicatesToDrop.has(sheetRegId) || knownDuplicatesToDrop.has(customId) || knownDuplicatesToDrop.has(r.reg)) {
    excludeReason = `Explicitly verified duplicate`;
  } else if (seenRegs.has(r.reg)) {
    excludeReason = `Duplicate registration number "${r.reg}"`;
  } else {
    // Check if duplicate of an already processed clean record
    const sig = `${r.cleanName}:::${r.cleanFather}:::${r.event}`;
    if (sig.length > 5 && seenSignatures.has(sig)) {
      excludeReason = `Duplicate candidate for identical event "${r.event}"`;
    }
  }

  if (excludeReason) {
    excludedList.push({ ...r, reason: excludeReason });
  } else {
    seenRegs.add(r.reg);
    const sig = `${r.cleanName}:::${r.cleanFather}:::${r.event}`;
    if (sig.length > 5) seenSignatures.add(sig);
    cleanList.push(r);
  }
}

console.log(`\nDEFINITIVE AUDIT TOTALS:`);
console.log(`Original Input Rows: ${allFile5.length}`);
console.log(`Excluded Duplicates: ${excludedList.length}`);
console.log(`Clean Unique Candidates: ${cleanList.length}`);

console.log(`\nList of Excluded Records (${excludedList.length}):`);
excludedList.forEach((ex, i) => {
  console.log(`[${i+1}] ${ex.reg} - ${ex.name} (Father: ${ex.father}) | Sheet: [${ex.sheet}, row ${ex.rowIdx}] | Event: ${ex.event} | Reason: ${ex.reason}`);
});

// Check cleanList registration number uniqueness
const cleanRegSet = new Set(cleanList.map(c => c.reg));
console.log(`\nUniqueness Check: Clean records = ${cleanList.length}, Distinct Regs = ${cleanRegSet.size} (Must match exactly!)`);

// Secondary sanity checks on cleanList
console.log('\n--- SECONDARY VERIFICATION CHECKS ON CLEAN CANDIDATE LIST ---');
// 1. Same Aadhar check
const aadharCounts = {};
cleanList.forEach(c => {
  if (c.aadhar && c.aadhar.length === 12) {
    aadharCounts[c.aadhar] = (aadharCounts[c.aadhar] || 0) + 1;
  }
});
const multiAadhars = Object.entries(aadharCounts).filter(([_, count]) => count > 1);
console.log(`Clean candidates sharing Aadhar: ${multiAadhars.length}`);
multiAadhars.forEach(([aadhar, count]) => {
  const matches = cleanList.filter(c => c.aadhar === aadhar);
  console.log(`  Aadhar ${aadhar} (${count} students):`, matches.map(m => `${m.name} (${m.father}, Class ${m.cls})`).join(' vs '));
});

module.exports = { cleanList, excludedList };
