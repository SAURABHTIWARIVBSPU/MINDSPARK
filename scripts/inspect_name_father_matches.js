const fs = require('fs');
const xlsx = require('xlsx');

const wb9 = xlsx.readFile('CANDIDATE_DATA-9.xlsx');
const all9 = [];
for (const name of wb9.SheetNames) {
  const rows = xlsx.utils.sheet_to_json(wb9.Sheets[name]);
  rows.forEach((r, idx) => {
    all9.push({ sheet: name, rowIndex: idx + 2, raw: r });
  });
}

const wbMaster = xlsx.readFile('Master_All_Students_Registry.xlsx');
const masterStudents = xlsx.utils.sheet_to_json(wbMaster.Sheets['Master All Students']);

const masterNameFatherMap = new Map();
masterStudents.forEach(s => {
  const name = String(s['Student Name'] || '').trim().toUpperCase();
  const father = String(s["Father's Name"] || '').trim().toUpperCase();
  if (name && father) masterNameFatherMap.set(name + '___' + father, s);
});

all9.forEach(item => {
  const r = item.raw;
  const reg = String(r['RegiNo'] || r['Reg No'] || '').trim().toUpperCase();
  const name = String(r['Student Name'] || '').trim().toUpperCase();
  const father = String(r["Father's Name"] || '').trim().toUpperCase();
  const key = name + '___' + father;
  if (masterNameFatherMap.has(key)) {
    const m = masterNameFatherMap.get(key);
    console.log('Candidate Data 9:');
    console.log({ sheet: item.sheet, reg, name, father, school: r['School Name'], phone: r['Contact No.'] });
    console.log('Existing Master:');
    console.log({ reg: m['Registration No'], name: m['Student Name'], father: m["Father's Name"], school: m['School / College'], class: m['Class'], event: m['Event Category'] });
    console.log('--------------------------------------------------');
  }
});

