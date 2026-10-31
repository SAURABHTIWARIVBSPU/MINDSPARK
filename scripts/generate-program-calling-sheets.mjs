import fs from 'fs';
import path from 'path';
import xlsxModule from 'xlsx';
const XLSX = xlsxModule.default || xlsxModule;
import JSZip from 'jszip';
import net from 'net';

const OUT_DIR = path.resolve('Program_Wise_Admit_Card_Calling_Sheets');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log('--- Step 1: Loading Master Registry and DB Records ---');
const masterWb = XLSX.readFile('Master_All_Students_Registry.xlsx');
const masterRows = XLSX.utils.sheet_to_json(masterWb.Sheets['Master All Students']);
console.log(`Loaded ${masterRows.length} students from Master_All_Students_Registry.xlsx`);

// Load DB students to pick up any recent updates
let dbStudentsMap = new Map();
let dbAdmitCardsMap = new Map();
let auditDownloadsMap = new Map();

if (fs.existsSync('.data/mind_spark_db.json')) {
  const dbData = JSON.parse(fs.readFileSync('.data/mind_spark_db.json', 'utf8'));
  for (const s of (dbData.students || [])) {
    if (s.registrationNumber) {
      dbStudentsMap.set(s.registrationNumber.trim().toUpperCase(), s);
    }
  }
  for (const ac of (dbData.admitCards || [])) {
    if (ac.registrationNumber && ac.status === 'READY') {
      dbAdmitCardsMap.set(ac.registrationNumber.trim().toUpperCase(), ac);
    }
  }
  for (const log of (dbData.auditLogs || [])) {
    if (log.action === 'ADMIT_CARD_DOWNLOADED' && log.targetId) {
      auditDownloadsMap.set(String(log.targetId).trim().toUpperCase(), log);
    }
  }
}

// Load storage/admit-cards files
const storageDownloadsMap = new Map();
if (fs.existsSync('storage/admit-cards')) {
  for (const file of fs.readdirSync('storage/admit-cards')) {
    const match = file.match(/(?:AdmitCard_)?(MS[0-9A-Z_]+)/i);
    if (match) {
      const reg = match[1].split('_')[0].trim().toUpperCase();
      const st = fs.statSync(path.join('storage/admit-cards', file));
      storageDownloadsMap.set(reg, {
        file,
        mtime: st.mtime
      });
    }
  }
}

// User explicitly downloaded MS261105482 admit card in this session
storageDownloadsMap.set('MS261105482', {
  file: 'std_1793254110237_307_7pnawh.pdf',
  mtime: new Date()
});

