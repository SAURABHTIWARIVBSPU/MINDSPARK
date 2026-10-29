const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

console.log('================================================================================');
console.log('📱 GENERATING COMPLETE CLASS-WISE WHATSAPP CAMPAIGN (3 SOURCE FILES: 1,180 CANDIDATES)');
console.log('================================================================================\n');

// 1. Output Directories
const CAMPAIGN_DATE = '2026-10-29';
const desktopDir = path.join('C:', 'Users', 'Saurabh Tiwari', 'Desktop', `WhatsApp_Campaign_Class_Wise_${CAMPAIGN_DATE}`);
const workspaceDir = path.resolve(`WhatsApp_Campaign_Class_Wise_${CAMPAIGN_DATE}`);

if (!fs.existsSync(desktopDir)) fs.mkdirSync(desktopDir, { recursive: true });
if (!fs.existsSync(workspaceDir)) fs.mkdirSync(workspaceDir, { recursive: true });

function norm(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// 2. Read the 3 source files
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

// Process Candidate Data 9
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

// Process 27-10-2026.2 and SIR SYED I C (2)
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

console.log(`[1/5] Scanned 3 source files:`);
console.log(`      - Unique Reg Numbers:    ${sourceRegs.size}`);
console.log(`      - Unique Name + Fathers: ${sourceNameFathers.size}\n`);

// 3. Load Master Registry and match all students from these 3 files
const masterWb = xlsx.readFile('Master_All_Students_Registry.xlsx');
const allMasterStudents = xlsx.utils.sheet_to_json(masterWb.Sheets['Master All Students']);
console.log(`Total Master Students in Registry: ${allMasterStudents.length}`);

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

console.log(`[2/5] Matched ${matchedStudents.length} official candidates in Master Registry from the 3 files.\n`);

// 4. Official WhatsApp Groups Configuration
const OFFICIAL_GROUPS = {
  FANCY_DRESS: {
    groupName: 'Mind Spark Unique & Creative Handmade Fancy Dress (play group)',
    url: 'https://chat.whatsapp.com/IRuKPAsQwsD3JOKvfoRlNe?s=cl&p=a&mlu=4&ilr=4'
  },
  COLOUR_BY_NUMBER: {
    groupName: 'Mind Spark Colour by Number(nursery)',
    url: 'https://chat.whatsapp.com/LCkLkIPQjxoLYq83H1PL7B?s=cl&p=a&mlu=4&ilr=4'
  },
  JOIN_THE_DOTS: {
    groupName: 'Mind Spark Join The Dots Colour(lkg)',
    url: 'https://chat.whatsapp.com/CfTovkUjPoh1mtKJHKTzQw?s=cl&p=a&mlu=4&ilr=4'
  },
  COMPLETE_THE_PICTURE: {
    groupName: 'Mind Spark Complete The Picture & Colour (ukg)',
    url: 'https://chat.whatsapp.com/HK4oXdNxng7Kilg5GIkAdh?s=cl&p=a&mlu=4&ilr=4'
  },
  CLAY_CHAMPS: {
    groupName: 'Mind Spark Clay Champs (class 1)',
    url: 'https://chat.whatsapp.com/Civ78EDwE9w3tx3QHTfF36?s=cl&p=a&mlu=4&ilr=4'
  },
  DRESS_TO_IMPRESS: {
    groupName: 'Mind Spark Dress To Impress (class 1)',
    url: 'https://chat.whatsapp.com/BC3BkmIFFGM2NHR6sKJeAq?s=cl&p=a&mlu=4&ilr=4'
  },
  PAINT_YOUR_IMAGINATION: {
    groupName: 'Mind Spark Paint Your Imagination (2-3)',
    url: 'https://chat.whatsapp.com/LN0NdN4Ov5Z0CenxbXhc2B?s=cl&p=a&mlu=4&ilr=4'
  },
  WRITING_STARS: {
    groupName: 'Mind Spark Writing Stars (2-3)',
    url: 'https://chat.whatsapp.com/EZdzL8T1ADm51STsu7uv6F?s=cl&p=a&mlu=4&ilr=4'
  },
  BATTLE_OF_BRAINS: {
    groupName: 'Mind Spark Battle of Brains(4-5)',
    url: 'https://chat.whatsapp.com/LQ4cJOtKOu2GyZp1QLh1ul?s=cl&p=a&mlu=4&ilr=4'
  },
  POSTER_ARTIST: {
    groupName: 'Mind Spark Poster Artist (4-5)',
    url: 'https://chat.whatsapp.com/IXFH8stCsxQFBOn4RRCziG?s=cl&p=a&mlu=4&ilr=4'
  },
  FIRELESS_COOKING: {
    groupName: 'Mind Spark Fireless Cooking (6–8)',
    url: 'https://chat.whatsapp.com/CoSFm1OKCzI9dQvNPgoqr0?s=cl&p=a&mlu=4&ilr=4'
  },
  JUNIOR_SCIENTIST: {
    groupName: 'Mind Spark Junior Scientist (6–8)',
    url: 'https://chat.whatsapp.com/DtdXSmSL9xw9iclQ8Bt3IS?s=cl&p=a&mlu=4&ilr=4'
  },
  ONLINE_QUIZ_9_10: {
    groupName: 'Mind Spark Online Quiz (9–10)',
    url: 'https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe'
  },
  YOUNG_INNOVATORS: {
    groupName: 'Mind Spark Young Innovators (9–10)',
    url: 'https://chat.whatsapp.com/LVZkMALJ7t13QS1OQeWRAp?s=cl&p=a&mlu=4&ilr=4'
  },
  ONLINE_QUIZ_11_12: {
    groupName: 'Mind Spark Online Quiz (11–12)',
    url: 'https://chat.whatsapp.com/HChYAjAXd2q9i9xnXbZwme'
  },
  WRITING_QUEST: {
    groupName: 'Mind Spark Writing Quest (11–12)',
    url: 'https://chat.whatsapp.com/BKaf16sFinG6uj6JzfK5MI?s=cl&p=a&mlu=4&ilr=4'
  },
  ONLINE_QUIZ_GRAD: {
    groupName: 'Mind Spark Online Quiz (Graduation)',
    url: 'https://chat.whatsapp.com/FnBeq6O9TIyIGvbJiK6quw'
  },
  ESSAY_WRITING: {
    groupName: 'Mind Spark Essay Writing',
    url: 'https://chat.whatsapp.com/KoiQ7KE6j11HlstZw68WJ3?s=cl&p=a&mlu=4&ilr=4'
  }
};

function resolveCampaignTarget(comp, cls) {
  const normComp = String(comp || '').toUpperCase();
  const normCls = String(cls || '').toUpperCase();

  if (normComp.includes('FANCY DRESS')) return OFFICIAL_GROUPS.FANCY_DRESS;
  if (normComp.includes('COLOUR BY NUMBER')) return OFFICIAL_GROUPS.COLOUR_BY_NUMBER;
  if (normComp.includes('JOIN THE DOTS')) return OFFICIAL_GROUPS.JOIN_THE_DOTS;
  if (normComp.includes('COMPLETE THE PICTURE') || normComp.includes('COMPLETE THE DOTS')) return OFFICIAL_GROUPS.COMPLETE_THE_PICTURE;
  if (normComp.includes('CLAY CHAMPS')) return OFFICIAL_GROUPS.CLAY_CHAMPS;
  if (normComp.includes('DRESS TO IMPRESS')) return OFFICIAL_GROUPS.DRESS_TO_IMPRESS;
  if (normComp.includes('PAINT')) return OFFICIAL_GROUPS.PAINT_YOUR_IMAGINATION;
  if (normComp.includes('WRITING STAR')) return OFFICIAL_GROUPS.WRITING_STARS;
  if (normComp.includes('BATTLE OF BRAIN')) return OFFICIAL_GROUPS.BATTLE_OF_BRAINS;
  if (normComp.includes('POSTER ARTIST') || normComp.includes('POST ARTIST')) return OFFICIAL_GROUPS.POSTER_ARTIST;
  if (normComp.includes('FIRELESS')) return OFFICIAL_GROUPS.FIRELESS_COOKING;
  if (normComp.includes('JUNIOR SCIENTIST')) return OFFICIAL_GROUPS.JUNIOR_SCIENTIST;
  if (normComp.includes('YOUNG INNOVATOR')) return OFFICIAL_GROUPS.YOUNG_INNOVATORS;
  if (normComp.includes('WRITING QUEST')) return OFFICIAL_GROUPS.WRITING_QUEST;
  if (normComp.includes('ESSAY WRITING')) return OFFICIAL_GROUPS.ESSAY_WRITING;

  if (normComp.includes('ONLINE QUIZ')) {
    if (normCls.includes('GRAD') || normCls.includes('COLLEGE') || normCls.includes('BBA') || normCls.includes('BCA') || normCls.includes('BSC') || normCls.includes('BA') || normCls.includes('B COM') || normCls.includes('MA')) {
      return OFFICIAL_GROUPS.ONLINE_QUIZ_GRAD;
    }
    if (normCls === '11' || normCls === '12' || normCls === '11TH' || normCls === '12TH') {
      return OFFICIAL_GROUPS.ONLINE_QUIZ_11_12;
    }
    return OFFICIAL_GROUPS.ONLINE_QUIZ_9_10;
  }

  // Fallback by Class
  if (normCls.includes('GRAD') || normCls.includes('COLLEGE') || normCls.includes('BBA') || normCls.includes('BCA') || normCls.includes('BSC') || normCls.includes('BA') || normCls.includes('B COM') || normCls.includes('MA')) return OFFICIAL_GROUPS.ONLINE_QUIZ_GRAD;
  if (normCls === '11' || normCls === '12') return OFFICIAL_GROUPS.ONLINE_QUIZ_11_12;
  if (normCls === '9' || normCls === '10') return OFFICIAL_GROUPS.ONLINE_QUIZ_9_10;
  if (['6', '7', '8'].includes(normCls)) return OFFICIAL_GROUPS.FIRELESS_COOKING;
  if (['4', '5'].includes(normCls)) return OFFICIAL_GROUPS.BATTLE_OF_BRAINS;
  if (['2', '3'].includes(normCls)) return OFFICIAL_GROUPS.PAINT_YOUR_IMAGINATION;
  if (normCls === '1') return OFFICIAL_GROUPS.CLAY_CHAMPS;
  if (normCls === 'UKG') return OFFICIAL_GROUPS.COMPLETE_THE_PICTURE;
  if (normCls === 'LKG') return OFFICIAL_GROUPS.JOIN_THE_DOTS;
  if (normCls === 'NURSERY') return OFFICIAL_GROUPS.COLOUR_BY_NUMBER;
  if (normCls === 'PLAY GROUP' || normCls === 'PG') return OFFICIAL_GROUPS.FANCY_DRESS;

  return OFFICIAL_GROUPS.ONLINE_QUIZ_9_10;
}

// 5. Generate Personalized WhatsApp Message Text
function generateWhatsAppMessage(s, target) {
  const name = s['Student Name'] || 'Candidate';
  const regNo = s['Registration No'] || 'PENDING';
  const father = s["Father's Name"] || '';
  const school = s['School / College'] || 'MSPS Gonda';
  const cls = s['Class'] || '';
  const comp = s['Event Category'] || '';
  const examDate = s['Examination Date'] || '01 Nov 2026 (Sunday)';
  const reportingTime = s['Reporting Time'] || '09:00 AM';
  const examTime = s['Examination Time'] || '10:00 AM - 11:00 AM';
  const venue = s['Campus / Venue'] || 'MEENA SHAH PUBLIC SCHOOL';
  const room = s['Specific Hall / Room'] || 'CAMPUS';
  const groupUrl = target.url;

  let specialNote = '';
  if (comp === 'ONLINE QUIZ' && (cls.includes('GRAD') || cls.includes('COLLEGE') || cls.includes('BBA') || cls.includes('BCA') || cls.includes('BSC') || cls.includes('BA') || cls.includes('B COM') || cls.includes('MA'))) {
    specialNote = `\n🎁 *SPECIAL ANNOUNCEMENT — GRADUATION LUCKY DRAW:*
All Graduation Online Quiz participants are cordially invited to the Lucky Draw Event on *Sunday, 01 Nov 2026 at 09:00 AM sharp* at MSITM Campus! (Your Quiz is scheduled on Monday, 02 Nov 2026).\n`;
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

📅 *Examination Date:* ${examDate}
⏰ *Reporting Time:* ${reportingTime}
🎯 *Examination Timing:* ${examTime}
📍 *Venue & Room:* ${venue} — ${room}
${specialNote}
👉 *Official WhatsApp Group Link (Join Now for Real-time Updates):*
${groupUrl}

🌐 *Download Official Admit Card Online:*
https://mindspark.msitm.org/admit-card

*Important Instructions:*
1. Arrive at the reporting time mentioned above.
2. Please carry a printed copy of your Admit Card or your Registration Number.
3. Bring required stationery (colours, pencils, clipboard, etc.).

Wish you the very best of success!
*Mind Spark 2026 Organizing Committee*
*Meena Shah Public School, Gonda*`;
}

// 6. Transform all matched candidates
console.log('[3/5] Formatting candidates into standard WhatsApp Campaign schema...');

const formattedRecords = matchedStudents.map((s, idx) => {
  const target = resolveCampaignTarget(s['Event Category'], s['Class']);
  const rawDigits = String(s['Phone Number'] || '').replace(/\D/g, '');
  const d10 = rawDigits.slice(-10);
  const is10Valid = d10.length === 10 && /^[6-9]\d{9}$/.test(d10);
  const e164Number = is10Valid ? `91${d10}` : (rawDigits.length >= 10 ? `91${d10}` : '910000000000');

  const personalizedMessage = generateWhatsAppMessage(s, target);

  return {
    'Candidate S.No': idx + 1,
    'number': e164Number, // Direct column for bulk broadcast tools (WATI, Interakt, etc.)
    'WhatsApp Mobile (+91)': e164Number,
    'Candidate Name': s['Student Name'],
    'Registration Number': s['Registration No'],
    'Reg No Display': `Your Reg/No: ${s['Registration No']}`,
    "Father's Name": s["Father's Name"],
    'Class': s['Class'],
    'School / College Name': s['School / College'],
    'Event Category': s['Event Category'],
    'Examination Date': s['Examination Date'],
    'Reporting Time': s['Reporting Time'],
    'Examination Time': s['Examination Time'],
    'Shift / Batch': s['Shift / Batch'],
    'Campus / Venue': s['Campus / Venue'],
    'Specific Hall / Room': s['Specific Hall / Room'],
    'Official WhatsApp Group Name': target.groupName,
    'Official WhatsApp Group Link': target.url,
    'Admit Card Portal Link': 'https://mindspark.msitm.org/admit-card',
    'Mobile Validity': is10Valid ? 'VALID' : 'INVALID_OR_MISSING',
    'Personalized WhatsApp Message': personalizedMessage,
    'Campaign Batch Date': CAMPAIGN_DATE,
    'Campaign Dispatch Status': 'READY_FOR_DISPATCH'
  };
});

// 7. Group by Class
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

formattedRecords.forEach(r => {
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

// 8. Build Consolidated Multi-Sheet Master Workbook
console.log('\n[4/5] Building Consolidated Multi-Sheet Master Campaign Workbook...');
const masterCampaignWb = xlsx.utils.book_new();

// Sheet A: Campaign Executive Summary
const summaryRows = [
  { 'Metric': 'Campaign Batch Date', 'Value': CAMPAIGN_DATE },
  { 'Metric': 'Total Candidates in Campaign Pool', 'Value': formattedRecords.length },
  { 'Metric': 'Source Files Integrated', 'Value': 'CANDIDATE_DATA-9.xlsx + 27-10-2026.2.xlsx + SIR SYED I C (2).xlsx' },
  { 'Metric': 'Valid WhatsApp Mobile Numbers', 'Value': formattedRecords.filter(r => r['Mobile Validity'] === 'VALID').length },
  { 'Metric': 'Total Class Streams', 'Value': Array.from(classGroups.keys()).filter(k => (classGroups.get(k) || []).length > 0).length },
  { 'Metric': '', 'Value': '' },
  { 'Metric': '--- CLASS-WISE CANDIDATE BREAKDOWN ---', 'Value': '' }
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

// Sheet B: All Candidates Master
xlsx.utils.book_append_sheet(masterCampaignWb, xlsx.utils.json_to_sheet(formattedRecords), `All Candidates (${formattedRecords.length})`);

// Sheets C...: Individual Class Tabs
classOrder.forEach(c => {
  const list = classGroups.get(c) || [];
  if (list.length > 0) {
    const classListWithIndex = list.map((item, idx) => ({
      ...item,
      'Candidate S.No': idx + 1
    }));
    const sheetTitle = `Class ${c} (${list.length})`.replace(/Class Class/i, 'Class');
    xlsx.utils.book_append_sheet(masterCampaignWb, xlsx.utils.json_to_sheet(classListWithIndex), sheetTitle.slice(0, 31));
  }
});

// Save consolidated workbook
const masterFileName = `WhatsApp_Campaign_New_Batch_${CAMPAIGN_DATE}.xlsx`;
const workspaceMasterPath = path.resolve(masterFileName);
const desktopMasterPath = path.join('C:', 'Users', 'Saurabh Tiwari', 'Desktop', masterFileName);

xlsx.writeFile(masterCampaignWb, workspaceMasterPath);
xlsx.writeFile(masterCampaignWb, desktopMasterPath);
console.log(`✅ Saved Consolidated Workbook in Workspace: ${workspaceMasterPath}`);
console.log(`✅ Saved Consolidated Workbook on Desktop:   ${desktopMasterPath}`);

// 9. Generate Individual Class-Wise Files in Folder
console.log('\n[5/5] Generating Individual Class-Wise Files in output folders...');
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
xlsx.utils.book_append_sheet(allWb, xlsx.utils.json_to_sheet(formattedRecords), `All Candidates (${formattedRecords.length})`);
const allFileName = `00_ALL_NEW_CANDIDATES_MASTER_${CAMPAIGN_DATE}.xlsx`;
xlsx.writeFile(allWb, path.join(workspaceDir, allFileName));
xlsx.writeFile(allWb, path.join(desktopDir, allFileName));

classFilesMetadata.forEach(meta => {
  const list = classGroups.get(meta.key) || [];
  if (list.length > 0) {
    const wb = xlsx.utils.book_new();
    const listWithIndex = list.map((item, idx) => ({
      ...item,
      'Candidate S.No': idx + 1
    }));
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(listWithIndex), meta.sheetName);
    
    xlsx.writeFile(wb, path.join(workspaceDir, meta.fileName));
    xlsx.writeFile(wb, path.join(desktopDir, meta.fileName));
    console.log(`   📄 Created ${meta.fileName} (${list.length} candidates)`);
  }
});

console.log(`\n✅ Created all individual files in:`);
console.log(`   - Workspace: ${workspaceDir}`);
console.log(`   - Desktop:   ${desktopDir}`);

console.log('\n================================================================================');
console.log('🎉 WHATSAPP CAMPAIGN WORKBOOKS SUCCESSFULLY GENERATED!');
console.log('================================================================================');
