const XLSX = require('xlsx');
const wbMaster = XLSX.readFile('Master_All_Students_Registry.xlsx');
const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });

const nurseryAssigned = masterRows.filter(r => {
  const m = String(r['Registration No']).match(/^MS26110?(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    return n >= 5137 && n <= 5209;
  }
  return false;
});
console.log('Candidates occupying 5137-5209 in Master:', nurseryAssigned.length);
console.log('Sample:');
nurseryAssigned.slice(0, 10).forEach(r => console.log(r['Registration No'], '|', r['Student Name'], '|', r["Father's Name"], '|', r['School / College'], '|', r['Class'], '|', r['Event Category']));
