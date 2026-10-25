const XLSX = require('xlsx');
const path = require('path');

const file5Path = path.join(process.cwd(), 'CAndidate_data-5.xlsx');
const masterPath = path.join(process.cwd(), 'Master_All_Students_Registry.xlsx');

const wb5 = XLSX.readFile(file5Path);
const wbMaster = XLSX.readFile(masterPath);

const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });

function findInMaster(regOrName) {
  return masterRows.filter(r => 
    String(r['Registration No']).includes(regOrName) || 
    String(r['Student Name']).toUpperCase().includes(regOrName.toUpperCase())
  );
}

console.log('=== ASHFIYA ANSARI in Master ===');
console.log(findInMaster('ASHFIYA'));

console.log('\n=== AHMAD NAWAF in Master ===');
console.log(findInMaster('AHMAD NAWAF'));

console.log('\n=== YASHI MILIND in Master ===');
console.log(findInMaster('YASHI MILIND'));

console.log('\n=== HIFZA KHAN in Master ===');
console.log(findInMaster('HIFZA KHAN'));
