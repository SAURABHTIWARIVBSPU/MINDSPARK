const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const {
  normalizeDate,
  normalizePhone,
  normalizeText,
  calculateStudentSchedule
} = require('./candidate_data_9_parser');

const wbSirSyed = xlsx.readFile('SIR SYED I C (2).xlsx');
const rowsSirSyed = xlsx.utils.sheet_to_json(wbSirSyed.Sheets['Sheet1']);

const wb27 = xlsx.readFile('27-10-2026.2.xlsx');
const rows27 = xlsx.utils.sheet_to_json(wb27.Sheets['Sheet1']);

// The 30 new candidates from SIR SYED I C (2).xlsx (Fatima School)
// Registration range: MS261105434 to MS261105466, excluding MS261105444, MS261105445 (already in DB) and MS261105448 (duplicate Vamika Mishra)
const newCandidates = [];

// 1. Fatima School Class 2 candidates (13)
// 2. Fatima School Class 1 candidates (17)
rowsSirSyed.forEach((r, idx) => {
  const reg = normalizeText(r['Registration '] || r['Registration']);
  const name = normalizeText(r['Student Name']);
  const father = normalizeText(r["Father's Name"]);
  const cls = normalizeText(r['Class '] || r['Class']);
  const school = normalizeText(r['School Name']);
  const dob = normalizeDate(r['DOB']);
  const phone = normalizePhone(r['Contact No.']);

  // Exclude duplicate Vamika Mishra MS261105448
  if (reg >= 'MS261105434' && reg <= 'MS261105466' && reg !== 'MS261105444' && reg !== 'MS261105445' && reg !== 'MS261105448') {
    let event = '';
    if (cls === '1') event = 'CLAY CHAMPS';
    else if (cls === '2') event = 'PAINT YOUR IMAGINATION';
    else event = 'MISSING_EVENT';

    newCandidates.push({
      sourceFile: 'SIR SYED I C (2).xlsx',
      rowNum: idx + 2,
      regNo: reg,
      name,
      father,
      dob,
      phone,
      school: 'FATIMA SCHOOL GONDA',
      class: cls,
      event
    });
  }
});

// 3. Ayaan from 27-10-2026.2.xlsx (Class 3, Global Academy Gonda)
rows27.forEach((r, idx) => {
  const reg = normalizeText(r['Registration No. '] || r['Registration No.'] || r['Registration']);
  if (reg === 'MS261105637') {
    newCandidates.push({
      sourceFile: '27-10-2026.2.xlsx',
      rowNum: idx + 2,
      regNo: reg,
      name: normalizeText(r['Student Name']),
      father: normalizeText(r["Father's Name"]),
      dob: normalizeDate(r['DOB']),
      phone: normalizePhone(r['Contact No.']),
      school: 'GLOBAL ACADEMY GONDA',
      class: '3',
      event: 'WRITING STARS' // Default competition for Class 3; matches brother Arhan
    });
  }
});

console.log(`Prepared ${newCandidates.length} new candidates to integrate:\n`);

let c1Count = 0;
let c2Count = 0;
let c3Count = 0;

const preparedMasterRows = newCandidates.map((c, idx) => {
  let indexForBatch = 0;
  if (c.class === '1') {
    indexForBatch = c1Count++;
  } else if (c.class === '2') {
    indexForBatch = c2Count++;
  } else {
    indexForBatch = c3Count++;
  }

  const sched = calculateStudentSchedule(c.event, c.class, indexForBatch);

  return {
    'S.No': 6015 + idx + 1,
    'Registration No': c.regNo,
    'Student Name': c.name,
    "Father's Name": c.father,
    'Date of Birth': c.dob,
    'Phone Number': c.phone,
    'School / College': c.school,
    'Class': c.class,
    'Event Category': c.event,
    'Examination Date': sched.examDate,
    'Reporting Time': sched.reportingTime,
    'Examination Time': sched.examTime,
    'Shift / Batch': sched.shiftBatch,
    'Campus / Venue': sched.campusVenue,
    'Specific Hall / Room': sched.specificHall,
    'Admit Card Status': sched.admitStatus,
    'Eligibility Notes': sched.eligibilityNotes,
    'WhatsApp Status': 'NOT_SENT'
  };
});

preparedMasterRows.forEach(r => {
  console.log(`${r['Registration No']} | ${r['Student Name'].padEnd(22)} | ${r['Class'].padEnd(2)} | ${r['Event Category'].padEnd(22)} | ${r['Examination Time'].padEnd(30)} | ${r['Specific Hall / Room']}`);
});

console.log(`\nBreakdown: Class 1 (Clay Champs): ${c1Count}, Class 2 (Paint Your Imagination): ${c2Count}, Class 3 (Writing Stars): ${c3Count}`);

