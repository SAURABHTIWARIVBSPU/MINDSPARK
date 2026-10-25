const XLSX = require('xlsx');
const path = require('path');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

console.log('=== INSPECTING CAndidate_data-5.xlsx ===');
const wb5 = XLSX.readFile(file5Path);
console.log('Sheets in Candidate_data-5:', wb5.SheetNames);

for (const sheetName of wb5.SheetNames) {
  const sheet = wb5.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`Sheet "${sheetName}": ${rows.length} rows`);
  if (rows.length > 0) {
    console.log('Columns in first row:', Object.keys(rows[0]));
    console.log('Sample row 1:', rows[0]);
    if (rows.length > 1) console.log('Sample row 2:', rows[1]);
  }
}

console.log('\n=== INSPECTING Master_All_Students_Registry.xlsx ===');
const wbMaster = XLSX.readFile(masterPath);
console.log('Sheets in Master Registry:', wbMaster.SheetNames);
for (const sheetName of wbMaster.SheetNames) {
  const sheet = wbMaster.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`Master Sheet "${sheetName}": ${rows.length} rows`);
  if (rows.length > 0) {
    console.log('Columns in Master:', Object.keys(rows[0]));
    console.log('Sample row 1:', rows[0]);
  }
}
