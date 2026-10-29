const XLSX = require('xlsx');

const wbMaster = XLSX.readFile('Master_All_Students_Registry.xlsx');
const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets['Master Students'], { defval: '' });
const masterMap = new Map();
masterRows.forEach(r => {
  const k = `${String(r['Student Name']).trim().toUpperCase()}:::${String(r["Father's Name"]).trim().toUpperCase()}`;
  if (!masterMap.has(k)) masterMap.set(k, []);
  masterMap.get(k).push(r);
});

function loadFile(filename) {
  const wb = XLSX.readFile(filename);
  const rows = [];
  wb.SheetNames.forEach(sheetName => {
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    data.forEach((r, idx) => {
      let reg = '';
      for (const k of Object.keys(r)) {
        if (k.toLowerCase().includes('reg')) {
          reg = String(r[k]).trim().toUpperCase();
          break;
        }
      }
      const name = String(r['Student Name'] || r['Name'] || '').trim().toUpperCase();
      const father = String(r["Father's Name"] || r['Father Name'] || '').trim().toUpperCase();
      const phone = String(r['Contact No.'] || r['Mobile'] || '').replace(/\D/g, '').slice(-10);
      const school = String(r['School Name'] || '').trim().toUpperCase();
      const cls = String(r['Class '] || r['Class'] || '').trim().toUpperCase();
      let comp = '';
      for (const [k, v] of Object.entries(r)) {
        if (k.includes('(') && String(v).trim()) {
          comp = String(v).trim().toUpperCase();
          break;
        }
      }
      const dob = r['DOB'] || '';
      rows.push({ filename, sheetName, row: idx + 2, reg, name, father, phone, school, cls, comp, dob });
    });
  });
  return rows;
}

function inspectMatches(filename) {
  console.log('================================================================');
  console.log('=== MATCHES FOR', filename, '===');
  console.log('================================================================');
  const records = loadFile(filename);
  records.forEach(r => {
    const k = `${r.name}:::${r.father}`;
    if (masterMap.has(k)) {
      const mList = masterMap.get(k);
      mList.forEach(m => {
        console.log(`\nCandidate: "${r.name}" / Father: "${r.father}"`);
        console.log(`  NEW (${filename}): Reg: ${r.reg} | Class: ${r.cls} | Comp: ${r.comp} | School: "${r.school}" | Phone: "${r.phone}" | DOB: "${r.dob}"`);
        console.log(`  MASTER:            Reg: ${m['Registration No']} | Class: ${m['Class']} | Comp: ${m['Event Category']} | School: "${m['School / College']}" | Phone: "${m['Phone Number']}" | DOB: "${m['Date of Birth']}"`);
      });
    }
  });
}

inspectMatches('Candidate_data-7.xlsx');
inspectMatches('Candidate_data_8.xlsx');
