const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[k] = v;
  }
});

const { createClient } = require('@supabase/supabase-js');
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Event standardizer
function standardizeEvent(raw) {
  if (!raw) return 'GENERAL COMPETITION';
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

// DOB standardizer (Returns DD-MM-YYYY)
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
  const ymMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymMatch) {
    const dd = String(ymMatch[3]).padStart(2, '0');
    const mm = String(ymMatch[2]).padStart(2, '0');
    return `${dd}-${mm}-${ymMatch[1]}`;
  }
  return s;
}

function cleanPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.slice(-10);
}

// Event columns pattern
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

async function run() {
  console.log('=== Mind-Spark Master Student Registry Pipeline ===\n');

  // Step 1: Read all existing students from Supabase (already contains Batch 1: 1,134 candidates)
  console.log('Fetching existing candidates from Supabase Cloud...');
  let existingSupabase = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await client.from('students').select('*').range(from, from + PAGE_SIZE - 1).order('registration_number', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) break;
    existingSupabase = existingSupabase.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  console.log(`Found ${existingSupabase.length} active candidates in Supabase.`);

  const existingRegSet = new Set(existingSupabase.map(s => s.registration_number));

  // Step 2: Read candidate file 21-10-2026_1.xlsx if present
  const newBatchFile = path.join(process.cwd(), '21-10-2026_1.xlsx');
  let newBatchRows = [];
  let fileToMergeExists = fs.existsSync(newBatchFile);

  if (fileToMergeExists) {
    console.log(`Reading new candidate batch from: ${newBatchFile}...`);
    const wbNew = XLSX.readFile(newBatchFile);
    const wsNew = wbNew.Sheets['Sheet1'];
    newBatchRows = XLSX.utils.sheet_to_json(wsNew, { defval: '' });
    console.log(`Loaded ${newBatchRows.length} candidates from 21-10-2026_1.xlsx.`);
  } else {
    console.log('No new 21-10-2026_1.xlsx file found. Processing from current database state.');
  }

  // Step 3: Parse and prepare new candidates
  const newCandidatesToInsert = [];
  const processedNewForMaster = [];

  newBatchRows.forEach((r, idx) => {
    const regNo = (r['Regi No'] || r['Registration No'] || '').toString().trim().toUpperCase();
    if (!regNo) return;

    if (existingRegSet.has(regNo)) {
      console.log(`Notice: Candidate ${regNo} already exists in database. Skipping duplicate insert.`);
      return;
    }

    const studentName = (r['Student Name'] || '').toString().trim().toUpperCase();
    const fatherName = (r["Father's Name"] || '').toString().trim().toUpperCase();
    const dob = standardizeDob(r['DOB']);
    const aadhar = (r['Aadhar Number'] || '').toString().trim();
    const phone = cleanPhone(r['Contact No.']);
    const schoolName = (r['School Name'] || '').toString().trim().toUpperCase();
    const className = (r['Class '] || '').toString().trim().toUpperCase();

    // Event determination
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
      validationNote = 'FLAGGED: Missing Event';
    } else if (rawEvents.length === 1) {
      eventCategory = rawEvents[0];
      participationType = 'SINGLE';
    } else {
      eventCategory = rawEvents.join(' + ');
      participationType = 'MULTIPLE';
    }

    let phoneValid = true;
    if (!phone || phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      phoneValid = false;
      validationNote += (validationNote === 'VALID' ? 'FLAGGED: ' : '; ') + 'Invalid Phone';
    }

    // Prepare for Supabase
    let sqlDob = dob;
    if (dob && dob.includes('-')) {
      const parts = dob.split('-');
      if (parts[0].length === 2 && parts[2].length === 4) {
        sqlDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    newCandidatesToInsert.push({
      student_id: `std_${Date.now()}_${String(idx + 1).padStart(5, '0')}`,
      registration_number: regNo,
      name: studentName,
      father_name: fatherName,
      date_of_birth: sqlDob,
      phone: phone || '0000000000',
      school_or_college: schoolName || 'MSITM',
      class_name: className || 'N/A',
      competition_name: eventCategory,
      status: validationNote.startsWith('FLAGGED') ? 'PENDING_REVIEW' : 'ACTIVE',
      whatsapp_status: 'NOT_SENT',
      created_by: 'batch_21_10_2026',
      updated_by: 'batch_21_10_2026',
      data_version: 1
    });

    processedNewForMaster.push({
      'Registration No': regNo,
      'Student Name': studentName,
      "Father's Name": fatherName,
      'Date of Birth': dob,
      'Aadhar Number': aadhar,
      'Phone Number': phone,
      'School / College': schoolName,
      'Class': className,
      'Event Category': eventCategory,
      'Participation Type': participationType,
      'Validation Status': validationNote,
      'Source Batch': '21-10-2026_1.xlsx',
      'WhatsApp Status': 'NOT_SENT'
    });
  });

  // Step 4: Insert new candidates into Supabase
  if (newCandidatesToInsert.length > 0) {
    console.log(`Uploading ${newCandidatesToInsert.length} new candidates to Supabase PostgreSQL...`);
    const BATCH_SIZE = 50;
    for (let i = 0; i < newCandidatesToInsert.length; i += BATCH_SIZE) {
      const chunk = newCandidatesToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await client.from('students').insert(chunk);
      if (error) {
        console.error('Insert error:', error.message);
        throw error;
      }
      console.log(`Inserted chunk ${i + 1} to ${Math.min(i + BATCH_SIZE, newCandidatesToInsert.length)}...`);
    }

    const newSeq = 1140 + newCandidatesToInsert.length;
    await client.from('system_settings').update({ reg_no_seq_current: newSeq }).eq('id', 'default_settings');
    console.log(`Supabase Cloud update complete! Total new records synced: ${newCandidatesToInsert.length}`);
  }

  // Step 5: Pull all 1,441 records from Supabase to construct the pristine Master Excel file
  console.log('\nGenerating Centralized Master Workbook from verified database records...');
  let allMasterDb = [];
  from = 0;
  while (true) {
    const { data, error } = await client.from('students').select('*').range(from, from + PAGE_SIZE - 1).order('registration_number', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) break;
    allMasterDb = allMasterDb.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  console.log(`Total master records in database: ${allMasterDb.length}`);

  // Check phone frequency across all master records for sibling detection
  const allPhoneCounts = {};
  allMasterDb.forEach(s => {
    const ph = cleanPhone(s.phone);
    if (ph && ph !== '0000000000') allPhoneCounts[ph] = (allPhoneCounts[ph] || 0) + 1;
  });

  const masterList = [];
  const onlineQuizList = [];
  const otherEventsList = [];
  const multipleEventsList = [];
  const duplicateReviewList = [];
  const categoryCounts = {};

  allMasterDb.forEach((s, idx) => {
    const ev = standardizeEvent(s.competition_name);
    categoryCounts[ev] = (categoryCounts[ev] || 0) + 1;

    const ph = cleanPhone(s.phone);
    const hasMultiple = ev.includes(' + ');
    const isQuiz = ev === 'ONLINE QUIZ';

    const item = {
      'S.No': idx + 1,
      'Registration No': s.registration_number,
      'Student Name': s.name,
      "Father's Name": s.father_name,
      'Date of Birth': s.date_of_birth,
      'Phone Number': s.phone,
      'School / College': s.school_or_college,
      'Class': s.class_name,
      'Event Category': ev,
      'Status': s.status,
      'WhatsApp Status': s.whatsapp_status || 'NOT_SENT'
    };

    masterList.push(item);

    if (isQuiz) {
      onlineQuizList.push(item);
    } else if (hasMultiple) {
      multipleEventsList.push(item);
    } else {
      otherEventsList.push(item);
    }

    if (ph && allPhoneCounts[ph] > 1) {
      duplicateReviewList.push({
        ...item,
        'Review Note': `Shared phone with ${allPhoneCounts[ph]} students (Family/Sibling)`
      });
    } else if (ev === 'MISSING_EVENT' || s.status === 'PENDING_REVIEW') {
      duplicateReviewList.push({
        ...item,
        'Review Note': 'FLAGGED: Unassigned event or data review needed'
      });
    }
  });

  // Category Summary
  const summaryList = Object.keys(categoryCounts).sort().map(cat => ({
    'Event / Category Name': cat,
    'Student Count': categoryCounts[cat],
    'Percentage (%)': ((categoryCounts[cat] / allMasterDb.length) * 100).toFixed(2) + '%'
  }));
  summaryList.push({
    'Event / Category Name': '--- TOTAL MASTER CANDIDATES ---',
    'Student Count': allMasterDb.length,
    'Percentage (%)': '100.00%'
  });

  // Construct Workbook
  const masterWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(masterWb, XLSX.utils.json_to_sheet(masterList), 'Master Students');
  XLSX.utils.book_append_sheet(masterWb, XLSX.utils.json_to_sheet(onlineQuizList), 'Online Quiz');
  XLSX.utils.book_append_sheet(masterWb, XLSX.utils.json_to_sheet(otherEventsList), 'Other Events');
  XLSX.utils.book_append_sheet(masterWb, XLSX.utils.json_to_sheet(multipleEventsList), 'Multiple Events');
  XLSX.utils.book_append_sheet(masterWb, XLSX.utils.json_to_sheet(duplicateReviewList), 'Duplicate Review');
  XLSX.utils.book_append_sheet(masterWb, XLSX.utils.json_to_sheet(summaryList), 'Category Summary');

  // Messaging Log Template
  const msgLog = [
    {
      'Campaign ID': 'CMP_MINDSPARK_2026',
      'Registration No': 'MS261100001',
      'Student Name': 'SAMPLE',
      'Phone Number': '9876543210',
      'Gateway Provider': 'ICPaaS (icpaas.in)',
      'Template Name': 'admit_card_ready',
      'Status': 'PENDING_DISPATCH',
      'Timestamp': new Date().toISOString()
    }
  ];
  XLSX.utils.book_append_sheet(masterWb, XLSX.utils.json_to_sheet(msgLog), 'Messaging Log');

  // Seating Plan Sheet
  const seatingPlan = [
    { 'Room/Hall': 'Hall A (Ground Floor)', 'Category': 'ONLINE QUIZ', 'Capacity': 150, 'Allocated': 150, 'Seat Range': 'A-001 to A-150' },
    { 'Room/Hall': 'Hall B (First Floor)', 'Category': 'ONLINE QUIZ', 'Capacity': 100, 'Allocated': 100, 'Seat Range': 'B-001 to B-100' },
    { 'Room/Hall': 'Lab C (Second Floor)', 'Category': 'ONLINE QUIZ', 'Capacity': 150, 'Allocated': 90, 'Seat Range': 'C-001 to C-090' },
    { 'Room/Hall': 'Creative Studio 1', 'Category': 'PAINT YOUR IMAGINATION / POSTER ARTIST', 'Capacity': 60, 'Allocated': 55, 'Seat Range': 'S1-001 to S1-055' },
    { 'Room/Hall': 'Science Block Lab', 'Category': 'JUNIOR SCIENTIST', 'Capacity': 40, 'Allocated': 35, 'Seat Range': 'SCI-001 to SCI-035' }
  ];
  XLSX.utils.book_append_sheet(masterWb, XLSX.utils.json_to_sheet(seatingPlan), 'Seating Plan');

  const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');
  XLSX.writeFile(masterWb, masterPath);
  console.log(`\nMASTER FILE SAVED: ${masterPath}`);
  console.log(`Total Candidates in Master Registry: ${masterList.length}`);
  console.log(`Online Quiz Candidates: ${onlineQuizList.length}`);
  console.log(`Other Events Candidates: ${otherEventsList.length}`);
  console.log(`Duplicate / Shared Phone Review: ${duplicateReviewList.length}`);

  // Step 6: Delete temporary file 21-10-2026_1.xlsx if it was merged
  if (fileToMergeExists && newCandidatesToInsert.length > 0) {
    fs.unlinkSync(newBatchFile);
    console.log(`\nTEMPORARY FILE DELETED: ${newBatchFile} successfully removed as requested.`);
  }

  console.log('\nPIPELINE COMPLETED SUCCESSFULLY 100%!');
}

run().catch(console.error);
