const XLSX = require('xlsx');

function getFileInfo(filename) {
  const wb = XLSX.readFile(filename);
  const rows = [];
  wb.SheetNames.forEach(s => {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[s], { defval: '' });
    data.forEach(r => {
      let reg = '';
      for (const k of Object.keys(r)) {
        if (k.toLowerCase().includes('reg')) {
          reg = String(r[k]).trim();
          break;
        }
      }
      if (reg) rows.push({ reg, sheet: s, name: r['Student Name'], father: r["Father's Name"], school: r['School Name'] });
    });
  });
  return rows;
}

const f7 = getFileInfo('Candidate_data-7.xlsx');
const f8 = getFileInfo('Candidate_data_8.xlsx');

const regNums7 = f7.map(r => parseInt(r.reg.replace(/\D/g, ''), 10)).sort((a,b) => a - b);
const regNums8 = f8.map(r => parseInt(r.reg.replace(/\D/g, ''), 10)).sort((a,b) => a - b);

console.log('File 7: count =', f7.length, 'min =', regNums7[0], 'max =', regNums7[regNums7.length - 1]);
console.log('File 8: count =', f8.length, 'min =', regNums8[0], 'max =', regNums8[regNums8.length - 1]);

function findRanges(arr) {
  const ranges = [];
  let start = arr[0], prev = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === prev) continue;
    if (arr[i] === prev + 1) {
      prev = arr[i];
    } else {
      ranges.push([start, prev]);
      start = arr[i];
      prev = arr[i];
    }
  }
  ranges.push([start, prev]);
  return ranges;
}

console.log('File 7 ranges:', findRanges(regNums7).map(r => `${r[0]} to ${r[1]} (len: ${r[1] - r[0] + 1})`));
console.log('File 8 ranges:', findRanges(regNums8).map(r => `${r[0]} to ${r[1]} (len: ${r[1] - r[0] + 1})`));
