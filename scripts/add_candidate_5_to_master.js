const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

console.log('================================================================');
console.log('  INTEGRATING CANDIDATE_DATA-5 INTO MASTER STUDENTS REGISTRY   ');
console.log('================================================================\n');

// 1. Safety Backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(process.cwd(), 'backups', `Master_All_Students_Registry_pre_data5_${timestamp}.xlsx`);
const localBakPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx.bak');

if (!fs.existsSync(path.join(process.cwd(), 'backups'))) {
  fs.mkdirSync(path.join(process.cwd(), 'backups'), { recursive: true });
}
fs.copyFileSync(masterPath, backupPath);
fs.copyFileSync(masterPath, localBakPath);
console.log(`[1/6] Created safety backups:`);
console.log(`      - ${backupPath}`);
console.log(`      - ${localBakPath}\n`);

// 2. Read Master & File 5
const wb5 = XLSX.readFile(file5Path);
const wbMaster = XLSX.readFile(masterPath);

const masterStudentsSheet = wbMaster.Sheets['Master Students'];
const existingMasterRows = XLSX.utils.sheet_to_json(masterStudentsSheet, { defval: '' });
console.log(`[2/6] Loaded existing Master Students: ${existingMasterRows.length} rows.`);

// Helper functions
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

// 3. Extract and Clean all rows from File 5
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

console.log(`[3/6] Extracted ${allFile5.length} raw rows from Candidate_data-5.xlsx.`);

// 4. Strict Deduplication
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

const cleanCandidates = [];
const excludedRecords = [];
const seenRegs = new Set();
const seenSignatures = new Set();

for (const r of allFile5) {
  const customId = `${r.sheet}_${r.reg}_row${r.rowIdx}`;
  const sheetRegId = `${r.sheet}_${r.reg}`;

  let excludeReason = null;

  if (knownDuplicatesToDrop.has(sheetRegId) || knownDuplicatesToDrop.has(customId) || knownDuplicatesToDrop.has(r.reg)) {
    excludeReason = `Explicitly verified duplicate`;
  } else if (seenRegs.has(r.reg)) {
    excludeReason = `Duplicate registration number "${r.reg}"`;
  } else {
    const sig = `${r.cleanName}:::${r.cleanFather}:::${r.event}`;
    if (sig.length > 5 && seenSignatures.has(sig)) {
      excludeReason = `Duplicate candidate for identical event "${r.event}"`;
    }
  }

  if (excludeReason) {
    excludedRecords.push({ ...r, reason: excludeReason });
  } else {
    seenRegs.add(r.reg);
    const sig = `${r.cleanName}:::${r.cleanFather}:::${r.event}`;
    if (sig.length > 5) seenSignatures.add(sig);
    cleanCandidates.push(r);
  }
}

console.log(`[4/6] Deduplication Complete:`);
console.log(`      - Excluded Duplicates: ${excludedRecords.length}`);
console.log(`      - Clean Unique Candidates: ${cleanCandidates.length}\n`);

// 5. Build Updated Master Sheets
console.log(`[5/6] Updating Master Workbook Sheets...`);

// A. Master Students
const startSNo = existingMasterRows.length + 1; // 2015
const newMasterStudentRows = cleanCandidates.map((c, idx) => ({
  'S.No': startSNo + idx,
  'Registration No': c.reg,
  'Student Name': c.name,
  "Father's Name": c.father,
  'Date of Birth': c.dob,
  'Phone Number': c.phone,
  'School / College': c.school,
  'Class': c.cls,
  'Event Category': c.event,
  'Status': 'ACTIVE',
  'WhatsApp Status': 'NOT_SENT',
}));

const combinedMasterStudents = [...existingMasterRows, ...newMasterStudentRows];
wbMaster.Sheets['Master Students'] = XLSX.utils.json_to_sheet(combinedMasterStudents);
console.log(`      - "Master Students": ${existingMasterRows.length} -> ${combinedMasterStudents.length} rows`);

// B. Online Quiz
if (wbMaster.Sheets['Online Quiz']) {
  const existingQuiz = XLSX.utils.sheet_to_json(wbMaster.Sheets['Online Quiz'], { defval: '' });
  const newQuiz = cleanCandidates
    .filter(c => c.event === 'ONLINE QUIZ')
    .map(c => ({
      'S.No': 0,
      'Registration No': c.reg,
      'Student Name': c.name,
      "Father's Name": c.father,
      'Date of Birth': c.dob,
      'Phone Number': c.phone,
      'School / College': c.school,
      'Class': c.cls,
      'Event Category': c.event,
      'Status': 'ACTIVE',
      'WhatsApp Status': 'NOT_SENT',
    }));
  const combinedQuiz = [...existingQuiz, ...newQuiz];
  combinedQuiz.forEach((r, idx) => r['S.No'] = idx + 1);
  wbMaster.Sheets['Online Quiz'] = XLSX.utils.json_to_sheet(combinedQuiz);
  console.log(`      - "Online Quiz": ${existingQuiz.length} -> ${combinedQuiz.length} rows (added ${newQuiz.length})`);
}

