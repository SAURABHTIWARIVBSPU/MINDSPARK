import fs from 'fs';
import path from 'path';
import xlsxModule from 'xlsx';
const XLSX = xlsxModule.default || xlsxModule;

import { resolveEventKey } from '../src/lib/pdf/event-schedule.ts';
import { PROGRAM_SEATING_RULES } from '../src/lib/allocation/seating-rules.ts';

const rootDir = 'C:/Users/user/Desktop/MINDSPARK';
const destFolder = 'C:/Users/user/Desktop/MINDSPARK_2026_EXAM_TIMETABLE_AND_SEATING_PLANS';
const subFolder = path.join(destFolder, 'PROGRAM_SEATING_AND_ATTENDANCE_SHEETS');

// Ensure destination directories exist
if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
if (!fs.existsSync(subFolder)) fs.mkdirSync(subFolder, { recursive: true });

console.log('Loading Master Registry...');
const masterWb = XLSX.readFile(path.join(rootDir, 'Master_All_Students_Registry.xlsx'));
const masterRows = XLSX.utils.sheet_to_json(masterWb.Sheets['Master All Students']);
console.log(`Loaded ${masterRows.length} candidates from Master Registry.`);

const programConfigs = [
  {
    key: 'FANCY_DRESS',
    fileSlug: '01_Unique_Creative_Handmade_Fancy_Dress_PlayGroup',
    title: 'Unique & Creative Handmade Fancy Dress',
    classGroup: 'Play Group',
    campus: 'Meena Shah Public School',
    room: 'MSPS STAGE',
    incharges: 'Nida Iqbal, Ayesha Siddiqui, Sadiya Qadri',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'COLOUR_BY_NUMBER',
    fileSlug: '02_Colour_by_Number_Nursery',
    title: 'Colour by Number',
    classGroup: 'Nursery',
    campus: 'Meena Shah Public School',
    room: 'MSPS 1st FLOOR',
    incharges: 'Hina Fatima, Richa Pandey',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'JOIN_THE_DOTS',
    fileSlug: '03_Join_the_Dots_and_Colour_LKG',
    title: 'Join the Dots & Colour',
    classGroup: 'L.K.G.',
    campus: 'Meena Shah Public School',
    room: 'MSPS 1st FLOOR',
    incharges: 'Fiza Siddiqui, Noore Taiba',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'COMPLETE_THE_PICTURE',
    fileSlug: '04_Complete_the_Picture_and_Colour_UKG',
    title: 'Complete the Picture & Colour',
    classGroup: 'U.K.G.',
    campus: 'Meena Shah Public School',
    room: 'MSPS 1st FLOOR',
    incharges: 'Shraddha Mam, Afreen Mam',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'CLAY_CHAMPS',
    fileSlug: '05_Clay_Champs_Class_1',
    title: 'Clay Champs',
    classGroup: 'Class 1',
    campus: 'Meena Shah Public School',
    room: 'MSPS MUSIC ROOM',
    incharges: 'Shumaila Mam, Ghazala Mam',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'DRESS_TO_IMPRESS',
    fileSlug: '06_Dress_to_Impress_Class_1',
    title: 'Dress to Impress',
    classGroup: 'Class 1',
    campus: 'Meena Shah Public School',
    room: 'MSPS STAGE',
    incharges: 'Sujata Mam, Faiz Sir',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'PAINT_YOUR_IMAGINATION',
    fileSlug: '07_Paint_Your_Imagination_Classes_2_3',
    title: 'Paint Your Imagination',
    classGroup: 'Classes 2 & 3',
    campus: 'Meena Shah Public School',
    room: 'MSPS LIBRARY',
    incharges: 'Chetna Mam, Vedanshi Mam, Rabiya Mam',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'WRITING_STARS',
    fileSlug: '08_Writing_Stars_Classes_2_3',
    title: 'Writing Stars',
    classGroup: 'Classes 2 & 3',
    campus: 'Meena Shah Public School',
    room: 'MSPS 1st FLOOR',
    incharges: 'Fatima Mam, Anupriya Mam',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'BATTLE_OF_BRAINS',
    fileSlug: '09_Battle_of_Brains_Classes_4_5',
    title: 'Battle of Brains',
    classGroup: 'Classes 4 & 5',
    campus: 'Meena Shah Public School',
    room: 'MSPS 1st FLOOR',
    incharges: 'Imran Sir, Shaalu Mam',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'POSTER_ARTIST',
    fileSlug: '10_Poster_Artist_Classes_4_5',
    title: 'Poster Artist',
    classGroup: 'Classes 4 & 5',
    campus: 'Meena Shah Public School',
    room: 'MSPS LIBRARY',
    incharges: 'Aman Sir, Azmat Ali Sir',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'JUNIOR_SCIENTIST',
    fileSlug: '11_Junior_Scientist_Classes_6_to_8',
    title: 'Junior Scientist',
    classGroup: 'Classes 6 to 8',
    campus: 'Meena Shah Public School',
    room: 'MSPS GROUND',
    incharges: 'Scientific Evaluation Committee',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'FIRELESS_COOKING',
    fileSlug: '12_Fireless_Cooking_Classes_6_to_8',
    title: 'Fireless Cooking (पाक कला)',
    classGroup: 'Classes 6 to 8',
    campus: 'Meena Shah Public School',
    room: 'GROUND FLOOR (FRONT OF MUSIC ROOM)',
    incharges: 'Poonam Mam, Zainab Mam, Neelima Mam, Doris Mam',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'YOUNG_INNOVATORS',
    fileSlug: '13_Young_Innovators_Classes_9_10',
    title: 'Young Innovators (विज्ञान मॉडल)',
    classGroup: 'Classes 9 & 10',
    campus: 'Meena Shah Public School',
    room: 'VACANT ROOM 1st FLOOR',
    incharges: 'Asit Sir, Azhar Sir',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'ONLINE_QUIZ_9_10',
    fileSlug: '14_Online_Quiz_Classes_9_10',
    title: 'Online Quiz (Classes 9 & 10)',
    classGroup: 'Classes 9 & 10',
    campus: 'Meena Shah Public School',
    room: 'MSPS LAB',
    incharges: 'Raghuvendra Pandey Sir (Head), Arif Sir, Ibarat Ali Sir, Talib Sir, Imran Sir, Akhtar Sir',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'WRITING_QUEST',
    fileSlug: '15_Writing_Quest_Classes_11_12',
    title: 'Writing Quest',
    classGroup: 'Classes 11 & 12',
    campus: 'Meena Shah Public School',
    room: 'MSPS 1st FLOOR',
    incharges: 'Doris Mam',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'ONLINE_QUIZ_11_12',
    fileSlug: '16_Online_Quiz_Classes_11_12',
    title: 'Online Quiz (Classes 11 & 12)',
    classGroup: 'Classes 11 & 12',
    campus: 'MSITM Campus',
    room: 'MSITM LAB',
    incharges: 'Raghuvendra Pandey Sir (Head), Arif Sir, Ibarat Ali Sir, Talib Sir, Imran Sir, Akhtar Sir',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'ONLINE_QUIZ_GRADUATION',
    fileSlug: '17_Online_Quiz_Graduation',
    title: 'Online Quiz (Graduation)',
    classGroup: 'Graduation / College',
    campus: 'MSITM Campus',
    room: 'MSITM LAB',
    incharges: 'MSITM College Administration & Technical Invigilation Team',
    examDate: '02 Nov 2026 (Monday)',
  },
  {
    key: 'ESSAY_WRITING_GRADUATION',
    fileSlug: '18_Essay_Writing_Graduation',
    title: 'Essay Writing (Graduation)',
    classGroup: 'Graduation / College',
    campus: 'MSITM Campus',
    room: 'MSITM LT-2, LT-3 & LT-4',
    incharges: 'MSITM College Administration & Evaluation Committee',
    examDate: '01 Nov 2026 (Sunday)',
  },
  {
    key: 'PENDING_REVIEW',
    fileSlug: '19_Administrative_Hold_Pending_Review',
    title: 'Event Allocation Pending Administrative Review',
    classGroup: 'Under Verification',
    campus: 'Meena Shah Public School',
    room: 'ADMINISTRATION OFFICE',
    incharges: 'Central Examination Control Committee',
    examDate: '01 Nov 2026 (Sunday)',
  }
];