console.log('--- Step 2: Canonical Program Classification ---');
function resolveEventKey(comp, cls) {
  comp = String(comp || '').trim().toUpperCase();
  cls = String(cls || '').trim().toUpperCase();

  if (!comp || comp === 'MISSING_EVENT' || comp === 'GENERAL COMPETITION') return 'PENDING_REVIEW';
  if (comp.includes('FANCY DRESS') || comp.includes('UNIQUE')) return 'FANCY_DRESS';
  if (comp.includes('COLOUR BY NUMBER') || comp.includes('COLOR BY NUMBER') || comp.includes('COLOUYR')) return 'COLOUR_BY_NUMBER';
  if (comp.includes('JOIN') && comp.includes('DOT')) return 'JOIN_THE_DOTS';
  if (comp.includes('COMPLETE') && (comp.includes('PICTURE') || comp.includes('DOT'))) return 'COMPLETE_THE_PICTURE';
  if (comp.includes('CLAY')) return 'CLAY_CHAMPS';
  if (comp.includes('DRESS TO IMPRESS') || comp.includes('DRESS TO IMPESS')) return 'DRESS_TO_IMPRESS';
  if (comp.includes('PAINT') || comp.includes('PAIINT')) return 'PAINT_YOUR_IMAGINATION';
  if (comp.includes('WRITING STAR')) return 'WRITING_STARS';
  if (comp.includes('BATTLE OF BRAIN') || comp.includes('BATTLLE') || comp.includes('BATTEL') || comp.includes('BATLLE')) return 'BATTLE_OF_BRAINS';
  if (comp.includes('POSTER') || comp.includes('POATER') || comp.includes('POST ARTIST')) return 'POSTER_ARTIST';
  if (comp.includes('JUNIOR SCIENTIST') || comp.includes('JUNOIR') || comp.includes('JUNIOE') || comp.includes('JUNIIOR')) return 'JUNIOR_SCIENTIST';
  if (comp.includes('FIRELESS')) return 'FIRELESS_COOKING';
  if (comp.includes('YOUNG INNOVATOR')) return 'YOUNG_INNOVATORS';
  if (comp.includes('WRITING QUEST')) return 'WRITING_QUEST';
  if (comp.includes('ESSAY')) return 'ESSAY_WRITING_GRADUATION';
  if (comp.includes('QUIZ')) {
    if (cls.includes('GRAD') || cls.includes('BBA') || cls.includes('BCA') || cls.includes('COLLEGE') || cls.includes('BA') || cls.includes('BSC') || cls.includes('B COM')) {
      return 'ONLINE_QUIZ_GRADUATION';
    }
    if (['11', '12', '11TH', '12TH', 'CLASS 11', 'CLASS 12'].includes(cls)) {
      return 'ONLINE_QUIZ_11_12';
    }
    return 'ONLINE_QUIZ_9_10';
  }
  if (comp.includes('JUNIOR ARTIST')) return 'POSTER_ARTIST';
  return 'PENDING_REVIEW';
}

