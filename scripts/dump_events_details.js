const XLSX = require('xlsx');

const wb = XLSX.readFile('Events Deatails.xlsx');
console.log('Worksheets:', wb.SheetNames);
wb.SheetNames.forEach(name => {
  console.log('\n======================================================');
  console.log('SHEET:', name);
  console.log('======================================================');
  const sheet = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  data.forEach((row, idx) => {
    if (row.length > 0) {
      console.log(`[Row ${idx}]:`, JSON.stringify(row));
    }
  });
});
