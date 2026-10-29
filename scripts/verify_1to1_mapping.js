const XLSX = require('xlsx');

const wbMaster = XLSX.readFile('Master_All_Students_Registry.xlsx');
const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });

const wb6 = XLSX.readFile('CAndidate_data-6.xlsx');
const nurSheet = wb6.Sheets['NURSERY '];
const d = XLSX.utils.sheet_to_json(nurSheet, { defval: '' });

const clashRows = masterRows.filter(r => {
  const m = String(r['Registration No']).match(/^MS26110?(\d+)$/);
  return m && parseInt(m[1], 10) >= 5137 && parseInt(m[1], 10) <= 5209;
});

console.log('Clash rows in Master to remap:', clashRows.length);

const mapping = [];
const unmapped = [];

clashRows.forEach(m => {
  const name = String(m['Student Name']).trim().toUpperCase();
  const father = String(m["Father's Name"]).trim().toUpperCase();
  // Find in d
  const found = d.find(r => String(r['Student Name']).trim().toUpperCase() === name && String(r["Father's Name"]).trim().toUpperCase() === father);
  if (found) {
    mapping.push({
      oldReg: m['Registration No'],
      newReg: String(found.Timestamp).trim(),
      name,
      father
    });
  } else {
    unmapped.push(m);
  }
});

console.log('Successfully mapped 1-to-1:', mapping.length);
console.log('Unmapped:', unmapped.length);
if (unmapped.length > 0) console.log('Unmapped sample:', unmapped);

// Check if all newReg are unique
const newRegs = new Set(mapping.map(m => m.newReg));
console.log('Unique newReg count:', newRegs.size);
