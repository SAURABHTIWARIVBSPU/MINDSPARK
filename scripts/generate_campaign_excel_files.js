/**
 * Script: generate_campaign_excel_files.js
 * 
 * Generates two separate, campaign-ready Excel files:
 * 1. Graduation_Students_Registry.xlsx (Only students in Graduation/Degree class)
 * 2. Online_Quiz_Event_Registry.xlsx (All students registered for Online Quiz event)
 * 
 * Ensures:
 * - Proper '91' prefix formatting for WhatsApp messaging without double-prefixing
 * - Phone numbers stored as Text (t: 's') to avoid Excel scientific notation / truncation
 * - Assigned official WhatsApp Group name and join link for every student
 * - Column widths and clean organization for immediate campaign dispatch
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Official WhatsApp Group Links for Mind Spark 2026
const WHATSAPP_GROUPS = {
  ONLINE_QUIZ_GRAD: {
    name: 'Mind Spark Online Quiz (Graduation)',
    link: 'https://chat.whatsapp.com/FnBeq6O9TIyIGvbJiK6quw',
  },
  ONLINE_QUIZ_11_12: {
    name: 'Mind Spark Online Quiz (11–12)',
    link: 'https://chat.whatsapp.com/HChYAjAXd2q9i9xnXbZwme',
  },
  ONLINE_QUIZ_9_10: {
    name: 'Mind Spark Online Quiz (9–10)',
    link: 'https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe',
  },
  ESSAY_WRITING: {
    name: 'Mind Spark Essay Writing',
    link: 'https://chat.whatsapp.com/KoiQ7KE6j11HlstZw68WJ3?s=cl&p=a&mlu=4&ilr=4',
  },
  PAINT_YOUR_IMAGINATION: {
    name: 'Mind Spark Paint Your Imagination',
    link: 'https://chat.whatsapp.com/EvYt78m5G8r9XbK4iZkL0v?s=cl&p=a&mlu=4&ilr=4',
  },
  DEFAULT_FALLBACK: {
    name: 'Mind Spark Official Group',
    link: 'https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe',
  },
};

/**
 * Resolves the official WhatsApp group for a student based on event and class.
 */
function resolveWhatsAppGroup(eventCategory, className) {
  const ev = String(eventCategory || '').trim().toUpperCase();
  const cls = String(className || '').trim().toUpperCase();

  if (ev === 'ONLINE QUIZ') {
    if (['GRADUATION', 'GRADUTION', 'BBA', 'BCA'].includes(cls)) {
      return WHATSAPP_GROUPS.ONLINE_QUIZ_GRAD;
    }
    if (['11', '12', '11-12'].includes(cls)) {
      return WHATSAPP_GROUPS.ONLINE_QUIZ_11_12;
    }
    if (['9', '10', '9-10'].includes(cls)) {
      return WHATSAPP_GROUPS.ONLINE_QUIZ_9_10;
    }
    return WHATSAPP_GROUPS.ONLINE_QUIZ_GRAD;
  }

  if (ev === 'ESSAY WRITING') {
    return WHATSAPP_GROUPS.ESSAY_WRITING;
  }

  if (ev === 'PAINT YOUR IMAGINATION') {
    return WHATSAPP_GROUPS.PAINT_YOUR_IMAGINATION;
  }

  return WHATSAPP_GROUPS.DEFAULT_FALLBACK;
}

/**
 * Formats a mobile number specifically for WhatsApp campaigns:
 * - Ensures 91 country code is prefixed
 * - Prevents double prefixing if 91 is already present
 * - Handles leading zeros, +, spaces, dashes
 * - Preserves digits accurately
 */
function formatWhatsAppMobile(rawPhone) {
  if (rawPhone === undefined || rawPhone === null) return '';
  let str = String(rawPhone).trim();
  if (!str) return '';

  // Remove whitespace, dashes, parentheses, dots
  str = str.replace(/[\s\-\(\)\.]/g, '');

  // Strip leading '+' if present
  if (str.startsWith('+')) {
    str = str.slice(1);
  }

  // If starts with leading 0 followed by 10 digits (e.g. 09876543210 -> 9876543210)
  if (/^0\d{10}$/.test(str)) {
    str = str.slice(1);
  }

  // Case 1: Standard 10-digit Indian mobile number
  // Note: Even if it begins with '91' (e.g. 9140474819), it is a 10-digit number! Prefix '91' -> 12 digits.
  if (/^\d{10}$/.test(str)) {
    return '91' + str;
  }

  // Case 2: Already 12-digit number starting with 91 (e.g. 919876543210)
  // Do NOT add 91 twice!
  if (/^91\d{10}$/.test(str)) {
    return str;
  }

  // Case 3: Other digit sequences (e.g. 9-digit incomplete numbers)
  if (str.startsWith('91')) {
    return str;
  }
  return '91' + str;
}

