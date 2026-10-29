const xlsx = require('xlsx');

function norm(s) { return String(s||'').trim().toLowerCase().replace(/[^a-z0-9]/g, ''); }

const f1 = 'CANDIDATE_DATA-9.xlsx';
const f2 = '27-10-2026.2.xlsx';
const f3 = 'SIR SYED I C (2).xlsx';

const wb1 = xlsx.readFile(f1);
const wb2 = xlsx.readFile(f2);
const wb3 = xlsx.readFile(f3);

// Map of Reg -> Source File
const regToSource = new Map();
const nfToSource = new Map();

wb1.SheetNames.forEach(s => {
  const rows = xlsx.utils.sheet_to_json(wb1.Sheets[s]);
  rows.forEach(r => {
    const reg = String(r['RegiNo'] || r['Reg No'] || r['Registration No'] || '').trim().toUpperCase();
    if (reg) regToSource.set(reg, f1);
    const key = norm(r['Student Name']) + '|' + norm(r["Father's Name"]);
    if (key.length > 2) nfToSource.set(key, f1);
  });
});

[ { file: f2, wb: wb2 }, { file: f3, wb: wb3 } ].forEach(item => {
  const rows = xlsx.utils.sheet_to_json(item.wb.Sheets['Sheet1']);
  rows.forEach(r => {
    const reg = String(r['Registration No. '] || r['Registration No.'] || r['Registration '] || r['Registration'] || '').trim().toUpperCase();
    if (reg) regToSource.set(reg, item.file);
    const key = norm(r['Student Name']) + '|' + norm(r["Father's Name"]);
    if (key.length > 2) nfToSource.set(key, item.file);
  });
});

// Load Master Registry
const masterWb = xlsx.readFile('Master_All_Students_Registry.xlsx');
const masterData = xlsx.utils.sheet_to_json(masterWb.Sheets['Master All Students']);

const campaignCandidates = [];
const seenRegs = new Set();

masterData.forEach(s => {
  const reg = String(s['Registration No'] || '').trim().toUpperCase();
  const key = norm(s['Student Name']) + '|' + norm(s["Father's Name"]);

  if (regToSource.has(reg) || nfToSource.has(key)) {
    if (!seenRegs.has(reg)) {
      seenRegs.add(reg);
      const src = regToSource.get(reg) || nfToSource.get(key);
      campaignCandidates.push({
        sourceFile: src,
        student: s
      });
    }
  }
});

console.log(`Matched ${campaignCandidates.length} unique candidates in Master from the 3 files.`);

// Group by Class
const byClass = {};
campaignCandidates.forEach(c => {
  let cls = String(c.student['Class'] || 'UNKNOWN').trim().toUpperCase();
  if (cls.includes('GRAD') || cls.includes('COLLEGE') || cls.includes('BBA') || cls.includes('BCA') || cls.includes('BA') || cls.includes('BSC') || cls.includes('B COM') || cls.includes('MA')) {
    cls = 'GRADUATION';
  } else if (cls === '23') {
    cls = '2'; // Data entry typo for Class 2
  }
  byClass[cls] = (byClass[cls] || 0) + 1;
});

console.log('Class distribution for campaign:');
console.log(byClass);

