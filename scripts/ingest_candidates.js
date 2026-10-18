const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = path.join(process.cwd(), 'Candidate_data.xlsx');
if (!fs.existsSync(excelPath)) {
  console.error('Candidate_data.xlsx not found at', excelPath);
  process.exit(1);
}

console.log('Reading Excel file:', excelPath);
const wb = XLSX.readFile(excelPath);

// Competition standardizer
function standardizeCompetition(raw) {
  if (!raw) return 'GENERAL COMPETITION';
  const clean = String(raw).trim().toUpperCase().replace(/\s+/g, ' ');

  if (/FANCY DRESS/i.test(clean)) return 'UNIQUE AND CREATIVE HANDMADE FANCY DRESS';
  if (/COULOUR|COLOUR BY NUMBER/i.test(clean)) return 'COLOUR BY NUMBER';
  if (/JOIN THE DOTS/i.test(clean)) return 'JOIN THE DOTS AND COLOUR';
  if (/COMPLETE THE PICTURE/i.test(clean)) return 'COMPLETE THE PICTURE AND COLOUR';
  if (/CLAY CHAMP/i.test(clean)) return 'CLAY CHAMPS';
  if (/DREES|DRESS TO IMPRESS/i.test(clean)) return 'DRESS TO IMPRESS';
  if (/PAINT YOUR/i.test(clean)) return 'PAINT YOUR IMAGINATION';
  if (/WRITING STAR/i.test(clean)) return 'WRITING STARS';
  if (/BATTLE OF BRAIN/i.test(clean)) return 'BATTLE OF BRAINS';
  if (/POSTER ARTIST/i.test(clean)) return 'POSTER ARTIST';
  if (/FIRELESS|FIRE COOKING/i.test(clean)) return 'FIRELESS COOKING';
  if (/JUNIOR SCIENTIST/i.test(clean)) return 'JUNIOR SCIENTIST';
  if (/YOUNG INNOVATOR/i.test(clean)) return 'YOUNG INNOVATORS';
  if (/WRITING QUEST|WRITING QUIZ|THE WRITING/i.test(clean)) return 'WRITING QUEST';
  if (/ESSAY WRITING/i.test(clean)) return 'ESSAY WRITING';
  if (/ONLINE QUIZ/i.test(clean)) return 'ONLINE QUIZ';

  return clean;
}

// Class standardizer
function standardizeClass(raw, sheetName) {
  let val = String(raw || '').trim().toUpperCase();
  if (!val) val = String(sheetName || '').trim().toUpperCase();

  if (/PLAY/i.test(val)) return 'PLAY GROUP';
  if (/NURS/i.test(val)) return 'NURSERY';
  if (/LKG/i.test(val)) return 'LKG';
  if (/UKG/i.test(val)) return 'UKG';
  if (/GRAD/i.test(val)) return 'GRADUATION';
  if (val === 'SECOND' || val === '2ND') return '2';
  if (val === 'THIRD' || val === '3RD') return '3';
  return val;
}

// DOB standardizer (Returns YYYY-MM-DD)
function standardizeDob(raw) {
  if (!raw) return '2010-01-01';

  if (typeof raw === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(raw);
      if (d && d.y && d.m && d.d) {
        const mm = String(d.m).padStart(2, '0');
        const dd = String(d.d).padStart(2, '0');
        return `${d.y}-${mm}-${dd}`;
      }
    } catch {}
  }

  const s = String(raw).trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmMatch) {
    const dd = String(dmMatch[1]).padStart(2, '0');
    const mm = String(dmMatch[2]).padStart(2, '0');
    const yy = dmMatch[3];
    return `${yy}-${mm}-${dd}`;
  }

  // Match YYYY-MM-DD
  const ymMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymMatch) {
    const yy = ymMatch[1];
    const mm = String(ymMatch[2]).padStart(2, '0');
    const dd = String(ymMatch[3]).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  return s;
}

const rawList = [];
let totalRows = 0;

