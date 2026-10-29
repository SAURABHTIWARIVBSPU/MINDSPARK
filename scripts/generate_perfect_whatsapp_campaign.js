const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

console.log('================================================================================');
console.log('📱 GENERATING WHATSAPP CAMPAIGN (REMOVING WHATSAPP GROUP NAME & LINK COLUMNS)');
console.log('================================================================================\n');

const CAMPAIGN_DATE = '2026-10-29';
const ADMIT_CARD_URL = 'https://mindspark-src.vercel.app/';

const desktopDir = path.join('C:', 'Users', 'Saurabh Tiwari', 'Desktop', `WhatsApp_Campaign_Class_Wise_${CAMPAIGN_DATE}`);
const workspaceDir = path.resolve(`WhatsApp_Campaign_Class_Wise_${CAMPAIGN_DATE}`);

if (!fs.existsSync(desktopDir)) fs.mkdirSync(desktopDir, { recursive: true });
if (!fs.existsSync(workspaceDir)) fs.mkdirSync(workspaceDir, { recursive: true });

function norm(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// 1. Read the 3 source files
const f1 = 'CANDIDATE_DATA-9.xlsx';
const f2 = '27-10-2026.2.xlsx';
const f3 = 'SIR SYED I C (2).xlsx';

const wb1 = xlsx.readFile(f1);
const wb2 = xlsx.readFile(f2);
const wb3 = xlsx.readFile(f3);

const sourceRegs = new Set();
const sourceNameFathers = new Set();
const regToSource = new Map();
const nfToSource = new Map();

wb1.SheetNames.forEach(s => {
  const rows = xlsx.utils.sheet_to_json(wb1.Sheets[s]);
  rows.forEach(r => {
    const reg = String(r['RegiNo'] || r['Reg No'] || r['Registration No'] || '').trim().toUpperCase();
    if (reg) {
      sourceRegs.add(reg);
      regToSource.set(reg, 'CANDIDATE_DATA-9.xlsx');
    }
    const key = norm(r['Student Name']) + '|' + norm(r["Father's Name"]);
    if (key.length > 2) {
      sourceNameFathers.add(key);
      nfToSource.set(key, 'CANDIDATE_DATA-9.xlsx');
    }
  });
});

[ { file: '27-10-2026.2.xlsx', wb: wb2 }, { file: 'SIR SYED I C (2).xlsx', wb: wb3 } ].forEach(item => {
  const rows = xlsx.utils.sheet_to_json(item.wb.Sheets['Sheet1']);
  rows.forEach(r => {
    const reg = String(r['Registration No. '] || r['Registration No.'] || r['Registration '] || r['Registration'] || '').trim().toUpperCase();
    if (reg) {
      sourceRegs.add(reg);
      regToSource.set(reg, item.file);
    }
    const key = norm(r['Student Name']) + '|' + norm(r["Father's Name"]);
    if (key.length > 2) {
      sourceNameFathers.add(key);
      nfToSource.set(key, item.file);
    }
  });
});

// 2. Load Master Registry
const masterWb = xlsx.readFile('Master_All_Students_Registry.xlsx');
const allMasterStudents = xlsx.utils.sheet_to_json(masterWb.Sheets['Master All Students']);

const matchedStudents = [];
const seenRegs = new Set();

allMasterStudents.forEach(s => {
  const reg = String(s['Registration No'] || '').trim().toUpperCase();
  const key = norm(s['Student Name']) + '|' + norm(s["Father's Name"]);

  if (regToSource.has(reg) || nfToSource.has(key)) {
    if (!seenRegs.has(reg)) {
      seenRegs.add(reg);
      matchedStudents.push(s);
    }
  }
});

console.log(`Matched ${matchedStudents.length} candidates from the 3 files.\n`);

// 3. Strict Official Timetable & Lunch Break Lookup Function
function getOfficialTimetableSchedule(comp, cls, candidateIndex) {
  const normComp = String(comp || '').toUpperCase();
  const normCls = String(cls || '').toUpperCase();

  // 1. Play Group - Fancy Dress (MSPS Stage)
  if (normComp.includes('FANCY DRESS')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '10:30 AM',
      examTime: '11:00 AM ONWARDS',
      shiftBatch: 'All in 1 Batch',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS STAGE'
    };
  }

  // 2. Nursery - Colour by Number (MSPS 1st Floor)
  if (normComp.includes('COLOUR BY NUMBER')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '10:30 AM',
      examTime: '11:00 AM - 12:00 PM',
      shiftBatch: 'All in 1 Batch',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR'
    };
  }

  // 3. LKG - Join the Dots (MSPS 1st Floor)
  if (normComp.includes('JOIN THE DOTS')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '11:30 AM',
      examTime: '12:00 PM - 01:00 PM',
      shiftBatch: 'All in 1 Batch',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR'
    };
  }

  // 4. UKG - Complete the Picture (MSPS 1st Floor)
  if (normComp.includes('COMPLETE THE PICTURE') || normComp.includes('COMPLETE THE DOTS')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '12:30 PM',
      examTime: '01:00 PM - 02:00 PM',
      shiftBatch: 'All in 1 Batch',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR'
    };
  }

  // 5. Class 1 - Clay Champs (MSPS Music Room - 4 Batches)
  if (normComp.includes('CLAY CHAMPS')) {
    const batchNum = (candidateIndex % 4) + 1;
    const times = [
      { rep: '09:30 AM', exam: '10:00 AM - 11:00 AM' },
      { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM' },
      { rep: '11:30 AM', exam: '12:00 PM - 01:00 PM' },
      { rep: '12:30 PM', exam: '01:00 PM - 02:00 PM' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[batchNum - 1].rep,
      examTime: times[batchNum - 1].exam,
      shiftBatch: `Batch ${batchNum} of 4`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS MUSIC ROOM'
    };
  }

  // 6. Class 1 - Dress to Impress (MSPS Stage)
  if (normComp.includes('DRESS TO IMPRESS')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '11:30 AM',
      examTime: '12:00 PM ONWARDS',
      shiftBatch: 'All in 1 Batch',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS STAGE'
    };
  }

  // 7. Classes 2 & 3 - Paint Your Imagination (MSPS Library - 2 Shifts)
  if (normComp.includes('PAINT')) {
    const batchNum = (candidateIndex % 2) + 1;
    const times = [
      { rep: '09:30 AM', exam: '10:00 AM - 11:00 AM' },
      { rep: '11:00 AM', exam: '11:30 AM - 12:30 PM' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[batchNum - 1].rep,
      examTime: times[batchNum - 1].exam,
      shiftBatch: `Batch ${batchNum} of 2`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS LIBRARY'
    };
  }

  // 8. Classes 4 & 5 - Poster Artist (MSPS Library - 2 Shifts After Lunch)
  if (normComp.includes('POSTER ARTIST') || normComp.includes('POST ARTIST')) {
    const batchNum = (candidateIndex % 2) + 1;
    const times = [
      { rep: '02:00 PM', exam: '02:30 PM - 03:30 PM' },
      { rep: '03:30 PM', exam: '04:00 PM - 05:00 PM' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[batchNum - 1].rep,
      examTime: times[batchNum - 1].exam,
      shiftBatch: `Batch ${batchNum} of 2`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS LIBRARY'
    };
  }

  // 9. Classes 4 & 5 - Battle of Brains (MSPS 1st Floor)
  if (normComp.includes('BATTLE OF BRAIN')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '01:30 PM',
      examTime: '02:00 PM - 03:00 PM',
      shiftBatch: 'All in 1 Batch',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR'
    };
  }

  // 10. Classes 2 & 3 - Writing Stars (MSPS 1st Floor)
  if (normComp.includes('WRITING STAR')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '02:30 PM',
      examTime: '03:00 PM - 04:00 PM',
      shiftBatch: 'All in 1 Batch',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR'
    };
  }

  // 11. Classes 11 & 12 - Writing Quest (MSPS 1st Floor)
  if (normComp.includes('WRITING QUEST')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '03:30 PM',
      examTime: '04:00 PM - 05:00 PM',
      shiftBatch: 'All in 1 Batch',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR'
    };
  }

  // 12. Classes 6 to 8 - Fireless Cooking (Ground Floor Front of Music Room - 5 Shifts with Lunch 1-2 PM)
  if (normComp.includes('FIRELESS')) {
    const batchNum = (candidateIndex % 5) + 1;
    const times = [
      { rep: '08:30 AM', exam: '09:00 AM - 10:00 AM' },
      { rep: '09:30 AM', exam: '10:00 AM - 11:00 AM' },
      { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM' },
      { rep: '11:30 AM', exam: '12:00 PM - 01:00 PM' },
      // 01:00 PM - 02:00 PM Lunch Break
      { rep: '01:30 PM', exam: '02:00 PM - 03:00 PM' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[batchNum - 1].rep,
      examTime: times[batchNum - 1].exam,
      shiftBatch: `Batch ${batchNum} of 5`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'GROUND FLOOR (FRONT OF MUSIC ROOM)'
    };
  }

  // 13. Classes 9 & 10 - Young Innovators (Vacant Room 1st Floor - 4 Shifts with Lunch 1-2 PM)
  if (normComp.includes('YOUNG INNOVATOR')) {
    const batchNum = (candidateIndex % 4) + 1;
    const times = [
      { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM' },
      { rep: '11:30 AM', exam: '12:00 PM - 01:00 PM' },
      // 01:00 PM - 02:00 PM Lunch Break
      { rep: '01:30 PM', exam: '02:00 PM - 03:00 PM' },
      { rep: '02:30 PM', exam: '03:00 PM - 04:00 PM' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[batchNum - 1].rep,
      examTime: times[batchNum - 1].exam,
      shiftBatch: `Batch ${batchNum} of 4`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'VACANT ROOM 1st FLOOR'
    };
  }

  // 14. Classes 9 & 10 - Online Quiz (MSPS Lab - 5 Shifts with Lunch & Maintenance 12:30-2:00 PM)
  if (normComp.includes('ONLINE QUIZ') && (normCls === '9' || normCls === '10' || normCls === '9TH' || normCls === '10TH')) {
    const batchNum = (candidateIndex % 5) + 1;
    const times = [
      { rep: '08:00 AM', exam: '08:30 AM - 09:30 AM' },
      { rep: '09:00 AM', exam: '09:30 AM - 10:30 AM' },
      { rep: '10:00 AM', exam: '10:30 AM - 11:30 AM' },
      { rep: '11:00 AM', exam: '11:30 AM - 12:30 PM' },
      // 12:30 PM - 02:00 PM Lunch & Maintenance
      { rep: '01:30 PM', exam: '02:00 PM - 03:00 PM' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[batchNum - 1].rep,
      examTime: times[batchNum - 1].exam,
      shiftBatch: `Batch ${batchNum} of 5`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS LAB'
    };
  }

  // 15. Classes 11 & 12 - Online Quiz (MSITM Lab - 3 Shifts)
  if (normComp.includes('ONLINE QUIZ') && (normCls === '11' || normCls === '12' || normCls === '11TH' || normCls === '12TH')) {
    const batchNum = (candidateIndex % 3) + 1;
    const times = [
      { rep: '08:00 AM', exam: '08:30 AM - 09:30 AM' },
      { rep: '09:00 AM', exam: '09:30 AM - 10:30 AM' },
      { rep: '10:00 AM', exam: '10:30 AM - 11:30 AM' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[batchNum - 1].rep,
      examTime: times[batchNum - 1].exam,
      shiftBatch: `Batch ${batchNum} of 3`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSITM LAB'
    };
  }

  // 16. Junior Scientist (MSPS Ground - 9 Shifts with Lunch Break)
  if (normComp.includes('JUNIOR SCIENTIST')) {
    const shiftNum = (candidateIndex % 9) + 1;
    const times = [
      { rep: '08:30 AM', exam: '09:00 AM - 10:00 AM' },
      { rep: '09:30 AM', exam: '10:00 AM - 11:00 AM' },
      { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM' },
      { rep: '11:30 AM', exam: '12:00 PM - 01:00 PM' },
      // 01:00 PM - 02:00 PM Lunch Break
      { rep: '01:30 PM', exam: '02:00 PM - 03:00 PM' },
      { rep: '02:30 PM', exam: '03:00 PM - 04:00 PM' },
      { rep: '03:30 PM', exam: '04:00 PM - 05:00 PM' },
      { rep: '04:30 PM', exam: '05:00 PM - 06:00 PM' },
      { rep: '05:30 PM', exam: '06:00 PM - 07:00 PM' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[shiftNum - 1].rep,
      examTime: times[shiftNum - 1].exam,
      shiftBatch: `Shift ${shiftNum} of 9`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS GROUND'
    };
  }

  // 17. Graduation Online Quiz (MSITM Lab - 4 Batches on Monday, 02 Nov)
  if (normComp.includes('ONLINE QUIZ') && (normCls.includes('GRAD') || normCls.includes('COLLEGE') || normCls.includes('BBA') || normCls.includes('BCA') || normCls.includes('BSC') || normCls.includes('BA') || normCls.includes('B COM') || normCls.includes('MA'))) {
    const batchNum = (candidateIndex % 4) + 1;
    const times = [
      { rep: '08:30 AM', exam: '09:00 AM - 10:00 AM' },
      { rep: '09:30 AM', exam: '10:00 AM - 11:00 AM' },
      { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM' },
      // 12:00 PM - 01:00 PM Lunch Break
      { rep: '12:30 PM', exam: '01:00 PM - 02:00 PM' }
    ];
    return {
      examDate: '02 Nov 2026 (Monday)',
      reportingTime: times[batchNum - 1].rep,
      examTime: times[batchNum - 1].exam,
      shiftBatch: `Batch ${batchNum} of 4`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSITM LAB'
    };
  }

  // 18. Graduation Essay Writing (MSITM LT-2, LT-3 & LT-4 - 04:00 PM to 05:00 PM on 01 Nov)
  if (normComp.includes('ESSAY')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '03:30 PM',
      examTime: '04:00 PM - 05:00 PM',
      shiftBatch: 'All Batches (LT-2, LT-3 & LT-4)',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSITM LT-2, LT-3 & LT-4'
    };
  }

  // Fallback
  return {
    examDate: '01 Nov 2026 (Sunday)',
    reportingTime: '09:30 AM',
    examTime: '10:00 AM - 11:00 AM',
    shiftBatch: 'All in 1 Batch',
    campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
    specificHall: 'CAMPUS'
  };
}

// 4. Generate Personalized WhatsApp Message Text (No hardcoded group link - user adds manually if needed)
function generateWhatsAppMessage(s, sched) {
  const name = s['Student Name'] || 'Candidate';
  const regNo = s['Registration No'] || 'PENDING';
  const father = s["Father's Name"] || '';
  const school = s['School / College'] || 'MSPS Gonda';
  const cls = s['Class'] || '';
  const comp = s['Event Category'] || '';

  let specialNote = '';
  if (comp === 'ONLINE QUIZ' && (cls.includes('GRAD') || cls.includes('COLLEGE') || cls.includes('BBA') || cls.includes('BCA') || cls.includes('BSC') || cls.includes('BA') || cls.includes('B COM') || cls.includes('MA'))) {
    specialNote = `\n🎁 *SPECIAL ANNOUNCEMENT — GRADUATION LUCKY DRAW:*
All Graduation Online Quiz participants are cordially invited to the Lucky Draw Event on *Sunday, 01 Nov 2026 at 09:00 AM sharp* at MSITM Campus! (Your Quiz exam is scheduled on Monday, 02 Nov 2026).\n`;
  } else if (comp === 'ESSAY WRITING' && (cls.includes('GRAD') || cls.includes('COLLEGE') || cls.includes('BBA') || cls.includes('BCA') || cls.includes('BSC') || cls.includes('BA') || cls.includes('B COM') || cls.includes('MA'))) {
    specialNote = `\n🎁 *SPECIAL ANNOUNCEMENT — GRADUATION LUCKY DRAW:*
All Graduation Essay Writing participants are invited to the Lucky Draw Event on *Sunday, 01 Nov 2026 at 09:00 AM sharp* at MSITM Campus! (Your Essay Writing exam is on 01 Nov 2026, 04:00 PM - 05:00 PM).\n`;
  }

  return `🌟 *MIND SPARK 2026 — OFFICIAL CONFIRMATION* 🌟
*Meena Shah Public School, Gonda (U.P.)*

Dear *${name}* & Respected Parents,

Congratulations! Your registration for *MIND SPARK 2026* has been officially confirmed.

📋 *Registration No:* ${regNo}
👤 *Candidate Name:* ${name}
👨‍👧 *Father's Name:* ${father}
🏫 *School / College:* ${school}
🎓 *Class:* ${cls}
🏆 *Competition:* ${comp}

📅 *Examination Date:* ${sched.examDate}
⏰ *Reporting Time:* ${sched.reportingTime} (30 mins prior)
🎯 *Examination Timing:* ${sched.examTime} (${sched.shiftBatch})
📍 *Venue & Room:* ${sched.campusVenue} — ${sched.specificHall}
${specialNote}
🌐 *Download Official Admit Card Online:*
${ADMIT_CARD_URL}

*Important Examination Guidelines:*
1. Arrive strictly at the reporting time (${sched.reportingTime}).
2. Please carry a printed copy of your Admit Card or your Registration Number.
3. Bring required stationery (colours, pencils, clipboard, etc.).

Wish you the very best of success!
*Mind Spark 2026 Organizing Committee*
*Meena Shah Public School, Gonda*`;
}

// 5. Process & Transform Candidates (Strict Schema: Col 1 is 'number', Group Name & Link removed)
console.log('[3/5] Transforming candidates: Col 1 = number, Group Name & Link removed, Admit Card URL = mindspark-src.vercel.app...');

const compCounters = new Map();
const validRecords = [];
const invalidRecords = [];

matchedStudents.forEach((s, idx) => {
  const comp = s['Event Category'];
  const cls = s['Class'];

  const compKey = `${comp}__${cls}`;
  const cIndex = compCounters.get(compKey) || 0;
  compCounters.set(compKey, cIndex + 1);

  const sched = getOfficialTimetableSchedule(comp, cls, cIndex);

  const rawDigits = String(s['Phone Number'] || '').replace(/\D/g, '');
  const d10 = rawDigits.slice(-10);
  const is10Valid = d10.length === 10 && /^[6-9]\d{9}$/.test(d10);
  const e164Number = is10Valid ? `91${d10}` : (rawDigits.length >= 10 ? `91${d10}` : '');

  const personalizedMessage = generateWhatsAppMessage(s, sched);

  // Exact Clean Columns:
  // Col 1: number
  // Col 2: Candidate Name
  // Col 3: Registration Number ...
  // (Candidate S.No, WhatsApp Mobile, Official WhatsApp Group Name & Link REMOVED)
  const candidateObj = {
    'number': e164Number, // Column 1: direct E.164 phone
    'Candidate Name': s['Student Name'],
    'Registration Number': s['Registration No'],
    'Reg No Display': `Your Reg/No: ${s['Registration No']}`,
    "Father's Name": s["Father's Name"],
    'Class': s['Class'],
    'School / College Name': s['School / College'],
    'Event Category': s['Event Category'],
    'Examination Date': sched.examDate,
    'Reporting Time': sched.reportingTime,
    'Examination Time': sched.examTime,
    'Shift / Batch': sched.shiftBatch,
    'Campus / Venue': sched.campusVenue,
    'Specific Hall / Room': sched.specificHall,
    'Admit Card Portal Link': ADMIT_CARD_URL,
    'Personalized WhatsApp Message': personalizedMessage,
    'Campaign Batch Date': CAMPAIGN_DATE,
    'Campaign Dispatch Status': 'READY_FOR_DISPATCH'
  };

  if (is10Valid) {
    validRecords.push(candidateObj);
  } else {
    invalidRecords.push({
      ...candidateObj,
      'Invalid Phone Reason': rawDigits.length === 0 ? 'MISSING_PHONE' : `INVALID_DIGITS: ${s['Phone Number']}`
    });
  }
});

console.log(`      - Valid WhatsApp Campaign Recipients: ${validRecords.length}`);
console.log(`      - Excluded Invalid Phone Rows:         ${invalidRecords.length}\n`);

// 6. Group by Class
const classOrder = [
  'NURSERY',
  'LKG',
  'UKG',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  'GRADUATION'
];

const classGroups = new Map();
classOrder.forEach(c => classGroups.set(c, []));

validRecords.forEach(r => {
  let rawClass = String(r['Class'] || '').trim().toUpperCase();
  if (rawClass.includes('GRAD') || rawClass.includes('COLLEGE') || rawClass.includes('BBA') || rawClass.includes('BCA') || rawClass.includes('BSC') || rawClass.includes('BA') || rawClass.includes('B COM') || rawClass.includes('MA')) {
    rawClass = 'GRADUATION';
  } else if (rawClass === '23') {
    rawClass = '2';
  }
  if (!classGroups.has(rawClass)) {
    classGroups.set(rawClass, []);
  }
  classGroups.get(rawClass).push(r);
});

// 7. Build Consolidated Multi-Sheet Master Workbook
console.log('[4/5] Building Consolidated Multi-Sheet Master Campaign Workbook...');
const masterCampaignWb = xlsx.utils.book_new();

// Sheet A: Campaign Executive Summary
const summaryRows = [
  { 'Metric': 'Campaign Batch Date', 'Value': CAMPAIGN_DATE },
  { 'Metric': 'Official Admit Card Portal Link', 'Value': ADMIT_CARD_URL },
  { 'Metric': 'Total Valid Campaign Recipients', 'Value': validRecords.length },
  { 'Metric': 'Excluded Invalid Phone Rows', 'Value': invalidRecords.length },
  { 'Metric': 'Source Workbooks Integrated', 'Value': 'CANDIDATE_DATA-9.xlsx + 27-10-2026.2.xlsx + SIR SYED I C (2).xlsx' },
  { 'Metric': 'Schema Standard', 'Value': 'Col 1 = number | Candidate S.No Removed | Group Name & Link Removed | Invalid Rows Filtered' },
  { 'Metric': 'Timetable Directives', 'Value': 'Official Institutional Master: 30m Prior Reporting, Lunch Breaks & Official Room Allocations' },
  { 'Metric': '', 'Value': '' },
  { 'Metric': '--- CLASS-WISE CAMPAIGN RECIPIENT COUNTS ---', 'Value': '' }
];

classOrder.forEach(c => {
  const count = (classGroups.get(c) || []).length;
  if (count > 0) {
    summaryRows.push({
      'Metric': `Class: ${c}`,
      'Value': `${count} Candidates`
    });
  }
});

xlsx.utils.book_append_sheet(masterCampaignWb, xlsx.utils.json_to_sheet(summaryRows), 'Campaign Summary');

// Sheet B: All Valid Candidates Master
xlsx.utils.book_append_sheet(masterCampaignWb, xlsx.utils.json_to_sheet(validRecords), `All Candidates (${validRecords.length})`);

// Sheets C...: Individual Class Tabs
classOrder.forEach(c => {
  const list = classGroups.get(c) || [];
  if (list.length > 0) {
    const sheetTitle = `Class ${c} (${list.length})`.replace(/Class Class/i, 'Class');
    xlsx.utils.book_append_sheet(masterCampaignWb, xlsx.utils.json_to_sheet(list), sheetTitle.slice(0, 31));
  }
});

// Sheet D: Review - Excluded Invalid Phone Rows
if (invalidRecords.length > 0) {
  xlsx.utils.book_append_sheet(masterCampaignWb, xlsx.utils.json_to_sheet(invalidRecords), `Review Invalid Phones (${invalidRecords.length})`);
}

// Save consolidated workbook
const masterFileName = `WhatsApp_Campaign_New_Batch_${CAMPAIGN_DATE}.xlsx`;
const workspaceMasterPath = path.resolve(masterFileName);
const desktopMasterPath = path.join('C:', 'Users', 'Saurabh Tiwari', 'Desktop', masterFileName);

xlsx.writeFile(masterCampaignWb, workspaceMasterPath);
xlsx.writeFile(masterCampaignWb, desktopMasterPath);
console.log(`✅ Saved Consolidated Master in Workspace: ${workspaceMasterPath}`);
console.log(`✅ Saved Consolidated Master on Desktop:   ${desktopMasterPath}\n`);

// 8. Generate Individual Class-Wise Files in Folder
console.log('[5/5] Generating Individual Class-Wise Files with Column 1 = number (Group Name & Link removed)...');
const classFilesMetadata = [
  { key: 'NURSERY', fileName: `01_NURSERY_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Nursery Candidates' },
  { key: 'LKG', fileName: `02_LKG_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'LKG Candidates' },
  { key: 'UKG', fileName: `03_UKG_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'UKG Candidates' },
  { key: '1', fileName: `04_CLASS_1_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 1 Candidates' },
  { key: '2', fileName: `05_CLASS_2_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 2 Candidates' },
  { key: '3', fileName: `06_CLASS_3_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 3 Candidates' },
  { key: '4', fileName: `07_CLASS_4_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 4 Candidates' },
  { key: '5', fileName: `08_CLASS_5_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 5 Candidates' },
  { key: '6', fileName: `09_CLASS_6_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 6 Candidates' },
  { key: '7', fileName: `10_CLASS_7_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 7 Candidates' },
  { key: '8', fileName: `11_CLASS_8_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 8 Candidates' },
  { key: '9', fileName: `12_CLASS_9_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 9 Candidates' },
  { key: '10', fileName: `13_CLASS_10_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 10 Candidates' },
  { key: '11', fileName: `14_CLASS_11_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 11 Candidates' },
  { key: '12', fileName: `15_CLASS_12_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Class 12 Candidates' },
  { key: 'GRADUATION', fileName: `16_GRADUATION_CAMPAIGN_${CAMPAIGN_DATE}.xlsx`, sheetName: 'Graduation Candidates' }
];

// Write 00_ALL_NEW_CANDIDATES_MASTER
const allWb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(allWb, xlsx.utils.json_to_sheet(validRecords), `All Candidates (${validRecords.length})`);
const allFileName = `00_ALL_NEW_CANDIDATES_MASTER_${CAMPAIGN_DATE}.xlsx`;
xlsx.writeFile(allWb, path.join(workspaceDir, allFileName));
xlsx.writeFile(allWb, path.join(desktopDir, allFileName));

classFilesMetadata.forEach(meta => {
  const list = classGroups.get(meta.key) || [];
  if (list.length > 0) {
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(list), meta.sheetName);
    
    xlsx.writeFile(wb, path.join(workspaceDir, meta.fileName));
    xlsx.writeFile(wb, path.join(desktopDir, meta.fileName));
    console.log(`   📄 Created ${meta.fileName} (${list.length} valid recipients)`);
  }
});

console.log(`\n✅ Created all individual files in:`);
console.log(`   - Workspace: ${workspaceDir}`);
console.log(`   - Desktop:   ${desktopDir}`);

console.log('\n================================================================================');
console.log('🎉 WHATSAPP CAMPAIGN FILES FULLY REFRESHED (GROUP COLUMNS REMOVED)!');
console.log('================================================================================');