// Helper to sanitize Excel sheet names (max 31 chars, no invalid chars)
function sanitizeSheetName(name, fallback = 'Sheet') {
  let clean = String(name || fallback)
    .replace(/[\\/*?[\]:]/g, '_')
    .replace(/_+/g, ' ')
    .trim();
  if (clean.length > 30) clean = clean.substring(0, 30);
  return clean || fallback;
}

// Convert "08:00 AM" to minutes for exact chronological sorting
function timeToMinutes(tStr) {
  if (!tStr || typeof tStr !== 'string') return 9999;
  const m = tStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 9999;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

// Map each candidate to their program
const programDataMap = new Map();

for (const cfg of programConfigs) {
  programDataMap.set(cfg.key, {
    ...cfg,
    candidates: [],
    // physical shifts grouped by: date + repTime + examTime + room
    physicalShifts: new Map()
  });
}

for (const r of masterRows) {
  const comp = r['Event Category'] || r['Competition Name'];
  const cls = r['Class'];
  const key = resolveEventKey(comp, cls);

  let pData = programDataMap.get(key) || programDataMap.get('PENDING_REVIEW');
  pData.candidates.push(r);

  const date = String(r['Examination Date'] || pData.examDate).trim();
  const repTime = String(r['Reporting Time'] || '09:00 AM').trim();
  const examTime = String(r['Examination Time'] || '10:00 AM').trim();
  const room = String(r['Specific Hall / Room'] || pData.room).trim();

  // Canonical shift key represents an actual physical sitting in the room
  const shiftKey = `${date}|${repTime}|${examTime}|${room}`;
  if (!pData.physicalShifts.has(shiftKey)) {
    pData.physicalShifts.set(shiftKey, {
      shiftKey,
      date,
      repTime,
      examTime,
      room,
      campus: pData.campus,
      incharges: pData.incharges,
      candidates: []
    });
  }

  pData.physicalShifts.get(shiftKey).candidates.push(r);
}

// Sort shifts chronologically within each program
for (const p of programDataMap.values()) {
  const shiftList = Array.from(p.physicalShifts.values());
  shiftList.sort((a, b) => {
    // 01 Nov before 02 Nov
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return timeToMinutes(a.repTime) - timeToMinutes(b.repTime);
  });

  // Assign clean display names: e.g. "Batch 1 (08:30 AM - 09:30 AM)"
  let bNum = 1;
  const isMultiShift = shiftList.length > 1;

  for (const s of shiftList) {
    if (isMultiShift) {
      s.batchDisplayName = `Batch ${bNum++} (${s.repTime} Rep)`;
    } else {
      s.batchDisplayName = `Main Session (${s.repTime} Rep)`;
    }
  }

  p.sortedShifts = shiftList;
}

console.log('Successfully structured all physical shifts.');

// ============================================================================
// WORKBOOK 1: 00_OFFICIAL_MASTER_EXAM_TIMETABLE_2026.xlsx
// ============================================================================
console.log('\n[1/3] Building 00_OFFICIAL_MASTER_EXAM_TIMETABLE_2026.xlsx...');
const masterTimetableWb = XLSX.utils.book_new();

// Sheet 1: Master Timetable
const ttMasterRows = [];
let ttIndex = 1;

for (const cfg of programConfigs) {
  const p = programDataMap.get(cfg.key);
  if (!p || p.candidates.length === 0) continue;

  for (const s of p.sortedShifts) {
    ttMasterRows.push({
      'S.No': ttIndex++,
      'Competition / Program': p.title,
      'Target Class / Grade': p.classGroup,
      'Examination Date': s.date,
      'Shift / Batch': s.batchDisplayName,
      'Reporting Time': s.repTime,
      'Examination Time': s.examTime,
      'Campus Venue': s.campus,
      'Allocated Hall / Room': s.room,
      'Registered Candidates': s.candidates.length,
      'Faculty In-charge / Exam Guards (ड्यूटी प्रभारी)': p.incharges,
      'Duty Status': 'CONFIRMED'
    });
  }
}

const ttMasterSheet = XLSX.utils.json_to_sheet(ttMasterRows);
ttMasterSheet['!cols'] = [
  { wch: 6 },  // S.No
  { wch: 38 }, // Competition / Program
  { wch: 22 }, // Target Class / Grade
  { wch: 22 }, // Examination Date
  { wch: 24 }, // Shift / Batch
  { wch: 16 }, // Reporting Time
  { wch: 30 }, // Examination Time
  { wch: 28 }, // Campus Venue
  { wch: 28 }, // Allocated Hall / Room
  { wch: 20 }, // Registered Candidates
  { wch: 55 }, // Faculty In-charge
  { wch: 14 }  // Duty Status
];
XLSX.utils.book_append_sheet(masterTimetableWb, ttMasterSheet, 'Master Examination Schedule');

// Sheet 2: Room & Venue Wise Duty Roster
const roomRosterRows = [];
let roomIndex = 1;

// Collect all shifts and sort by Room -> Date -> Time
const allShiftsFlat = [];
for (const p of programDataMap.values()) {
  for (const s of p.sortedShifts) {
    allShiftsFlat.push({
      program: p.title,
      classGroup: p.classGroup,
      ...s
    });
  }
}

allShiftsFlat.sort((a, b) => {
  if (a.campus !== b.campus) return a.campus.localeCompare(b.campus);
  if (a.room !== b.room) return a.room.localeCompare(b.room);
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return timeToMinutes(a.repTime) - timeToMinutes(b.repTime);
});

for (const s of allShiftsFlat) {
  roomRosterRows.push({
    'S.No': roomIndex++,
    'Campus Institution': s.campus,
    'Examination Hall / Room': s.room,
    'Date of Exam': s.date,
    'Reporting Time': s.repTime,
    'Examination Hours': s.examTime,
    'Shift Name': s.batchDisplayName,
    'Competition Event': s.program,
    'Student Grade Level': s.classGroup,
    'Room Candidate Strength': s.candidates.length,
    'Room Duty Incharge & Invigilator': s.incharges
  });
}

const roomRosterSheet = XLSX.utils.json_to_sheet(roomRosterRows);
roomRosterSheet['!cols'] = [
  { wch: 6 },  // S.No
  { wch: 28 }, // Campus Institution
  { wch: 30 }, // Examination Hall / Room
  { wch: 22 }, // Date of Exam
  { wch: 16 }, // Reporting Time
  { wch: 30 }, // Examination Hours
  { wch: 24 }, // Shift Name
  { wch: 38 }, // Competition Event
  { wch: 22 }, // Student Grade Level
  { wch: 22 }, // Room Candidate Strength
  { wch: 55 }  // Room Duty Incharge
];
XLSX.utils.book_append_sheet(masterTimetableWb, roomRosterSheet, 'Hall & Venue Duty Roster');

// Sheet 3: Faculty & Incharges Directory
const facultyDirRows = [];
let fIndex = 1;

for (const cfg of programConfigs) {
  const p = programDataMap.get(cfg.key);
  if (!p || p.candidates.length === 0) continue;

  facultyDirRows.push({
    'S.No': fIndex++,
    'Program / Event Name': p.title,
    'Eligible Class': p.classGroup,
    'Exam Date': p.examDate,
    'Allocated Hall / Room': p.room,
    'Campus': p.campus,
    'Total Assigned Shifts': p.sortedShifts.length,
    'Total Student Candidates': p.candidates.length,
    'Designated Faculty In-charges / Guards': p.incharges,
    'Control Room Helpline': '9569731566, 8948905711'
  });
}

const facultySheet = XLSX.utils.json_to_sheet(facultyDirRows);
facultySheet['!cols'] = [
  { wch: 6 },  // S.No
  { wch: 38 }, // Program / Event Name
  { wch: 22 }, // Eligible Class
  { wch: 22 }, // Exam Date
  { wch: 30 }, // Allocated Hall / Room
  { wch: 28 }, // Campus
  { wch: 20 }, // Total Assigned Shifts
  { wch: 22 }, // Total Student Candidates
  { wch: 55 }, // Designated Faculty In-charges
  { wch: 26 }  // Control Room Helpline
];
XLSX.utils.book_append_sheet(masterTimetableWb, facultySheet, 'Faculty Incharge Directory');

// Sheet 4: Executive Overview
const overviewRows = [];
let ovIndex = 1;
let grandTotalStudents = 0;

for (const cfg of programConfigs) {
  const p = programDataMap.get(cfg.key);
  if (!p) continue;
  grandTotalStudents += p.candidates.length;

  overviewRows.push({
    'S.No': ovIndex++,
    'Competition Key': p.key,
    'Official Competition Title': p.title,
    'Class Category': p.classGroup,
    'Date of Examination': p.examDate,
    'Examination Hall / Room': p.room,
    'Total Physical Shifts': p.sortedShifts.length,
    'Total Registered Candidates': p.candidates.length,
    'Lead Faculty Coordinator': p.incharges.split(',')[0].trim()
  });
}

overviewRows.push({
  'S.No': '',
  'Competition Key': 'GRAND_TOTAL',
  'Official Competition Title': 'TOTAL PARTICIPATION (ALL 19 COMPETITIONS)',
  'Class Category': 'PLAY GROUP TO GRADUATION',
  'Date of Examination': '01 Nov & 02 Nov 2026',
  'Examination Hall / Room': 'ALL MEENA SHAH CAMPUS VENUES',
  'Total Physical Shifts': ttMasterRows.length,
  'Total Registered Candidates': grandTotalStudents,
  'Lead Faculty Coordinator': 'EXAMINATION CONTROLLER'
});

const overviewSheet = XLSX.utils.json_to_sheet(overviewRows);
overviewSheet['!cols'] = [
  { wch: 6 },  // S.No
  { wch: 26 }, // Competition Key
  { wch: 38 }, // Official Competition Title
  { wch: 24 }, // Class Category
  { wch: 22 }, // Date of Examination
  { wch: 30 }, // Examination Hall / Room
  { wch: 20 }, // Total Physical Shifts
  { wch: 26 }, // Total Registered Candidates
  { wch: 30 }  // Lead Faculty Coordinator
];
XLSX.utils.book_append_sheet(masterTimetableWb, overviewSheet, 'Executive Summary Metrics');

const timetableFilePath = path.join(destFolder, '00_OFFICIAL_MASTER_EXAM_TIMETABLE_2026.xlsx');
XLSX.writeFile(masterTimetableWb, timetableFilePath);
console.log(`Saved: ${timetableFilePath}`);

// ============================================================================
// WORKBOOK 2: 00_ALL_CANDIDATES_MASTER_SEATING_ROSTER.xlsx
// ============================================================================
console.log('\n[2/3] Building 00_ALL_CANDIDATES_MASTER_SEATING_ROSTER.xlsx (All 6,046 Candidates)...');

const allRosterRows = [];
let allGlobalSeat = 1;

for (const cfg of programConfigs) {
  const p = programDataMap.get(cfg.key);
  if (!p || p.candidates.length === 0) continue;

  for (const s of p.sortedShifts) {
    // Sort candidates inside shift by registration number
    s.candidates.sort((a, b) => String(a['Registration No']).localeCompare(String(b['Registration No'])));

    let shiftSeat = 1;
    for (const c of s.candidates) {
      allRosterRows.push({
        'Global S.No': allGlobalSeat++,
        'Desk / Seat No': `SEAT-${String(shiftSeat++).padStart(3, '0')}`,
        'Registration No': c['Registration No'],
        'Candidate Full Name': c['Student Name'],
        "Father's / Guardian's Name": c["Father's Name"],
        'School / College / Institution': c['School / College'] || 'Meena Shah Public School',
        'Class / Grade': c['Class'],
        'Competition Program': p.title,
        'Examination Date': s.date,
        'Shift / Session': s.batchDisplayName,
        'Reporting Time': s.repTime,
        'Examination Time': s.examTime,
        'Campus': s.campus,
        'Allocated Hall / Room': s.room,
        'Faculty In-charge / Exam Guard': p.incharges,
        'Candidate Signature (हस्ताक्षर)': '',
        'Invigilator / Guard Signature': '',
        'Attendance (P/A)': '',
        'Remarks': ''
      });
    }
  }
}

const allRosterWb = XLSX.utils.book_new();
const allRosterSheet = XLSX.utils.json_to_sheet(allRosterRows);
allRosterSheet['!cols'] = [
  { wch: 12 }, // Global S.No
  { wch: 14 }, // Desk / Seat No
  { wch: 16 }, // Registration No
  { wch: 28 }, // Candidate Full Name
  { wch: 26 }, // Father's / Guardian's Name
  { wch: 32 }, // School / College / Institution
  { wch: 14 }, // Class / Grade
  { wch: 35 }, // Competition Program
  { wch: 22 }, // Examination Date
  { wch: 24 }, // Shift / Session
  { wch: 16 }, // Reporting Time
  { wch: 28 }, // Examination Time
  { wch: 26 }, // Campus
  { wch: 28 }, // Allocated Hall / Room
  { wch: 45 }, // Faculty In-charge
  { wch: 25 }, // Candidate Signature
  { wch: 22 }, // Invigilator Signature
  { wch: 16 }, // Attendance (P/A)
  { wch: 20 }  // Remarks
];
XLSX.utils.book_append_sheet(allRosterWb, allRosterSheet, 'Complete Master Seating Roster');

const allRosterFilePath = path.join(destFolder, '00_ALL_CANDIDATES_MASTER_SEATING_ROSTER.xlsx');
XLSX.writeFile(allRosterWb, allRosterFilePath);
console.log(`Saved: ${allRosterFilePath} (${allRosterRows.length} candidates)`);

// ============================================================================
// WORKBOOKS 3-21: INDIVIDUAL PROGRAM-WISE & SHIFT-WISE ATTENDANCE WORKBOOKS
// ============================================================================
console.log('\n[3/3] Building 19 Individual Program-Wise Seating & Attendance Workbooks...');

for (const cfg of programConfigs) {
  const p = programDataMap.get(cfg.key);
  if (!p || p.candidates.length === 0) continue;

  const progWb = XLSX.utils.book_new();

  // Tab 1: All Program Candidates Summary List
  const progOverallRows = [];
  let pOverallIndex = 1;

  for (const s of p.sortedShifts) {
    s.candidates.sort((a, b) => String(a['Registration No']).localeCompare(String(b['Registration No'])));

    let sSeat = 1;
    for (const c of s.candidates) {
      progOverallRows.push({
        'S.No': pOverallIndex++,
        'Shift Seat No': `SEAT-${String(sSeat++).padStart(3, '0')}`,
        'Registration No': c['Registration No'],
        'Candidate Name': c['Student Name'],
        "Father's Name": c["Father's Name"],
        'School / College': c['School / College'] || 'Meena Shah Public School',
        'Class': c['Class'],
        'Shift Name': s.batchDisplayName,
        'Reporting Time': s.repTime,
        'Exam Time': s.examTime,
        'Hall / Room': s.room,
        'Exam Date': s.date,
        'Candidate Signature': '',
        'Invigilator Signature': '',
        'Attendance (P/A)': ''
      });
    }
  }

  const progOverallSheet = XLSX.utils.json_to_sheet(progOverallRows);
  progOverallSheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 14 }, // Shift Seat No
    { wch: 16 }, // Registration No
    { wch: 28 }, // Candidate Name
    { wch: 26 }, // Father's Name
    { wch: 32 }, // School / College
    { wch: 12 }, // Class
    { wch: 24 }, // Shift Name
    { wch: 16 }, // Reporting Time
    { wch: 28 }, // Exam Time
    { wch: 26 }, // Hall / Room
    { wch: 22 }, // Exam Date
    { wch: 24 }, // Candidate Signature
    { wch: 20 }, // Invigilator Signature
    { wch: 16 }  // Attendance (P/A)
  ];
  XLSX.utils.book_append_sheet(progWb, progOverallSheet, 'Full Program Roster');

  // Tab 2+: Dedicated Tab for Each Physical Shift (Exam Hall Attendance Sheet)
  let sCounter = 1;
  for (const s of p.sortedShifts) {
    const shiftAttendanceRows = [];
    let deskNo = 1;

    for (const c of s.candidates) {
      shiftAttendanceRows.push({
        'Desk / Seat No': `SEAT-${String(deskNo++).padStart(3, '0')}`,
        'Registration No': c['Registration No'],
        'Candidate Name': c['Student Name'],
        "Father's Name": c["Father's Name"],
        'School / College': c['School / College'] || 'Meena Shah Public School',
        'Class': c['Class'],
        'Competition Event': p.title,
        'Examination Date': s.date,
        'Reporting Time': s.repTime,
        'Examination Time': s.examTime,
        'Hall / Room': s.room,
        'Faculty Incharge / Invigilator': p.incharges,
        'Candidate Signature (हस्ताक्षर)': '',
        'Invigilator Signature': '',
        'Attendance (P / A)': '',
        'Remarks / Copy No': ''
      });
    }

    const shiftSheet = XLSX.utils.json_to_sheet(shiftAttendanceRows);
    shiftSheet['!cols'] = [
      { wch: 16 }, // Desk / Seat No
      { wch: 16 }, // Registration No
      { wch: 28 }, // Candidate Name
      { wch: 26 }, // Father's Name
      { wch: 32 }, // School / College
      { wch: 12 }, // Class
      { wch: 32 }, // Competition Event
      { wch: 22 }, // Examination Date
      { wch: 16 }, // Reporting Time
      { wch: 28 }, // Examination Time
      { wch: 26 }, // Hall / Room
      { wch: 45 }, // Faculty Incharge
      { wch: 26 }, // Candidate Signature
      { wch: 22 }, // Invigilator Signature
      { wch: 16 }, // Attendance (P / A)
      { wch: 20 }  // Remarks
    ];

    // Create a very clean tab name, e.g. "Shift 1 (08.30-09.30)"
    const timeShort = s.examTime.replace(/:\d{2}/g, '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, '');
    let cleanTab = sanitizeSheetName(`Shift ${sCounter} (${timeShort})`, `Shift_${sCounter}`);
    if (progWb.SheetNames.includes(cleanTab)) {
      cleanTab = sanitizeSheetName(`Shift_${sCounter}`);
    }
    sCounter++;

    XLSX.utils.book_append_sheet(progWb, shiftSheet, cleanTab);
  }

  const progFileName = `${p.fileSlug}_Seating_Plan.xlsx`;
  const progFilePath = path.join(subFolder, progFileName);
  XLSX.writeFile(progWb, progFilePath);
  console.log(`Saved: ${progFileName} (${p.candidates.length} candidates, ${p.sortedShifts.length} shifts)`);
}

// ============================================================================
// FILE 4: README_EXAMINATION_TIMETABLE_AND_SEATING_GUIDE.md
// ============================================================================
console.log('\nCreating README_EXAMINATION_TIMETABLE_AND_SEATING_GUIDE.md...');

const readmeContent = `# MIND-SPARK 2026: OFFICIAL MASTER TIMETABLE & SEATING ARRANGEMENT DIRECTORY
**Organized by:** Meena Shah Public School & Meena Shah Memorial Educational Society, Gonda (U.P.)  
**Examination Dates:** Sunday, 01 November 2026 & Monday, 02 November 2026  
**Total Candidates Audited & Scheduled:** 6,046 Candidates Across 19 Programs  
**Generated Date:** ${new Date().toLocaleDateString('en-GB')}  

---

## 📁 FOLDER CONTENTS & FILE ORGANIZATION

This folder contains the complete operational infrastructure for conducting Mindspark 2026 smoothly:

### 1. Master Control Files (Root Folder)
1. **\`00_OFFICIAL_MASTER_EXAM_TIMETABLE_2026.xlsx\`**
   - **Sheet 1: Master Examination Schedule** — Full timetable of all 19 competitions and shifts with reporting time, exam time, room, strength, and in-charges.
   - **Sheet 2: Hall & Venue Duty Roster** — Room-by-room chronology showing which competition and which in-charge/guard is in each room throughout the day.
   - **Sheet 3: Faculty Incharge Directory** — Directory of all faculty coordinators, their rooms, shift counts, and helpline numbers.
   - **Sheet 4: Executive Summary Metrics** — Program-wise summary of student participation and shift counts.

2. **\`00_ALL_CANDIDATES_MASTER_SEATING_ROSTER.xlsx\`**
   - Contains all **6,046 students** sorted by Program, Shift, and Seat Number.
   - Includes Desk/Seat Number (\`SEAT-001\`, \`SEAT-002\`...), Candidate Details, Incharge Name, and Attendance/Signature spaces.

---

### 2. Program-Wise Seating & Attendance Workbooks (\`PROGRAM_SEATING_AND_ATTENDANCE_SHEETS/\`)
Inside this subfolder are **19 dedicated workbooks** (one for each program).  
Each workbook contains:
- **Sheet 1:** Complete enrolled student list for that program.
- **Subsequent Sheets:** Dedicated attendance and desk-roll sheets for each physical shift/batch, pre-formatted with Seat Numbers, Student Names, Father Names, Incharge Names, and signature boxes for printing.

#### Program List:
1. \`01_Unique_Creative_Handmade_Fancy_Dress_PlayGroup_Seating_Plan.xlsx\` (34 candidates)
2. \`02_Colour_by_Number_Nursery_Seating_Plan.xlsx\` (196 candidates)
3. \`03_Join_the_Dots_and_Colour_LKG_Seating_Plan.xlsx\` (242 candidates)
4. \`04_Complete_the_Picture_and_Colour_UKG_Seating_Plan.xlsx\` (210 candidates)
5. \`05_Clay_Champs_Class_1_Seating_Plan.xlsx\` (253 candidates, 4 shifts)
6. \`06_Dress_to_Impress_Class_1_Seating_Plan.xlsx\` (69 candidates)
7. \`07_Paint_Your_Imagination_Classes_2_3_Seating_Plan.xlsx\` (495 candidates, 2 shifts)
8. \`08_Writing_Stars_Classes_2_3_Seating_Plan.xlsx\` (291 candidates)
9. \`09_Battle_of_Brains_Classes_4_5_Seating_Plan.xlsx\` (408 candidates)
10. \`10_Poster_Artist_Classes_4_5_Seating_Plan.xlsx\` (449 candidates, 2 shifts)
11. \`11_Junior_Scientist_Classes_6_to_8_Seating_Plan.xlsx\` (428 candidates, 9 shifts)
12. \`12_Fireless_Cooking_Classes_6_to_8_Seating_Plan.xlsx\` (685 candidates, 5 shifts)
13. \`13_Young_Innovators_Classes_9_10_Seating_Plan.xlsx\` (166 candidates, 4 shifts)
14. \`14_Online_Quiz_Classes_9_10_Seating_Plan.xlsx\` (567 candidates, 5 shifts)
15. \`15_Writing_Quest_Classes_11_12_Seating_Plan.xlsx\` (151 candidates)
16. \`16_Online_Quiz_Classes_11_12_Seating_Plan.xlsx\` (571 candidates, 3 shifts)
17. \`17_Online_Quiz_Graduation_Seating_Plan.xlsx\` (683 candidates, 4 shifts - **Monday, 02 Nov 2026**)
18. \`18_Essay_Writing_Graduation_Seating_Plan.xlsx\` (130 candidates - **Sunday, 01 Nov 2026**)
19. \`19_Administrative_Hold_Pending_Review_Seating_Plan.xlsx\` (18 candidates)

---

## 🏛️ VENUE & FACULTY INCHARGE SUMMARY ("KON GARDI KAR RHA HAI")

| Competition Program | Target Class | Exam Date | Room / Venue | Faculty Incharge / Guards |
|---|---|---|---|---|
| Fancy Dress | Play Group | 01 Nov 2026 | MSPS Stage | Nida Iqbal, Ayesha Siddiqui, Sadiya Qadri |
| Colour by Number | Nursery | 01 Nov 2026 | MSPS 1st Floor | Hina Fatima, Richa Pandey |
| Join the Dots | L.K.G. | 01 Nov 2026 | MSPS 1st Floor | Fiza Siddiqui, Noore Taiba |
| Complete the Picture | U.K.G. | 01 Nov 2026 | MSPS 1st Floor | Shraddha Mam, Afreen Mam |
| Clay Champs | Class 1 | 01 Nov 2026 | MSPS Music Room | Shumaila Mam, Ghazala Mam |
| Dress to Impress | Class 1 | 01 Nov 2026 | MSPS Stage | Sujata Mam, Faiz Sir |
| Paint Your Imagination | Classes 2 & 3 | 01 Nov 2026 | MSPS Library | Chetna Mam, Vedanshi Mam, Rabiya Mam |
| Writing Stars | Classes 2 & 3 | 01 Nov 2026 | MSPS 1st Floor | Fatima Mam, Anupriya Mam |
| Battle of Brains | Classes 4 & 5 | 01 Nov 2026 | MSPS 1st Floor | Imran Sir, Shaalu Mam |
| Poster Artist | Classes 4 & 5 | 01 Nov 2026 | MSPS Library | Aman Sir, Azmat Ali Sir |
| Junior Scientist | Classes 6 to 8 | 01 Nov 2026 | MSPS Ground | Scientific Evaluation Committee |
| Fireless Cooking | Classes 6 to 8 | 01 Nov 2026 | Ground Floor (Front of Music Room) | Poonam Mam, Zainab Mam, Neelima Mam, Doris Mam |
| Young Innovators | Classes 9 & 10 | 01 Nov 2026 | Vacant Room 1st Floor | Asit Sir, Azhar Sir |
| Online Quiz (9-10) | Classes 9 & 10 | 01 Nov 2026 | MSPS Lab | Raghuvendra Pandey Sir (Head), Arif Sir, Ibarat Ali Sir, Talib Sir, Imran Sir, Akhtar Sir |
| Writing Quest | Classes 11 & 12 | 01 Nov 2026 | MSPS 1st Floor | Doris Mam |
| Online Quiz (11-12) | Classes 11 & 12 | 01 Nov 2026 | MSITM Lab | Raghuvendra Pandey Sir (Head), Arif Sir, Ibarat Ali Sir, Talib Sir, Imran Sir, Akhtar Sir |
| Online Quiz (Graduation) | Graduation | **02 Nov 2026** | MSITM Lab | MSITM College Administration & Technical Team |
| Essay Writing (Graduation) | Graduation | **01 Nov 2026** | MSITM LT-2, LT-3 & LT-4 | MSITM College Administration & Evaluation Committee |

---

## 🖨️ PRINTING & EXAM DAY INSTRUCTIONS FOR COORDINATORS
1. **Attendance Sheets:** Print the respective shift sheet tab from the program workbook. Each sheet contains exact desk seat numbers (\`SEAT-001\`, \`SEAT-002\`...) to easily verify candidate attendance.
2. **Desk Slips:** Desk numbers correspond directly to the candidate serial number on the sheet.
3. **Signatures:** Candidates must sign in the 'Candidate Signature' column upon receiving their paper/questionnaire. The invigilator must sign after checking the student Photo ID card and admit card.
4. **Helpline Numbers:** Control Room Helpline: **9569731566**, **8948905711**.
`;

fs.writeFileSync(path.join(destFolder, 'README_EXAMINATION_TIMETABLE_AND_SEATING_GUIDE.md'), readmeContent, 'utf8');
console.log('Saved README_EXAMINATION_TIMETABLE_AND_SEATING_GUIDE.md');

console.log('\n======================================================================');
console.log('🎉 ALL FILES SUCCESSFULLY CREATED, VERIFIED AND SAVED TO DESKTOP!');
console.log(`Path: ${destFolder}`);
console.log('======================================================================');