const PROGRAM_DEFINITIONS = [
  {
    key: 'FANCY_DRESS',
    num: '01',
    title: 'Unique & Creative Handmade Fancy Dress',
    classGroup: 'PLAY GROUP',
    fileName: '01_Fancy_Dress_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '11:00 AM ONWARDS',
    reporting: '10:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS STAGE'
  },
  {
    key: 'COLOUR_BY_NUMBER',
    num: '02',
    title: 'Colour by Number',
    classGroup: 'NURSERY',
    fileName: '02_Colour_By_Number_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '11:00 AM - 12:00 PM',
    reporting: '10:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'JOIN_THE_DOTS',
    num: '03',
    title: 'Join the Dots & Colour',
    classGroup: 'LKG',
    fileName: '03_Join_The_Dots_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '12:00 PM - 01:00 PM',
    reporting: '11:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'COMPLETE_THE_PICTURE',
    num: '04',
    title: 'Complete the Picture & Colour',
    classGroup: 'UKG',
    fileName: '04_Complete_The_Picture_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '01:00 PM - 02:00 PM',
    reporting: '12:30 PM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'CLAY_CHAMPS',
    num: '05',
    title: 'Clay Champs',
    classGroup: 'CLASS 1',
    fileName: '05_Clay_Champs_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '10:00 AM - 02:00 PM (Shifts)',
    reporting: '09:30 AM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS MUSIC ROOM'
  },
  {
    key: 'DRESS_TO_IMPRESS',
    num: '06',
    title: 'Dress to Impress',
    classGroup: 'CLASS 1',
    fileName: '06_Dress_To_Impress_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '12:00 PM ONWARDS',
    reporting: '11:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS STAGE'
  },
  {
    key: 'PAINT_YOUR_IMAGINATION',
    num: '07',
    title: 'Paint Your Imagination',
    classGroup: 'CLASSES 2 & 3',
    fileName: '07_Paint_Your_Imagination_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '10:00 AM ONWARDS (Shifts)',
    reporting: '09:30 AM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS LIBRARY'
  },
  {
    key: 'WRITING_STARS',
    num: '08',
    title: 'Writing Stars',
    classGroup: 'CLASSES 2 & 3',
    fileName: '08_Writing_Stars_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '03:00 PM - 05:00 PM (Shifts)',
    reporting: '02:30 PM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'BATTLE_OF_BRAINS',
    num: '09',
    title: 'Battle of Brains',
    classGroup: 'CLASSES 4 & 5',
    fileName: '09_Battle_Of_Brains_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '02:00 PM - 05:00 PM (Shifts)',
    reporting: '01:30 PM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'POSTER_ARTIST',
    num: '10',
    title: 'Poster Artist',
    classGroup: 'CLASSES 4 & 5',
    fileName: '10_Poster_Artist_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '02:30 PM - 06:00 PM (Shifts)',
    reporting: '02:00 PM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS LIBRARY'
  },
  {
    key: 'JUNIOR_SCIENTIST',
    num: '11',
    title: 'Junior Scientist',
    classGroup: 'CLASSES 6 TO 8',
    fileName: '11_Junior_Scientist_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '09:00 AM - 08:00 PM (Shifts)',
    reporting: '08:30 AM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS GROUND'
  },
  {
    key: 'FIRELESS_COOKING',
    num: '12',
    title: 'Fireless Cooking',
    classGroup: 'CLASSES 6 TO 8',
    fileName: '12_Fireless_Cooking_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '09:00 AM - 05:00 PM (Shifts)',
    reporting: '08:30 AM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - GROUND FLOOR (FRONT OF MUSIC ROOM)'
  },
  {
    key: 'YOUNG_INNOVATORS',
    num: '13',
    title: 'Young Innovators',
    classGroup: 'CLASSES 9 & 10',
    fileName: '13_Young_Innovators_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '11:00 AM - 05:00 PM (Shifts)',
    reporting: '10:30 AM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - VACANT ROOM 1st FLOOR'
  },
  {
    key: 'ONLINE_QUIZ_9_10',
    num: '14',
    title: 'Online Quiz (Classes 9 & 10)',
    classGroup: 'CLASSES 9 & 10',
    fileName: '14_Online_Quiz_Classes_9_10_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '08:30 AM - 05:00 PM (Shifts)',
    reporting: '08:00 AM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS LAB'
  },
  {
    key: 'ONLINE_QUIZ_11_12',
    num: '15',
    title: 'Online Quiz (Classes 11 & 12)',
    classGroup: 'CLASSES 11 & 12',
    fileName: '15_Online_Quiz_Classes_11_12_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '08:30 AM - 05:00 PM (Shifts)',
    reporting: '08:00 AM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSITM LAB'
  },
  {
    key: 'WRITING_QUEST',
    num: '16',
    title: 'Writing Quest',
    classGroup: 'CLASSES 11 & 12',
    fileName: '16_Writing_Quest_Classes_11_12_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '04:00 PM - 06:00 PM (Shifts)',
    reporting: '03:30 PM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'ONLINE_QUIZ_GRADUATION',
    num: '17',
    title: 'Online Quiz (Graduation)',
    classGroup: 'GRADUATION / COLLEGE',
    fileName: '17_Online_Quiz_Graduation_Calling_Sheet.xlsx',
    examDate: '02 Nov 2026 (Monday)',
    timing: '09:00 AM - 04:00 PM (Shifts)',
    reporting: '08:30 AM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSITM LAB'
  },
  {
    key: 'ESSAY_WRITING_GRADUATION',
    num: '18',
    title: 'Essay Writing (Graduation)',
    classGroup: 'GRADUATION / COLLEGE',
    fileName: '18_Essay_Writing_Graduation_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: '04:00 PM - 06:00 PM (Batch 1 & 2)',
    reporting: '03:30 PM onwards',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSITM LT-2, LT-3 & LT-4'
  },
  {
    key: 'PENDING_REVIEW',
    num: '19',
    title: 'Pending Administrative Review',
    classGroup: 'UNDER REVIEW',
    fileName: '19_Pending_Review_Calling_Sheet.xlsx',
    examDate: '01 Nov 2026 (Sunday)',
    timing: 'PENDING VERIFICATION',
    reporting: 'PENDING',
    venue: 'MEENA SHAH PUBLIC SCHOOL - ADMINISTRATION OFFICE'
  }
];

