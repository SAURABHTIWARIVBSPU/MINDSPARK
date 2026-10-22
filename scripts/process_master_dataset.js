const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Load 21-10-2026_1.xlsx
const filePath = path.join(process.cwd(), '21-10-2026_1.xlsx');
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log(`Loaded ${rawData.length} rows from 21-10-2026_1.xlsx`);

// Event columns in Sheet1
const eventCols = [
  'Play Group(UNIQUE AND CREATIVE HANDMADE FANCY DRESS)',
  'Nursery(COLOUR BY NUMBER)',
  'LKG(JOIN THE DOTS AND COLOUR)',
  'UKG(COMPLETE THE PICTURE AND COLOUR)',
  'Class 1(CLAY CHAMPS / DREES TO IMPRESS)',
  'Class 2 to Class 3(PAINT YOUR IMEGINATION / WRITING STARS)',
  'Class 4 to Class 5(BATTLE OF BRAINS /  POSTER ARTIST)',
  'Class 6 to Class 8(FIRELESS COOKING / JUNIOR SCIENTIST)',
  'Class 9 to Class 10(ONLINE QUIZ / YOUNG INNOVATORS)',
  'Class 11 to Class 12(ONLINE QUIZ / THE WRITING QUEST)',
  'Graduation(ESSAY WRITING /ONLINE QUIZ)'
];

// Standardize Event Name
function standardizeEvent(raw) {
  if (!raw) return '';
  const clean = String(raw).trim().toUpperCase().replace(/\s+/g, ' ');
  if (/ONL+INE\s*Q[U|I|L]*Z/i.test(clean)) return 'ONLINE QUIZ';
  if (/COLOU?R\s*BY\s*NUMBE*R/i.test(clean)) return 'COLOUR BY NUMBER';
  if (/JOIN\s*THE\s*DOTS/i.test(clean)) return 'JOIN THE DOTS AND COLOUR';
  if (/COMPLETE\s*THE\s*PICTURE/i.test(clean)) return 'COMPLETE THE PICTURE AND COLOUR';
  if (/CLAY\s*CHAMP/i.test(clean)) return 'CLAY CHAMPS';
  if (/DREES|DRESS\s*TO\s*IMPRESS/i.test(clean)) return 'DRESS TO IMPRESS';
  if (/PAINT\s*YOUR/i.test(clean)) return 'PAINT YOUR IMAGINATION';
  if (/WRITING\s*STAR/i.test(clean)) return 'WRITING STARS';
  if (/BATTLE\s*OF\s*BRAIN/i.test(clean)) return 'BATTLE OF BRAINS';
  if (/POSTER\s*ARTIST/i.test(clean)) return 'POSTER ARTIST';
  if (/FIRELESS/i.test(clean)) return 'FIRELESS COOKING';
  if (/JUNIOR\s*SC[E|I]*NTIST/i.test(clean)) return 'JUNIOR SCIENTIST';
  if (/YOUNG\s*INNOVATOR/i.test(clean)) return 'YOUNG INNOVATORS';
  if (/WRITING\s*QUEST/i.test(clean)) return 'WRITING QUEST';
  if (/ESSAY\s*WRITING/i.test(clean)) return 'ESSAY WRITING';
  if (/FANCY\s*DRESS/i.test(clean)) return 'UNIQUE AND CREATIVE HANDMADE FANCY DRESS';
  return clean;
}

// Standardize DOB
function standardizeDob(raw) {
  if (!raw) return 'N/A';
  if (typeof raw === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(raw);
      if (d && d.y && d.m && d.d) {
        const mm = String(d.m).padStart(2, '0');
        const dd = String(d.d).padStart(2, '0');
        return `${dd}-${mm}-${d.y}`;
      }
    } catch {}
  }
  const s = String(raw).trim();
  const dmMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmMatch) {
    const dd = String(dmMatch[1]).padStart(2, '0');
    const mm = String(dmMatch[2]).padStart(2, '0');
    return `${dd}-${mm}-${dmMatch[3]}`;
  }
  return s;
}

// Standardize Phone
function cleanPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.slice(-10);
}