wb.SheetNames.forEach((sheetName) => {
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  rows.forEach((r, idx) => {
    totalRows++;
    const keys = Object.keys(r);
    const regNoKey = keys.find((k) => /reg/i.test(k)) || keys[0];
    const nameKey = keys.find((k) => /name/i.test(k) && !/father/i.test(k) && !/school/i.test(k)) || keys[1];
    const fatherKey = keys.find((k) => /father/i.test(k)) || keys[2];
    const dobKey = keys.find((k) => /dob|birth/i.test(k)) || keys[3];
    const phoneKey = keys.find((k) => /contact|phone|mob/i.test(k)) || keys[5];
    const schoolKey = keys.find((k) => /school|college/i.test(k)) || keys[6];
    const classKey = keys.find((k) => /class/i.test(k) && !/\(/i.test(k)) || keys[7];
    const compKey = keys.find((k) => /\(/i.test(k)) || keys[8];

    const rawReg = String(r[regNoKey] || '').trim().toUpperCase();
    const rawName = String(r[nameKey] || '').trim().toUpperCase();
    const rawFather = String(r[fatherKey] || '').trim().toUpperCase();
    const rawDob = r[dobKey];
    const rawPhone = String(r[phoneKey] || '').replace(/\D/g, '').slice(-10);
    const rawSchool = String(r[schoolKey] || '').trim().toUpperCase();
    const rawClass = r[classKey];
    const rawComp = r[compKey];

    if (!rawName) return; // skip blank row

    rawList.push({
      sheetName,
      rowIndex: idx + 2,
      rawReg,
      name: rawName,
      fatherName: rawFather,
      dob: standardizeDob(rawDob),
      phone: rawPhone,
      schoolOrCollege: rawSchool || 'MIND-SPARK AFFILIATED INSTITUTION',
      className: standardizeClass(rawClass, sheetName),
      competitionName: standardizeCompetition(rawComp),
    });
  });
});

console.log('Total Raw Rows Read:', totalRows);
console.log('Valid Non-Empty Rows:', rawList.length);

// Deduplication Logic:
// 1. If exact (name + fatherName + phone + dob) match, discard duplicate entry.
// 2. Resolve duplicate registration numbers.
const seenIdentity = new Map();
const dedupedList = [];
let duplicatesRemoved = 0;

for (const candidate of rawList) {
  // Identity key
  const idKey = `${candidate.name}|${candidate.fatherName}|${candidate.phone}`;

  if (seenIdentity.has(idKey)) {
    duplicatesRemoved++;
    console.log(
      `[DEDUPLICATED] Removed duplicate: ${candidate.name} (Father: ${candidate.fatherName}, Phone: ${candidate.phone}) in ${candidate.sheetName} Row ${candidate.rowIndex}`
    );
    continue;
  }

  seenIdentity.set(idKey, candidate);
  dedupedList.push(candidate);
}

console.log(`Duplicates removed: ${duplicatesRemoved}`);
console.log(`Unique candidates: ${dedupedList.length}`);

// Resolve any registration number collisions among unique candidates
const usedRegNos = new Set();
let maxSequenceNumber = 1000;

// Scan for existing max sequence
dedupedList.forEach((c) => {
  const match = c.rawReg.match(/^MS2611(\d{5})$/);
  if (match) {
    const seq = parseInt(match[1], 10);
    if (!isNaN(seq) && seq > maxSequenceNumber) {
      maxSequenceNumber = seq;
    }
  }
});

console.log('Max existing registration sequence detected:', maxSequenceNumber);

const finalStudents = [];
const now = new Date().toISOString();

dedupedList.forEach((c, idx) => {
  let regNo = c.rawReg;

  // If missing or already used by another candidate, generate next unique sequence
  if (!regNo || usedRegNos.has(regNo)) {
    maxSequenceNumber++;
    const seqStr = String(maxSequenceNumber).padStart(5, '0');
    regNo = `MS2611${seqStr}`;
    console.log(`Reassigned unique RegNo ${regNo} to ${c.name} (due to collision or missing RegNo)`);
  }

  usedRegNos.add(regNo);

  const studentId = `std_${Date.now()}_${String(idx + 1).padStart(5, '0')}`;

  finalStudents.push({
    studentId,
    registrationNumber: regNo,
    name: c.name,
    fatherName: c.fatherName,
    dateOfBirth: c.dob,
    phone: c.phone,
    schoolOrCollege: c.schoolOrCollege,
    className: c.className,
    competitionName: c.competitionName,
    status: 'ACTIVE',
    whatsappStatus: 'NOT_SENT',
    whatsappSentAt: null,
    sourceImportId: 'import_candidate_data_master',
    createdAt: now,
    createdBy: 'system_excel_import',
    updatedAt: now,
    updatedBy: 'system_excel_import',
    dataVersion: 1,
  });
});

console.log(`Processed ${finalStudents.length} official student records.`);

// Load existing database to preserve default users and settings
const dbPath = path.join(process.cwd(), '.data', 'mind_spark_db.json');
let currentDb = {
  users: [],
  settings: {},
  imports: [],
  admitCards: [],
  admitCardJobs: [],
  auditLogs: [],
};

if (fs.existsSync(dbPath)) {
  try {
    currentDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (err) {
    console.error('Error reading current db:', err);
  }
}

// Preserve existing users or default users
const defaultUsers = [
  {
    uid: 'superadmin_1',
    email: 'superadmin@mindspark.edu.in',
    displayName: 'Headmaster (Super Admin)',
    role: 'SUPER_ADMIN',
    active: true,
    createdAt: now,
    passwordHash: '$2b$10$BVhiyB/z2UR7IEDgzUjiX.vKgNsWI6AZwg8hzLCCEFqtm5vQ09fyS', // Admin@MindSpark2026!
  },
  {
    uid: 'admin_1',
    email: 'admin@mindspark.edu.in',
    displayName: 'Exam Coordinator (Admin)',
    role: 'ADMIN',
    active: true,
    createdAt: now,
    passwordHash: '$2b$10$BVhiyB/z2UR7IEDgzUjiX.vKgNsWI6AZwg8hzLCCEFqtm5vQ09fyS', // Admin@MindSpark2026!
  },
  {
    uid: 'operator_1',
    email: 'operator@mindspark.edu.in',
    displayName: 'Registration Operator',
    role: 'REGISTRATION_OPERATOR',
    active: true,
    createdAt: now,
    passwordHash: '$2b$10$TuwU6Ky.3qB2nsh3K/F/fufQsalufUpJW3sNP/rPR8Heg/N1GNzuK', // Operator@2026!
  },
];

const users = currentDb.users && currentDb.users.length > 0 ? currentDb.users : defaultUsers;

const updatedSettings = {
  ...(currentDb.settings || {}),
  schoolName: 'Mind-Spark Inter-School Academic Olympiad',
  competitionTitle: 'Annual Mind-Spark Academic Olympiad & Competition 2026',
  venue: 'MSITM DEGREE COLLEGE GONDA UTTAR PRADESH',
  examDate: '01 Nov 2026',
  reportingTime: '09:00 AM',
  contactPhone: '9876543210',
  contactEmail: 'admissions@mindspark.edu.in',
  regNoPrefix: 'MS',
  regNoYear: '2611',
  regNoSeqCurrent: maxSequenceNumber,
};

const newDbData = {
  users,
  students: finalStudents,
  imports: [
    {
      importId: 'import_candidate_data_master',
      fileName: 'Candidate_data.xlsx',
      fileFingerprint: 'master_excel_fingerprint_v1',
      uploadedBy: 'admin_1',
      uploadedAt: now,
      status: 'COMMITTED',
      totalRows: totalRows,
      validRows: finalStudents.length,
      warningRows: duplicatesRemoved,
      rejectedRows: 0,
      processedRows: finalStudents.length,
      mappingVersion: 'v2_multi_sheet',
      errorReport: [],
    },
  ],
  admitCards: [],
  admitCardJobs: [],
  auditLogs: [
    {
      eventId: `evt_${Date.now()}_init`,
      actorUid: 'system',
      actorEmail: 'admin@mindspark.edu.in',
      action: 'DATASET_OFFICIAL_INGESTION',
      targetType: 'IMPORT',
      targetId: 'import_candidate_data_master',
      timestamp: now,
      details: {
        rawRows: totalRows,
        uniqueStudents: finalStudents.length,
        duplicatesPurged: duplicatesRemoved,
        nextSequence: maxSequenceNumber + 1,
      },
    },
  ],
  settings: updatedSettings,
};

// Ensure .data dir exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 1. Write to .data/mind_spark_db.json
fs.writeFileSync(dbPath, JSON.stringify(newDbData, null, 2), 'utf8');
console.log('Saved official data to .data/mind_spark_db.json');

// 2. Write to src/data/seed_db.json
const seedDir = path.join(process.cwd(), 'src', 'data');
if (!fs.existsSync(seedDir)) fs.mkdirSync(seedDir, { recursive: true });
const seedPath = path.join(seedDir, 'seed_db.json');
fs.writeFileSync(seedPath, JSON.stringify(newDbData, null, 2), 'utf8');
console.log('Saved official data to src/data/seed_db.json');

// 3. Generate Supabase SQL seed file
const sqlRows = finalStudents.map((s) => {
  const cleanName = s.name.replace(/'/g, "''");
  const cleanFather = s.fatherName.replace(/'/g, "''");
  const cleanSchool = s.schoolOrCollege.replace(/'/g, "''");
  const cleanClass = s.className.replace(/'/g, "''");
  const cleanComp = s.competitionName.replace(/'/g, "''");
  return `('${s.studentId}', '${s.registrationNumber}', '${cleanName}', '${cleanFather}', '${s.dateOfBirth}', '${s.phone}', '${cleanSchool}', '${cleanClass}', '${cleanComp}', 'ACTIVE', 'NOT_SENT', NOW())`;
});

const sqlStatements = `-- Seed Official Candidates (1,134 records)
INSERT INTO students (
  student_id, registration_number, name, father_name, date_of_birth, phone,
  school_or_college, class_name, competition_name, status, whatsapp_status, created_at
) VALUES
${sqlRows.join(',\n')}
ON CONFLICT (registration_number) DO UPDATE SET
  name = EXCLUDED.name,
  father_name = EXCLUDED.father_name,
  date_of_birth = EXCLUDED.date_of_birth,
  phone = EXCLUDED.phone,
  school_or_college = EXCLUDED.school_or_college,
  class_name = EXCLUDED.class_name,
  competition_name = EXCLUDED.competition_name;

-- Update current registration sequence in settings
UPDATE system_settings
SET reg_no_seq_current = ${maxSequenceNumber},
    reg_no_year = '2611',
    reg_no_prefix = 'MS'
WHERE id = 'default_settings';
`;

const sqlSeedPath = path.join(process.cwd(), 'supabase', 'seed_candidates.sql');
fs.writeFileSync(sqlSeedPath, sqlStatements, 'utf8');
console.log('Generated Supabase SQL seed at supabase/seed_candidates.sql');