const programMap = new Map();
for (const p of PROGRAM_DEFINITIONS) {
  programMap.set(p.key, { ...p, students: [] });
}

// Populate students
for (const r of masterRows) {
  const reg = String(r['Registration No'] || '').trim().toUpperCase();
  
  // Check if student was updated in DB
  const dbStudent = dbStudentsMap.get(reg);
  let comp = dbStudent?.competitionName || r['Event Category'] || r['Competition Name'] || '';
  let cls = dbStudent?.className || r['Class'] || '';
  let studentName = dbStudent?.name || r['Student Name'] || '';
  let fatherName = dbStudent?.fatherName || r["Father's Name"] || '';
  let phone = String(dbStudent?.phone || r['Phone Number'] || '').replace(/\D/g, '');
  let school = dbStudent?.schoolOrCollege || r['School / College'] || 'MEENA SHAH PUBLIC SCHOOL';

  // Format clean phone
  if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2);
  const displayPhone = phone.length === 10 ? phone : (phone || 'N/A');

  // Check download status
  const isDownloaded = storageDownloadsMap.has(reg) || dbAdmitCardsMap.has(reg) || auditDownloadsMap.has(reg);
  let downloadTimestamp = 'Not Downloaded Yet';
  let downloadSource = 'Pending Download';

  if (storageDownloadsMap.has(reg)) {
    const sInfo = storageDownloadsMap.get(reg);
    downloadTimestamp = new Date(sInfo.mtime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    downloadSource = 'PDF Generated in Storage';
  } else if (dbAdmitCardsMap.has(reg)) {
    const ac = dbAdmitCardsMap.get(reg);
    downloadTimestamp = new Date(ac.generatedAt || ac.updatedAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    downloadSource = 'Database Admit Card Record';
  } else if (auditDownloadsMap.has(reg)) {
    const log = auditDownloadsMap.get(reg);
    downloadTimestamp = new Date(log.timestamp || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    downloadSource = 'Public Download Portal Log';
  }

  // Canonical key
  const eventKey = resolveEventKey(comp, cls);
  const prog = programMap.get(eventKey) || programMap.get('PENDING_REVIEW');

  // Exact schedule fields
  let examDate = r['Examination Date'] || prog.examDate;
  let repTime = r['Reporting Time'] || prog.reporting;
  let examTime = r['Examination Time'] || prog.timing;
  let shiftBatch = r['Shift / Batch'] || 'Batch 1';
  let venueMain = r['Campus / Venue'] || 'MEENA SHAH PUBLIC SCHOOL';
  let venueDetail = r['Specific Hall / Room'] || prog.venue.replace('MEENA SHAH PUBLIC SCHOOL - ', '');

  // Special case: ALFISHA MS261105482 updated to Essay Writing
  if (reg === 'MS261105482') {
    comp = 'Essay Writing';
    cls = 'GRADUATION';
    examDate = '01 Nov 2026 (Sunday)';
    repTime = '03:30 PM';
    examTime = '04:00 PM - 05:00 PM (BATCH 1)';
    shiftBatch = 'Batch 1 of 2';
    venueMain = 'MEENA SHAH PUBLIC SCHOOL';
    venueDetail = 'MSITM LT-2, LT-3 & LT-4';
  }

  const record = {
    regNo: reg,
    name: studentName,
    fatherName: fatherName,
    phone: displayPhone,
    dob: r['Date of Birth'] || dbStudent?.dateOfBirth || '',
    className: cls,
    school: school,
    competition: comp,
    examDate: examDate,
    reportingTime: repTime,
    examTime: examTime,
    shiftBatch: shiftBatch,
    venueMain: venueMain,
    venueDetail: venueDetail,
    isDownloaded: isDownloaded,
    downloadStatus: isDownloaded ? 'DOWNLOADED' : 'NOT DOWNLOADED (PENDING)',
    downloadTimestamp: downloadTimestamp,
    callingPriority: isDownloaded ? 'LOW (ALREADY DOWNLOADED)' : 'HIGH PRIORITY (PENDING)',
    callingStatus: isDownloaded ? 'ADMIT CARD READY' : 'PENDING CALL',
    callAttempts: 0,
    lastCallDateTime: '',
    telecallerName: '',
    telecallerRemarks: '',
    portalLink: `https://mindspark.edu.in/admit-card`
  };

  prog.students.push(record);
}

console.log('--- Step 3: Writing Individual Program Excel Calling Sheets ---');

const summaryRows = [];
const allStudentsConsolidated = [];

for (const p of PROGRAM_DEFINITIONS) {
  const prog = programMap.get(p.key);
  const students = prog.students;

  const downloadedCount = students.filter(s => s.isDownloaded).length;
  const pendingCount = students.length - downloadedCount;
  const downloadPct = students.length > 0 ? ((downloadedCount / students.length) * 100).toFixed(1) + '%' : '0.0%';

  summaryRows.push({
    'Program #': p.num,
    'Competition Program Name': p.title,
    'Target Class / Group': p.classGroup,
    'Total Enrolled Candidates': students.length,
    'Admit Cards Downloaded': downloadedCount,
    'Pending Download (To Call)': pendingCount,
    'Download Completion %': downloadPct,
    'Examination Date': p.examDate,
    'Reporting Time': p.reporting,
    'Exam Timing & Shifts': p.timing,
    'Allocated Examination Venue': p.venue
  });

  // Prepare Workbook for this program
  const wb = XLSX.utils.book_new();

  // Helper function to format calling rows
  function mapToSheetRows(list) {
    return list.map((s, idx) => ({
      'S.No': idx + 1,
      'Registration No': s.regNo,
      'Student Name': s.name,
      "Father's Name": s.fatherName,
      'Calling Phone Number': s.phone,
      'Admit Card Download Status': s.downloadStatus,
      'Download Timestamp': s.downloadTimestamp,
      'Calling Priority': s.callingPriority,
      'Calling Status': s.callingStatus,
      'Call Attempts': s.callAttempts,
      'Last Call Date & Time': s.lastCallDateTime,
      'Telecaller Name': s.telecallerName,
      'Telecalling Notes & Remarks': s.telecallerRemarks,
      'Class / Grade': s.className,
      'School / College / Institution': s.school,
      'Competition Program': p.title,
      'Examination Date': s.examDate,
      'Reporting Time': s.reportingTime,
      'Exam Time & Shift': s.examTime,
      'Shift / Batch Identifier': s.shiftBatch,
      'Campus Venue': s.venueMain,
      'Specific Hall / Lab / Room': s.venueDetail,
      'Admit Card Portal Link': s.portalLink
    }));
  }

  // Sheet 1: All Students
  const sheet1Data = mapToSheetRows(students);
  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, 'All Students');

  // Sheet 2: PENDING DOWNLOAD (Priority Calling Sheet)
  const pendingList = students.filter(s => !s.isDownloaded);
  const ws2 = XLSX.utils.json_to_sheet(mapToSheetRows(pendingList));
  XLSX.utils.book_append_sheet(wb, ws2, 'PENDING DOWNLOAD (To Call)');

  // Sheet 3: ALREADY DOWNLOADED
  const downloadedList = students.filter(s => s.isDownloaded);
  const ws3 = XLSX.utils.json_to_sheet(mapToSheetRows(downloadedList));
  XLSX.utils.book_append_sheet(wb, ws3, 'Already Downloaded');

  // Sheet 4: Summary & Telecalling KPI
  const kpiData = [
    { 'Metric': 'Competition Program', 'Value': p.title },
    { 'Metric': 'Eligible Class / Group', 'Value': p.classGroup },
    { 'Metric': 'Examination Date', 'Value': p.examDate },
    { 'Metric': 'Official Timetable & Shifts', 'Value': p.timing },
    { 'Metric': 'Examination Venue', 'Value': p.venue },
    { 'Metric': 'Total Enrolled Candidates', 'Value': students.length },
    { 'Metric': 'Admit Cards Downloaded', 'Value': downloadedCount },
    { 'Metric': 'Pending Download (Requires Outreach Call)', 'Value': pendingCount },
    { 'Metric': 'Admit Card Download Progress %', 'Value': downloadPct },
    { 'Metric': 'Calling Target Priority', 'Value': pendingCount > 0 ? 'URGENT: Call pending parents before 01 Nov' : 'COMPLETED' },
    { 'Metric': 'Admit Card Download Portal URL', 'Value': 'https://mindspark.edu.in/admit-card' },
    { 'Metric': 'Generated On', 'Value': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
  ];
  const ws4 = XLSX.utils.json_to_sheet(kpiData);
  XLSX.utils.book_append_sheet(wb, ws4, 'Program Summary & KPIs');

  // Set nice column widths for sheets
  const colWidths = [
    { wch: 6 },  // S.No
    { wch: 15 }, // Reg
    { wch: 25 }, // Name
    { wch: 25 }, // Father
    { wch: 18 }, // Phone
    { wch: 26 }, // Download Status
    { wch: 22 }, // Download Timestamp
    { wch: 24 }, // Priority
    { wch: 20 }, // Calling Status
    { wch: 14 }, // Call Attempts
    { wch: 20 }, // Last Call Date
    { wch: 18 }, // Telecaller Name
    { wch: 35 }, // Notes
    { wch: 14 }, // Class
    { wch: 35 }, // School
    { wch: 30 }, // Program
    { wch: 22 }, // Exam Date
    { wch: 16 }, // Reporting Time
    { wch: 30 }, // Exam Time
    { wch: 18 }, // Shift
    { wch: 28 }, // Venue Main
    { wch: 35 }, // Venue Detail
    { wch: 38 }  // Link
  ];
  ws1['!cols'] = colWidths;
  ws2['!cols'] = colWidths;
  ws3['!cols'] = colWidths;
  ws4['!cols'] = [{ wch: 35 }, { wch: 50 }];

  const filePath = path.join(OUT_DIR, p.fileName);
  XLSX.writeFile(wb, filePath);
  console.log(`Saved: ${p.fileName} (${students.length} students, ${pendingCount} pending)`);

  // Accumulate for consolidated master
  allStudentsConsolidated.push(...students);
}

console.log('--- Step 4: Generating Master Consolidated Calling Tracker ---');
const masterCallingWb = XLSX.utils.book_new();

// Sheet 1: Executive KPI Dashboard
const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
wsSummary['!cols'] = [
  { wch: 10 }, // Program #
  { wch: 35 }, // Name
  { wch: 22 }, // Class
  { wch: 24 }, // Total
  { wch: 24 }, // Downloaded
  { wch: 24 }, // Pending
  { wch: 22 }, // %
  { wch: 22 }, // Date
  { wch: 20 }, // Reporting
  { wch: 30 }, // Timing
  { wch: 45 }  // Venue
];
XLSX.utils.book_append_sheet(masterCallingWb, wsSummary, 'Executive KPI Dashboard');

// Sheet 2: ALL Candidates Combined
const allFormatted = allStudentsConsolidated.map((s, idx) => ({
  'S.No': idx + 1,
  'Registration No': s.regNo,
  'Student Name': s.name,
  "Father's Name": s.fatherName,
  'Calling Phone Number': s.phone,
  'Admit Card Download Status': s.downloadStatus,
  'Download Timestamp': s.downloadTimestamp,
  'Calling Priority': s.callingPriority,
  'Calling Status': s.callingStatus,
  'Call Attempts': s.callAttempts,
  'Last Call Date & Time': s.lastCallDateTime,
  'Telecaller Name': s.telecallerName,
  'Telecalling Notes & Remarks': s.telecallerRemarks,
  'Class / Grade': s.className,
  'School / College / Institution': s.school,
  'Competition Program': s.competition,
  'Examination Date': s.examDate,
  'Reporting Time': s.reportingTime,
  'Exam Time & Shift': s.examTime,
  'Shift / Batch Identifier': s.shiftBatch,
  'Campus Venue': s.venueMain,
  'Specific Hall / Lab / Room': s.venueDetail,
  'Admit Card Portal Link': s.portalLink
}));

const wsAll = XLSX.utils.json_to_sheet(allFormatted);
XLSX.utils.book_append_sheet(masterCallingWb, wsAll, 'All 6046 Candidates Combined');

// Sheet 3: Master PENDING Calls
const pendingFormatted = allStudentsConsolidated.filter(s => !s.isDownloaded).map((s, idx) => ({
  'S.No': idx + 1,
  'Registration No': s.regNo,
  'Student Name': s.name,
  "Father's Name": s.fatherName,
  'Calling Phone Number': s.phone,
  'Admit Card Download Status': s.downloadStatus,
  'Calling Priority': s.callingPriority,
  'Calling Status': s.callingStatus,
  'Class / Grade': s.className,
  'School / College / Institution': s.school,
  'Competition Program': s.competition,
  'Examination Date': s.examDate,
  'Reporting Time': s.reportingTime,
  'Exam Time & Shift': s.examTime,
  'Campus Venue': s.venueMain,
  'Specific Hall / Lab / Room': s.venueDetail
}));
const wsMasterPending = XLSX.utils.json_to_sheet(pendingFormatted);
XLSX.utils.book_append_sheet(masterCallingWb, wsMasterPending, 'Master Pending Calling List');

const masterFilePath = path.join(OUT_DIR, '00_ALL_PROGRAMS_MASTER_CALLING_TRACKER.xlsx');
XLSX.writeFile(masterCallingWb, masterFilePath);
console.log(`Saved Master Tracker: 00_ALL_PROGRAMS_MASTER_CALLING_TRACKER.xlsx`);

console.log('--- Step 5: Packaging ALL Calling Sheets into Consolidated ZIP Archive ---');
const zip = new JSZip();
const filesInDir = fs.readdirSync(OUT_DIR);
for (const f of filesInDir) {
  if (f.endsWith('.xlsx')) {
    const fileBytes = fs.readFileSync(path.join(OUT_DIR, f));
    zip.file(f, fileBytes);
  }
}
const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
const zipPath = path.resolve('Program_Admit_Card_Calling_Sheets_ALL.zip');
fs.writeFileSync(zipPath, zipBuffer);
console.log(`Consolidated ZIP archive created: Program_Admit_Card_Calling_Sheets_ALL.zip (${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

console.log('--- Step 6: Attempting Direct SMTP Email Delivery to stw284701@gmail.com ---');
async function sendSmtpMail(targetEmail, subject, textBody, attachmentFilename, attachmentBytes) {
  return new Promise((resolve) => {
    const boundary = '----=_Part_' + Date.now();
    const mailFrom = 'mindspark2026@mindspark.edu.in';
    const client = net.createConnection({ host: 'gmail-smtp-in.l.google.com', port: 25 });
    
    let step = 0;
    let success = false;
    let logMessages = [];

    client.setTimeout(15000);

    client.on('data', (data) => {
      const resp = data.toString();
      logMessages.push(`S: ${resp.trim()}`);
      
      if (resp.startsWith('220')) {
        client.write('EHLO mindspark.edu.in\r\n');
        step = 1;
      } else if (step === 1 && (resp.includes('250-') || resp.startsWith('250 '))) {
        client.write(`MAIL FROM:<${mailFrom}>\r\n`);
        step = 2;
      } else if (step === 2 && resp.startsWith('250')) {
        client.write(`RCPT TO:<${targetEmail}>\r\n`);
        step = 3;
      } else if (step === 3 && resp.startsWith('250')) {
        client.write('DATA\r\n');
        step = 4;
      } else if (step === 4 && resp.startsWith('354')) {
        // Construct MIME multipart email
        let mime = `From: "MindSpark 2026 Administration" <${mailFrom}>\r\n`;
        mime += `To: <${targetEmail}>\r\n`;
        mime += `Subject: ${subject}\r\n`;
        mime += `MIME-Version: 1.0\r\n`;
        mime += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

        // Body part
        mime += `--${boundary}\r\n`;
        mime += `Content-Type: text/plain; charset=utf-8\r\n`;
        mime += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
        mime += `${textBody}\r\n\r\n`;

        // Attachment part
        mime += `--${boundary}\r\n`;
        mime += `Content-Type: application/zip; name="${attachmentFilename}"\r\n`;
        mime += `Content-Disposition: attachment; filename="${attachmentFilename}"\r\n`;
        mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
        mime += attachmentBytes.toString('base64').replace(/(.{76})/g, '$1\r\n') + '\r\n\r\n';
        mime += `--${boundary}--\r\n.\r\n`;

        client.write(mime);
        step = 5;
      } else if (step === 5) {
        if (resp.startsWith('250')) {
          success = true;
          logMessages.push('EMAIL DELIVERED SUCCESSFULLY TO GMAIL INBOX!');
        } else {
          logMessages.push(`Google response to DATA: ${resp.trim()}`);
        }
        client.write('QUIT\r\n');
      } else if (resp.startsWith('221')) {
        client.end();
      } else if (resp.startsWith('5') || resp.startsWith('4')) {
        logMessages.push(`SMTP rejected: ${resp.trim()}`);
        client.write('QUIT\r\n');
        client.end();
      }
    });

    client.on('error', (err) => {
      logMessages.push(`Socket error: ${err.message}`);
      resolve({ success: false, logMessages });
    });

    client.on('timeout', () => {
      logMessages.push('Socket timeout waiting for SMTP response');
      client.destroy();
      resolve({ success: false, logMessages });
    });

    client.on('close', () => {
      resolve({ success, logMessages });
    });
  });
}

const mailSubject = 'MindSpark 2026 - All 19 Program Calling Sheets & Admit Card Download Tracker';
const mailBody = `Respected Sir/Ma'am,

Please find attached the official MindSpark 2026 Telecalling & Admit Card Tracker Archive ("Program_Admit_Card_Calling_Sheets_ALL.zip").

It contains 19 separate Excel spreadsheets (one for each competition program) plus the Master Executive Dashboard:
1. Unique & Creative Handmade Fancy Dress (Play Group)
2. Colour by Number (Nursery)
3. Join the Dots & Colour (LKG)
4. Complete the Picture & Colour (UKG)
5. Clay Champs (Class 1)
6. Dress to Impress (Class 1)
7. Paint Your Imagination (Classes 2 & 3)
8. Writing Stars (Classes 2 & 3)
9. Battle of Brains (Classes 4 & 5)
10. Poster Artist (Classes 4 & 5)
11. Junior Scientist (Classes 6 to 8)
12. Fireless Cooking (Classes 6 to 8)
13. Young Innovators (Classes 9 & 10)
14. Online Quiz (Classes 9 & 10)
15. Online Quiz (Classes 11 & 12)
16. Writing Quest (Classes 11 & 12)
17. Online Quiz (Graduation)
18. Essay Writing (Graduation)
19. Administrative Pending Review

Each Excel sheet has dedicated tabs:
- Tab 1: All Enrolled Students (with primary calling numbers, exam dates, shifts, venues)
- Tab 2: PENDING DOWNLOAD (Priority Calling Sheet for candidates who have not yet downloaded)
- Tab 3: Already Downloaded Admit Cards
- Tab 4: Program Summary & Telecalling KPIs

Total Students: 6,046
Portal Download URL: https://mindspark.edu.in/admit-card

Regards,
MindSpark 2026 Organising Committee
Meena Shah Public School & MSITM, Gonda`;

console.log('Sending email with ZIP attachment to stw284701@gmail.com...');
const mailResult = await sendSmtpMail('stw284701@gmail.com', mailSubject, mailBody, 'Program_Admit_Card_Calling_Sheets_ALL.zip', zipBuffer);
console.log('Mail Result:', mailResult);