// Process Records
const masterStudents = [];
const onlineQuizStudents = [];
const otherEventStudents = [];
const multipleEventStudents = [];
const duplicateReviewStudents = [];

// For duplicate tracking
const phoneCounts = {};
rawData.forEach(r => {
  const ph = cleanPhone(r['Contact No.']);
  if (ph) phoneCounts[ph] = (phoneCounts[ph] || 0) + 1;
});

const categorySummaryCounts = {};

rawData.forEach((r, idx) => {
  const rowNum = idx + 2;
  const regNo = (r['Regi No'] || '').toString().trim().toUpperCase();
  const studentName = (r['Student Name'] || '').toString().trim().toUpperCase();
  const fatherName = (r["Father's Name"] || '').toString().trim().toUpperCase();
  const dob = standardizeDob(r['DOB']);
  const aadhar = (r['Aadhar Number'] || '').toString().trim();
  const phone = cleanPhone(r['Contact No.']);
  const schoolName = (r['School Name'] || '').toString().trim().toUpperCase();
  const className = (r['Class '] || '').toString().trim().toUpperCase();

  // Determine Events
  const rawEvents = [];
  eventCols.forEach(col => {
    const val = (r[col] || '').toString().trim();
    if (val && val !== '-' && val !== 'NA' && val !== 'N/A') {
      rawEvents.push(standardizeEvent(val));
    }
  });

  let eventCategory = '';
  let participationType = 'SINGLE';
  let validationNote = 'VALID';

  if (rawEvents.length === 0) {
    eventCategory = 'MISSING_EVENT';
    participationType = 'UNASSIGNED';
    validationNote = 'FLAGGED: Missing Event Selection';
  } else if (rawEvents.length === 1) {
    eventCategory = rawEvents[0];
    participationType = 'SINGLE';
  } else {
    eventCategory = rawEvents.join(' + ');
    participationType = 'MULTIPLE';
  }

  // Update Summary Counts
  categorySummaryCounts[eventCategory] = (categorySummaryCounts[eventCategory] || 0) + 1;

  // Phone Validation
  let phoneValid = true;
  if (!phone || phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
    phoneValid = false;
    validationNote += (validationNote === 'VALID' ? 'FLAGGED: ' : '; ') + 'Invalid Phone Number (' + (r['Contact No.'] || 'Empty') + ')';
  }

  const studentObj = {
    'Row In Source': rowNum,
    'Registration No': regNo,
    'Student Name': studentName,
    "Father's Name": fatherName,
    'Date of Birth': dob,
    'Aadhar Number': aadhar,
    'Phone Number': phone,
    'Phone Valid': phoneValid ? 'YES' : 'NO',
    'School / College': schoolName,
    'Class': className,
    'Event Category': eventCategory,
    'Participation Type': participationType,
    'Validation Status': validationNote,
    'WhatsApp Delivery Status': 'PENDING',
    'Seat Number': 'TBD'
  };

  masterStudents.push(studentObj);

  // Groupings
  if (eventCategory === 'ONLINE QUIZ') {
    onlineQuizStudents.push(studentObj);
  } else if (participationType === 'MULTIPLE') {
    multipleEventStudents.push(studentObj);
  } else if (eventCategory !== 'MISSING_EVENT') {
    otherEventStudents.push(studentObj);
  }

  // Duplicate / Sibling Review
  if (phone && phoneCounts[phone] > 1) {
    duplicateReviewStudents.push({
      ...studentObj,
      'Review Reason': `Shared contact phone (${phone}) with ${phoneCounts[phone]} registrations (Likely siblings/family)`
    });
  } else if (eventCategory === 'MISSING_EVENT' || !phoneValid) {
    duplicateReviewStudents.push({
      ...studentObj,
      'Review Reason': validationNote
    });
  }
});

// Category Summary Sheet Data
const categorySummaryList = Object.keys(categorySummaryCounts).sort().map(cat => ({
  'Event / Category Name': cat,
  'Student Count': categorySummaryCounts[cat],
  'Percentage (%)': ((categorySummaryCounts[cat] / rawData.length) * 100).toFixed(2) + '%'
}));

