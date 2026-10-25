const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// 1. Load env
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function parseDob(raw, className) {
  if (!raw) {
    if (className === 'UKG') return '2019-01-01';
    if (className === 'LKG') return '2020-01-01';
    if (className === 'Nursery') return '2021-01-01';
    if (className === 'Play Group') return '2022-01-01';
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

function normalizeClass(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (s === 'PLAY GROUP' || s === 'PLAYGROUP') return 'Play Group';
  if (s === 'NURSERY' || s === 'NUR') return 'Nursery';
  if (s === 'LKG') return 'LKG';
  if (s === 'UKG') return 'UKG';
  if (s === 'GRADUATION' || s === 'GRAGUATION' || s.includes('BBA') || s.includes('BCA') || s.includes('COLLEGE')) return 'Graduation';
  const num = s.replace(/\D/g, '');
  if (num) return num;
  return s;
}

function normalizeCompetition(raw) {
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
  if (s.includes('ONLINE QUIZ')) return 'ONLINE QUIZ';
  if (s.includes('YOUNG INNOVAT')) return 'YOUNG INNOVATORS';
  if (s.includes('WRITING QUEST')) return 'WRITING QUEST';
  if (s.includes('ESSAY WRITING')) return 'ESSAY WRITING';
  if (s.includes('FANCY DRESS') || s.includes('HANDMADE FANCY')) return 'UNIQUE AND CREATIVE HANDMADE FANCY DRESS';
  return s;
}

function extractAllCandidates() {
  const wb3 = xlsx.readFile('CAndidate_data-3.xlsx');
  const wb4 = xlsx.readFile('candidate_data_4.xlsx');

  const candidates = [];
  const seenKey = new Set();

  function addFromWb(wb, source) {
    wb.SheetNames.forEach(sheet => {
      const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheet]);
      rows.forEach(r => {
        let rawComp = '';
        Object.keys(r).forEach(k => {
          if (k.toLowerCase().includes('quiz') ||
              k.toLowerCase().includes('colour') ||
              k.toLowerCase().includes('dots') ||
              k.toLowerCase().includes('picture') ||
              k.toLowerCase().includes('dress') ||
              k.toLowerCase().includes('clay') ||
              k.toLowerCase().includes('writing') ||
              k.toLowerCase().includes('paint') ||
              k.toLowerCase().includes('brain') ||
              k.toLowerCase().includes('poster') ||
              k.toLowerCase().includes('scientist') ||
              k.toLowerCase().includes('innovator') ||
              k.toLowerCase().includes('cooking') ||
              k.toLowerCase().includes('fancy')) {
            rawComp = r[k];
          }
        });

        const name = String(r['Student Name'] || r.Name || '').trim().toUpperCase();
        const phone = String(r['Contact No.'] || r['Contact No'] || r.Phone || '').replace(/\D/g, '').slice(-10);
        const father = String(r["Father's Name"] || r.FatherName || '').trim().toUpperCase();
        const rawClass = String(r['Class '] || r.Class || sheet).trim();
        const normClass = normalizeClass(rawClass);
        const normComp = normalizeCompetition(rawComp);
        const dob = parseDob(r.DOB || r['Date of Birth'], normClass);
        const school = String(r['School Name'] || r['School / College'] || '').trim().toUpperCase();
        const origReg = String(r.Registration || r.RegiNo || '').trim().toUpperCase();

        const dedupeKey = `${name}_${father}_${phone}_${normComp}`;
        if (seenKey.has(dedupeKey)) {
          return;
        }
        seenKey.add(dedupeKey);

        candidates.push({
          origReg,
          name,
          father,
          dob,
          phone,
          school,
          className: normClass,
          competitionName: normComp,
          sourceSheet: sheet,
          source
        });
      });
    });
  }

  addFromWb(wb3, 'candidate-3');
  addFromWb(wb4, 'candidate-4');

  return candidates;
}

