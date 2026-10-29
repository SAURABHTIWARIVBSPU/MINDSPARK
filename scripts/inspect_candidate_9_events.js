const fs = require('fs');
const xlsx = require('xlsx');

const wb = xlsx.readFile('CANDIDATE_DATA-9.xlsx');
for (const name of wb.SheetNames) {
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[name]);
  console.log('\n--- Sheet:', name, '(', rows.length, 'rows) ---');
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    console.log('Columns:', keys);
    const eventCol = keys.find(k => k.toLowerCase().includes('colour') || k.toLowerCase().includes('dots') || k.toLowerCase().includes('picture') || k.toLowerCase().includes('clay') || k.toLowerCase().includes('paint') || k.toLowerCase().includes('battle') || k.toLowerCase().includes('fireless') || k.toLowerCase().includes('quiz') || k.toLowerCase().includes('essay') || k.toLowerCase().includes('writing'));
    console.log('Detected Event Column:', eventCol);
    const uniqueEvents = new Set();
    const uniqueClasses = new Set();
    rows.forEach(r => {
      if (eventCol) uniqueEvents.add(r[eventCol]);
      const clsKey = keys.find(k => k.toLowerCase().includes('class'));
      if (clsKey) uniqueClasses.add(r[clsKey]);
    });
    console.log('Events in sheet:', Array.from(uniqueEvents));
    console.log('Classes in sheet:', Array.from(uniqueClasses));
  }
}