categorySummaryList.push({
  'Event / Category Name': '--- TOTAL VERIFIED ENTRIES ---',
  'Student Count': rawData.length,
  'Percentage (%)': '100.00%'
});

// Create Output Workbook
const outWb = XLSX.utils.book_new();

// 1. Master Students
const wsMaster = XLSX.utils.json_to_sheet(masterStudents);
XLSX.utils.book_append_sheet(outWb, wsMaster, 'Master Students');

// 2. Online Quiz
const wsQuiz = XLSX.utils.json_to_sheet(onlineQuizStudents);
XLSX.utils.book_append_sheet(outWb, wsQuiz, 'Online Quiz');

// 3. Other Events
const wsOther = XLSX.utils.json_to_sheet(otherEventStudents);
XLSX.utils.book_append_sheet(outWb, wsOther, 'Other Events');

// 4. Multiple Events
const wsMultiple = XLSX.utils.json_to_sheet(multipleEventStudents);
XLSX.utils.book_append_sheet(outWb, wsMultiple, 'Multiple Events');

// 5. Duplicate Review
const wsDup = XLSX.utils.json_to_sheet(duplicateReviewStudents);
XLSX.utils.book_append_sheet(outWb, wsDup, 'Duplicate Review');

// 6. Category Summary
const wsSummary = XLSX.utils.json_to_sheet(categorySummaryList);
XLSX.utils.book_append_sheet(outWb, wsSummary, 'Category Summary');

// 7. Messaging Log (Template)
const messagingLogHeaders = [
  {
    'Campaign ID': 'CMP_20261101_INIT',
    'Registration No': 'MS261101140',
    'Student Name': 'SAMPLE STUDENT',
    'Phone Number': '9876543210',
    'Event Category': 'ONLINE QUIZ',
    'Message Template': 'mindspark_admit_card_notification',
    'Scheduled At': '2026-10-23 09:00:00',
    'Sent At': '',
    'Provider Message ID': '',
    'Status': 'PENDING_APPROVAL',
    'Error Details': ''
  }
];
const wsMsg = XLSX.utils.json_to_sheet(messagingLogHeaders);
XLSX.utils.book_append_sheet(outWb, wsMsg, 'Messaging Log');

// 8. Seating Plan (Template)
const seatingPlanHeaders = [
  {
    'Room / Hall No': 'Hall A (Ground Floor)',
    'Event Category': 'ONLINE QUIZ',
    'Total Capacity': 100,
    'Assigned Students': 100,
    'Seat Number Range': 'A-001 to A-100',
    'Invigilator': 'TBD',
    'Status': 'DRAFT_ALLOCATION'
  },
  {
    'Room / Hall No': 'Hall B (First Floor)',
    'Event Category': 'ONLINE QUIZ',
    'Total Capacity': 80,
    'Assigned Students': 70,
    'Seat Number Range': 'B-001 to B-070',
    'Invigilator': 'TBD',
    'Status': 'DRAFT_ALLOCATION'
  },
  {
    'Room / Hall No': 'Drawing Hall C',
    'Event Category': 'PAINT YOUR IMAGINATION / POSTER ARTIST',
    'Total Capacity': 50,
    'Assigned Students': 31,
    'Seat Number Range': 'C-001 to C-031',
    'Invigilator': 'TBD',
    'Status': 'DRAFT_ALLOCATION'
  }
];
const wsSeating = XLSX.utils.json_to_sheet(seatingPlanHeaders);
XLSX.utils.book_append_sheet(outWb, wsSeating, 'Seating Plan');

// Save Master Report
const outPath = path.join(process.cwd(), 'Master_Student_Category_Report_2026.xlsx');
XLSX.writeFile(outWb, outPath);

console.log('SUCCESS: Master Workbook generated at:', outPath);
console.log('Sheet Stats:');
console.log(' - Master Students:', masterStudents.length);
console.log(' - Online Quiz:', onlineQuizStudents.length);
console.log(' - Other Events:', otherEventStudents.length);
console.log(' - Multiple Events:', multipleEventStudents.length);
console.log(' - Duplicate / Flagged Review:', duplicateReviewStudents.length);
console.log(' - Category Summary entries:', categorySummaryList.length);