// C. Other Events
if (wbMaster.Sheets['Other Events']) {
  const existingOther = XLSX.utils.sheet_to_json(wbMaster.Sheets['Other Events'], { defval: '' });
  const newOther = cleanCandidates
    .filter(c => c.event !== 'ONLINE QUIZ')
    .map(c => ({
      'S.No': 0,
      'Registration No': c.reg,
      'Student Name': c.name,
      "Father's Name": c.father,
      'Date of Birth': c.dob,
      'Phone Number': c.phone,
      'School / College': c.school,
      'Class': c.cls,
      'Event Category': c.event,
      'Status': 'ACTIVE',
      'WhatsApp Status': 'NOT_SENT',
    }));
  const combinedOther = [...existingOther, ...newOther];
  combinedOther.forEach((r, idx) => r['S.No'] = idx + 1);
  wbMaster.Sheets['Other Events'] = XLSX.utils.json_to_sheet(combinedOther);
  console.log(`      - "Other Events": ${existingOther.length} -> ${combinedOther.length} rows (added ${newOther.length})`);
}

// D. Category Summary
if (wbMaster.Sheets['Category Summary']) {
  const summaryMap = {};
  combinedMasterStudents.forEach(r => {
    const cat = r['Event Category'] || 'UNKNOWN';
    summaryMap[cat] = (summaryMap[cat] || 0) + 1;
  });
  const summaryRows = Object.keys(summaryMap).sort().map(cat => ({
    'Category': cat,
    'Total Candidates': summaryMap[cat]
  }));
  wbMaster.Sheets['Category Summary'] = XLSX.utils.json_to_sheet(summaryRows);
  console.log(`      - "Category Summary": recalculated across ${summaryRows.length} competition categories`);
}

// E. Multiple Events
if (wbMaster.Sheets['Multiple Events']) {
  const multiEventCandidates = [
    {
      'Registration No': 'MS261102027',
      'Student Name': 'AHMAD NAWAF ANSARI',
      "Father's Name": 'IFTIKHAR AHMAD',
      'Class': '6',
      'Event Category': 'FIRELESS COOKING',
      'Note': 'Second Event (Also registered as MS261101250 in PAINT YOUR IMAGINATION)'
    },
    {
      'Registration No': 'MS261102338',
      'Student Name': 'YASHI MILIND',
      "Father's Name": 'SATISH KUMAR',
      'Class': '10',
      'Event Category': 'ONLINE QUIZ',
      'Note': 'Second Event (Also registered as MS261100608 in YOUNG INNOVATORS)'
    },
    {
      'Registration No': 'MS261102470',
      'Student Name': 'SHAISTA BANO',
      "Father's Name": 'MO KALEEM',
      'Class': '9',
      'Event Category': 'ONLINE QUIZ',
      'Note': 'Second Event (Also registered as MS261101963 in FIRELESS COOKING)'
    }
  ];
  wbMaster.Sheets['Multiple Events'] = XLSX.utils.json_to_sheet(multiEventCandidates);
  console.log(`      - "Multiple Events": indexed ${multiEventCandidates.length} cross-competition candidates`);
}

// 6. Save Workbook and Validate
XLSX.writeFile(wbMaster, masterPath);
console.log(`\n[6/6] Successfully written updated "${masterPath}"!`);

// Validation Reload
const reloadedWb = XLSX.readFile(masterPath);
const reloadedMaster = XLSX.utils.sheet_to_json(reloadedWb.Sheets['Master Students']);
console.log(`\n=== FINAL RE-READ VERIFICATION ===`);
console.log(`Reloaded Master Students Count: ${reloadedMaster.length} (Expected: 2885)`);
const uniqueRegs = new Set(reloadedMaster.map(r => r['Registration No']));
console.log(`Distinct Registration Numbers: ${uniqueRegs.size} (Expected: 2885)`);
const duplicatesInMaster = reloadedMaster.length - uniqueRegs.size;
console.log(`Duplicates in Master: ${duplicatesInMaster} (Expected: 0)`);

if (duplicatesInMaster === 0 && reloadedMaster.length === 2885) {
  console.log(`\n>>> VERIFICATION PASSED: ZERO DUPLICATES, PERFECT INTEGRITY! <<<`);
} else {
  console.error(`\n>>> INTEGRITY CHECK FAILED! <<<`);
  process.exit(1);
}
