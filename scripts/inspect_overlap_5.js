const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const wb = xlsx.readFile('CANDIDATE_DATA-9.xlsx');
const targets = ['MS261106050', 'MS261106051', 'MS261106052', 'MS261106054', 'MS261106055'];
for (const name of wb.SheetNames) {
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[name]);
  rows.forEach(r => {
    const reg = String(r['RegiNo'] || r['Reg No'] || '').trim().toUpperCase();
    if (targets.includes(reg)) {
      console.log(reg, '| File9 Name:', r['Student Name'], '| Father:', r["Father's Name"], '| School:', r['School Name'], '| Sheet:', name);
    }
  });
}

