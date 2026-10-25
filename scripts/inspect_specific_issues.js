const XLSX = require('xlsx');
const path = require('path');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const wb5 = XLSX.readFile(file5Path);

console.log('=== INSPECTING EVENT EXTRACTION ACROSS SHEETS ===');
for (const sheetName of wb5.SheetNames) {
  const sheet = wb5.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  
  // Find which columns exist
  if (rows.length === 0) continue;
  const cols = Object.keys(rows[0]);
  const eventCol = cols.find(c => 
    c.includes('(') || c.toLowerCase().includes('event') || c.toLowerCase().includes('competition')
  );

  let emptyEventCount = 0;
  const sampleValues = new Set();
  for (const r of rows) {
    const val = eventCol ? String(r[eventCol] || '').trim() : '';
    if (!val) emptyEventCount++;
    else sampleValues.add(val);
  }

  console.log(`Sheet "${sheetName}": ${rows.length} rows | Detected Event Col: "${eventCol}" | Empty values: ${emptyEventCount}`);
  console.log(`  Sample event values:`, Array.from(sampleValues).slice(0, 5));
}

console.log('\n=== INSPECTING ROW DETAILS FOR MOHD HUSSAINN ===');
for (const sheetName of ['LKG', 'Class 4 to Class 5']) {
  const sheet = wb5.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  rows.forEach((r, idx) => {
    const reg = String(r['Registration'] || r['Regitrtion No'] || '');
    if (reg === 'MS261102883' || JSON.stringify(r).toLowerCase().includes('hussainn')) {
      console.log(`Sheet "${sheetName}", Row ${idx + 2}:`, r);
    }
  });
}

console.log('\n=== INSPECTING ROW DETAILS FOR HIFZA KHAN ===');
for (const sheetName of wb5.SheetNames) {
  const sheet = wb5.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  rows.forEach((r, idx) => {
    if (JSON.stringify(r).toLowerCase().includes('hifza')) {
      console.log(`Sheet "${sheetName}", Row ${idx + 2}:`, r);
    }
  });
}

console.log('\n=== INSPECTING ROW DETAILS FOR KOMAL SHUKLA ===');
for (const sheetName of wb5.SheetNames) {
  const sheet = wb5.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  rows.forEach((r, idx) => {
    if (JSON.stringify(r).toLowerCase().includes('komal') && JSON.stringify(r).toLowerCase().includes('shukla')) {
      console.log(`Sheet "${sheetName}", Row ${idx + 2}:`, r);
    }
  });
}