async function run() {
  console.log('Extracting new candidate records...');
  const newCandidates = extractAllCandidates();
  console.log(`Extracted ${newCandidates.length} valid unique candidates.`);

  // 1. Read existing Master Excel
  const masterWb = xlsx.readFile('Master_All_Students_Registry.xlsx');
  const masterSheet = masterWb.Sheets['Master Students'];
  const masterRows = xlsx.utils.sheet_to_json(masterSheet);
  console.log(`Current Master rows in Excel: ${masterRows.length}`);

  const startSNo = masterRows.length + 1; // 1441
  const startSeq = 1447; // MS261101447

  // Assign sequential registration numbers
  const assignedCandidates = newCandidates.map((c, idx) => {
    const sNo = startSNo + idx;
    const seqNum = startSeq + idx;
    const regNo = `MS26110${seqNum}`;
    return {
      ...c,
      sNo,
      seqNum,
      registrationNumber: regNo,
      status: 'ACTIVE',
      whatsappStatus: 'NOT_SENT',
    };
  });

  const lastAssigned = assignedCandidates[assignedCandidates.length - 1];
  console.log(`First new assigned: S.No ${assignedCandidates[0].sNo}, Reg: ${assignedCandidates[0].registrationNumber}, Name: ${assignedCandidates[0].name}`);
  console.log(`Last new assigned: S.No ${lastAssigned.sNo}, Reg: ${lastAssigned.registrationNumber}, Name: ${lastAssigned.name}`);

  // 2. Insert into Supabase in batches of 100
  console.log('\nInserting candidates into Supabase students table...');
  const now = new Date().toISOString();
  const supabaseRows = assignedCandidates.map((c, idx) => ({
    student_id: `std_${Date.now()}_${String(idx + 1).padStart(5, '0')}`,
    registration_number: c.registrationNumber,
    name: c.name,
    father_name: c.father,
    date_of_birth: c.dob,
    phone: c.phone,
    school_or_college: c.school,
    class_name: c.className.toUpperCase(),
    competition_name: c.competitionName.toUpperCase(),
    status: 'ACTIVE',
    whatsapp_status: 'NOT_SENT',
    whatsapp_sent_at: null,
    source_import_id: 'batch_24_10_2026',
    created_at: now,
    created_by: 'batch_24_10_2026',
    updated_at: now,
    updated_by: 'batch_24_10_2026',
    data_version: 1,
  }));

  const BATCH_SIZE = 100;
  for (let i = 0; i < supabaseRows.length; i += BATCH_SIZE) {
    const batch = supabaseRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('students').insert(batch);
    if (error) {
      console.error(`Error inserting Supabase batch [${i} to ${i + batch.length}]:`, error.message);
      throw error;
    }
    console.log(`Inserted Supabase batch ${i + 1} - ${i + batch.length}`);
  }

  // Update system_settings reg_no_seq_current
  const { error: settingsErr } = await supabase
    .from('system_settings')
    .update({ reg_no_seq_current: lastAssigned.seqNum, updated_at: now })
    .eq('id', 'default_settings');

  if (settingsErr) {
    console.warn('Warning updating system_settings:', settingsErr.message);
  } else {
    console.log(`Updated system_settings reg_no_seq_current to ${lastAssigned.seqNum}`);
  }

  // 3. Update Master_All_Students_Registry.xlsx
  console.log('\nUpdating Master_All_Students_Registry.xlsx...');

  // Backup original Master Excel first!
  fs.copyFileSync('Master_All_Students_Registry.xlsx', 'Master_All_Students_Registry.xlsx.bak');
  console.log('Created backup: Master_All_Students_Registry.xlsx.bak');

  // Master Students sheet
  const newMasterRows = assignedCandidates.map(c => ({
    'S.No': c.sNo,
    'Registration No': c.registrationNumber,
    'Student Name': c.name,
    "Father's Name": c.father,
    'Date of Birth': c.dob,
    'Phone Number': c.phone,
    'School / College': c.school,
    'Class': c.className,
    'Event Category': c.competitionName,
    'Status': 'ACTIVE',
    'WhatsApp Status': 'NOT_SENT',
  }));

  const combinedMaster = [...masterRows, ...newMasterRows];
  masterWb.Sheets['Master Students'] = xlsx.utils.json_to_sheet(combinedMaster);

  // Online Quiz sheet
  if (masterWb.Sheets['Online Quiz']) {
    const quizRows = xlsx.utils.sheet_to_json(masterWb.Sheets['Online Quiz']);
    const newQuizRows = assignedCandidates
      .filter(c => c.competitionName === 'ONLINE QUIZ')
      .map(c => ({
        'S.No': quizRows.length + 1,
        'Registration No': c.registrationNumber,
        'Student Name': c.name,
        "Father's Name": c.father,
        'Date of Birth': c.dob,
        'Phone Number': c.phone,
        'School / College': c.school,
        'Class': c.className,
        'Event Category': c.competitionName,
        'Status': 'ACTIVE',
        'WhatsApp Status': 'NOT_SENT',
      }));
    const combinedQuiz = [...quizRows, ...newQuizRows];
    // re-index S.No
    combinedQuiz.forEach((r, idx) => r['S.No'] = idx + 1);
    masterWb.Sheets['Online Quiz'] = xlsx.utils.json_to_sheet(combinedQuiz);
    console.log(`Added ${newQuizRows.length} students to Online Quiz sheet. Total: ${combinedQuiz.length}`);
  }

  // Other Events sheet
  if (masterWb.Sheets['Other Events']) {
    const otherRows = xlsx.utils.sheet_to_json(masterWb.Sheets['Other Events']);
    const newOtherRows = assignedCandidates
      .filter(c => c.competitionName !== 'ONLINE QUIZ')
      .map(c => ({
        'S.No': otherRows.length + 1,
        'Registration No': c.registrationNumber,
        'Student Name': c.name,
        "Father's Name": c.father,
        'Date of Birth': c.dob,
        'Phone Number': c.phone,
        'School / College': c.school,
        'Class': c.className,
        'Event Category': c.competitionName,
        'Status': 'ACTIVE',
        'WhatsApp Status': 'NOT_SENT',
      }));
    const combinedOther = [...otherRows, ...newOtherRows];
    combinedOther.forEach((r, idx) => r['S.No'] = idx + 1);
    masterWb.Sheets['Other Events'] = xlsx.utils.json_to_sheet(combinedOther);
    console.log(`Added ${newOtherRows.length} students to Other Events sheet. Total: ${combinedOther.length}`);
  }

  // Category Summary sheet
  if (masterWb.Sheets['Category Summary']) {
    const summaryMap = {};
    combinedMaster.forEach(r => {
      const cat = r['Event Category'] || 'UNKNOWN';
      summaryMap[cat] = (summaryMap[cat] || 0) + 1;
    });
    const summaryRows = Object.keys(summaryMap).sort().map(cat => ({
      'Category': cat,
      'Total Candidates': summaryMap[cat]
    }));
    masterWb.Sheets['Category Summary'] = xlsx.utils.json_to_sheet(summaryRows);
  }

  xlsx.writeFile(masterWb, 'Master_All_Students_Registry.xlsx');
  console.log('Successfully written updated Master_All_Students_Registry.xlsx!');

  console.log('\n=== ALL DONE! ===');
  console.log(`Total students now in Master: ${combinedMaster.length}`);
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