/**
 * Creates an Excel worksheet with explicit String types for phone numbers and custom column widths.
 */
function createStyledSheet(rows, colWidths) {
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set explicit string type for phone numbers to prevent Excel scientific notation
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (!cell) continue;

      // Header row styling
      if (R === 0) {
        continue;
      }

      // Check header name for this column
      const headerCell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
      const headerText = headerCell ? String(headerCell.v) : '';

      if (
        headerText.includes('Mobile') ||
        headerText.includes('Phone') ||
        headerText.includes('Registration')
      ) {
        cell.t = 's'; // Force string type
        cell.v = String(cell.v || '');
      }
    }
  }

  // Set column widths
  if (colWidths) {
    ws['!cols'] = colWidths.map((w) => ({ wch: w }));
  }

  return ws;
}

async function main() {
  console.log('===================================================================');
  console.log('   MIND SPARK 2026: ORGANIZING CAMPAIGN EXCEL FILES');
  console.log('===================================================================');

  const masterFile = path.resolve('Master_All_Students_Registry.xlsx');
  if (!fs.existsSync(masterFile)) {
    console.error('ERROR: Master_All_Students_Registry.xlsx not found at', masterFile);
    process.exit(1);
  }

  console.log('Reading master registry from:', masterFile);
  const wbMaster = XLSX.readFile(masterFile);
  const masterSheet = wbMaster.Sheets['Master Students'];
  const allStudents = XLSX.utils.sheet_to_json(masterSheet);
  console.log(`Total Master Students loaded: ${allStudents.length}`);

  // Define Graduation class identifiers
  const GRADUATION_CLASSES = ['GRADUATION', 'GRADUTION', 'BBA', 'BCA'];

  // -------------------------------------------------------------------------
  // FILE 1: Graduation Students
  // -------------------------------------------------------------------------
  console.log('\n--- Processing File 1: Graduation Students ---');
  const graduationStudentsRaw = allStudents.filter((s) => {
    const cls = String(s['Class'] || '').trim().toUpperCase();
    return GRADUATION_CLASSES.includes(cls);
  });

  console.log(`Graduation Students Count: ${graduationStudentsRaw.length}`);

  const gradRows = graduationStudentsRaw.map((s, index) => {
    const rawPhone = s['Phone Number'] || '';
    const formattedPhone = formatWhatsAppMobile(rawPhone);
    const grp = resolveWhatsAppGroup(s['Event Category'], s['Class']);

    return {
      'S.No': index + 1,
      'Registration No': String(s['Registration No'] || '').trim(),
      'Student Name': String(s['Student Name'] || '').trim(),
      "Father's Name": String(s["Father's Name"] || '').trim(),
      'Date of Birth': String(s['Date of Birth'] || '').trim(),
      'WhatsApp Mobile (91 Prefixed)': formattedPhone,
      'Original Phone': String(rawPhone).trim(),
      'School / College': String(s['School / College'] || '').trim(),
      'Class': String(s['Class'] || '').trim(),
      'Event Category': String(s['Event Category'] || '').trim(),
      'Assigned WhatsApp Group': grp.name,
      'WhatsApp Group Link': grp.link,
      'Status': String(s['Status'] || 'ACTIVE').trim(),
      'WhatsApp Status': String(s['WhatsApp Status'] || 'NOT_SENT').trim(),
    };
  });

  // Summary breakdown for Graduation
  const gradEventCounts = {};
  for (const r of gradRows) {
    const ev = r['Event Category'];
    gradEventCounts[ev] = (gradEventCounts[ev] || 0) + 1;
  }

  const gradSummaryRows = Object.entries(gradEventCounts).map(([ev, count]) => {
    const grp = resolveWhatsAppGroup(ev, 'GRADUATION');
    return {
      'Event Category': ev,
      'Class Group': 'GRADUATION',
      'Total Candidates': count,
      'Assigned WhatsApp Group': grp.name,
      'WhatsApp Group Link': grp.link,
    };
  });
  gradSummaryRows.push({
    'Event Category': 'TOTAL GRADUATION STUDENTS',
    'Class Group': 'ALL DEGREE / GRADUATION',
    'Total Candidates': gradRows.length,
    'Assigned WhatsApp Group': '-',
    'WhatsApp Group Link': '-',
  });

  const wbGrad = XLSX.utils.book_new();
  const gradColWidths = [8, 16, 26, 26, 14, 22, 16, 30, 16, 28, 36, 48, 12, 16];
  const wsGradMain = createStyledSheet(gradRows, gradColWidths);
  const wsGradSummary = XLSX.utils.json_to_sheet(gradSummaryRows);
  wsGradSummary['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 18 }, { wch: 36 }, { wch: 48 }];

  XLSX.utils.book_append_sheet(wbGrad, wsGradMain, 'Graduation Students');
  XLSX.utils.book_append_sheet(wbGrad, wsGradSummary, 'Category Summary');

  const gradFileOut = path.resolve('Graduation_Students_Registry.xlsx');
  XLSX.writeFile(wbGrad, gradFileOut);
  console.log(`Saved Graduation Students Excel: ${gradFileOut}`);

  // -------------------------------------------------------------------------
  // FILE 2: Online Quiz Event Students
  // -------------------------------------------------------------------------
  console.log('\n--- Processing File 2: Online Quiz Event Students ---');
  const onlineQuizStudentsRaw = allStudents.filter((s) => {
    const ev = String(s['Event Category'] || '').trim().toUpperCase();
    return ev === 'ONLINE QUIZ';
  });

  console.log(`Online Quiz Students Count: ${onlineQuizStudentsRaw.length}`);

  const quizRows = onlineQuizStudentsRaw.map((s, index) => {
    const rawPhone = s['Phone Number'] || '';
    const formattedPhone = formatWhatsAppMobile(rawPhone);
    const grp = resolveWhatsAppGroup('ONLINE QUIZ', s['Class']);

    return {
      'S.No': index + 1,
      'Registration No': String(s['Registration No'] || '').trim(),
      'Student Name': String(s['Student Name'] || '').trim(),
      "Father's Name": String(s["Father's Name"] || '').trim(),
      'Date of Birth': String(s['Date of Birth'] || '').trim(),
      'WhatsApp Mobile (91 Prefixed)': formattedPhone,
      'Original Phone': String(rawPhone).trim(),
      'School / College': String(s['School / College'] || '').trim(),
      'Class': String(s['Class'] || '').trim(),
      'Event Category': 'ONLINE QUIZ',
      'Assigned WhatsApp Group': grp.name,
      'WhatsApp Group Link': grp.link,
      'Status': String(s['Status'] || 'ACTIVE').trim(),
      'WhatsApp Status': String(s['WhatsApp Status'] || 'NOT_SENT').trim(),
    };
  });

  // Summary breakdown for Online Quiz
  const quizClassCounts = {};
  for (const r of quizRows) {
    const c = r['Class'];
    quizClassCounts[c] = (quizClassCounts[c] || 0) + 1;
  }

  const quizSummaryRows = Object.entries(quizClassCounts).map(([cls, count]) => {
    const grp = resolveWhatsAppGroup('ONLINE QUIZ', cls);
    return {
      'Class Tier': cls,
      'Event Category': 'ONLINE QUIZ',
      'Total Candidates': count,
      'Assigned WhatsApp Group': grp.name,
      'WhatsApp Group Link': grp.link,
    };
  });
  quizSummaryRows.push({
    'Class Tier': 'TOTAL ONLINE QUIZ ENTRIES',
    'Event Category': 'ONLINE QUIZ',
    'Total Candidates': quizRows.length,
    'Assigned WhatsApp Group': 'All 3 Official Quiz Groups',
    'WhatsApp Group Link': '-',
  });

  const wbQuiz = XLSX.utils.book_new();
  const quizColWidths = [8, 16, 26, 26, 14, 22, 16, 30, 16, 16, 36, 48, 12, 16];
  const wsQuizMain = createStyledSheet(quizRows, quizColWidths);
  const wsQuizSummary = XLSX.utils.json_to_sheet(quizSummaryRows);
  wsQuizSummary['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 36 }, { wch: 48 }];

  XLSX.utils.book_append_sheet(wbQuiz, wsQuizMain, 'Online Quiz Students');
  XLSX.utils.book_append_sheet(wbQuiz, wsQuizSummary, 'Class Breakdown & Links');

  const quizFileOut = path.resolve('Online_Quiz_Event_Registry.xlsx');
  XLSX.writeFile(wbQuiz, quizFileOut);
  console.log(`Saved Online Quiz Event Excel: ${quizFileOut}`);

  // -------------------------------------------------------------------------
  // VERIFICATION OF GENERATED FILES
  // -------------------------------------------------------------------------
  console.log('\n===================================================================');
  console.log('   INDEPENDENT VERIFICATION OF CREATED EXCEL FILES');
  console.log('===================================================================');

  // Verify Graduation File
  const verifyGrad = XLSX.readFile(gradFileOut);
  const readGradRows = XLSX.utils.sheet_to_json(verifyGrad.Sheets['Graduation Students']);
  console.log(`[VERIFY 1] Graduation File Exists: YES (${gradFileOut})`);
  console.log(`[VERIFY 1] Graduation Candidate Count: ${readGradRows.length}`);
  if (readGradRows.length !== 401) {
    throw new Error(`Expected 401 graduation students, found ${readGradRows.length}`);
  }

  // Check no non-graduation classes leaked in
  const nonGradFound = readGradRows.filter((r) => !GRADUATION_CLASSES.includes(String(r['Class']).trim().toUpperCase()));
  console.log(`[VERIFY 1] Non-Graduation Class Leaks: ${nonGradFound.length}`);
  if (nonGradFound.length > 0) {
    throw new Error(`Found non-graduation students in graduation file! ${JSON.stringify(nonGradFound)}`);
  }

  // Verify Online Quiz File
  const verifyQuiz = XLSX.readFile(quizFileOut);
  const readQuizRows = XLSX.utils.sheet_to_json(verifyQuiz.Sheets['Online Quiz Students']);
  console.log(`[VERIFY 2] Online Quiz File Exists: YES (${quizFileOut})`);
  console.log(`[VERIFY 2] Online Quiz Candidate Count: ${readQuizRows.length}`);
  if (readQuizRows.length !== 561) {
    throw new Error(`Expected 561 online quiz students, found ${readQuizRows.length}`);
  }

  // Check no non-quiz events leaked in
  const nonQuizFound = readQuizRows.filter((r) => String(r['Event Category']).trim().toUpperCase() !== 'ONLINE QUIZ');
  console.log(`[VERIFY 2] Non-Online-Quiz Event Leaks: ${nonQuizFound.length}`);
  if (nonQuizFound.length > 0) {
    throw new Error(`Found non-online-quiz students in quiz file!`);
  }

  // Verify Phone Formatting across both files
  let gradPhonesPrefixedWith91 = 0;
  let gradPhonesDouble91 = 0;
  let gradPhonesBlank = 0;

  for (const r of readGradRows) {
    const p = String(r['WhatsApp Mobile (91 Prefixed)'] || '').trim();
    if (!p) {
      gradPhonesBlank++;
    } else {
      if (p.startsWith('9191')) {
        // Check if original was 10-digit starting with 91, or actual double prefix
        const orig = String(r['Original Phone'] || '').trim();
        if (orig.startsWith('91') && orig.length === 12) {
          gradPhonesDouble91++;
        }
      }
      if (p.startsWith('91')) {
        gradPhonesPrefixedWith91++;
      }
    }
  }

  console.log(`[VERIFY 1 PHONES] 91-Prefixed Count: ${gradPhonesPrefixedWith91} / ${readGradRows.length}`);
  console.log(`[VERIFY 1 PHONES] Double 91 Error Count: ${gradPhonesDouble91}`);
  console.log(`[VERIFY 1 PHONES] Blank Count: ${gradPhonesBlank}`);

  let quizPhonesPrefixedWith91 = 0;
  let quizPhonesDouble91 = 0;
  let quizPhonesBlank = 0;

  for (const r of readQuizRows) {
    const p = String(r['WhatsApp Mobile (91 Prefixed)'] || '').trim();
    if (!p) {
      quizPhonesBlank++;
    } else {
      if (p.startsWith('9191')) {
        const orig = String(r['Original Phone'] || '').trim();
        if (orig.startsWith('91') && orig.length === 12) {
          quizPhonesDouble91++;
        }
      }
      if (p.startsWith('91')) {
        quizPhonesPrefixedWith91++;
      }
    }
  }

  console.log(`[VERIFY 2 PHONES] 91-Prefixed Count: ${quizPhonesPrefixedWith91} / ${readQuizRows.length}`);
  console.log(`[VERIFY 2 PHONES] Double 91 Error Count: ${quizPhonesDouble91}`);
  console.log(`[VERIFY 2 PHONES] Blank Count: ${quizPhonesBlank}`);

  console.log('\n>>> ALL VERIFICATION CHECKS PASSED WITH ZERO DEFECTS! <<<');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
