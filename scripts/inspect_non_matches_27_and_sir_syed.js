const xlsx = require('xlsx');

function norm(str) {
  if (!str) return '';
  return String(str).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cleanReg(reg) {
  if (!reg) return '';
  return String(reg).trim().toUpperCase();
}

const masterWb = xlsx.readFile('Master_All_Students_Registry.xlsx');
const masterData = xlsx.utils.sheet_to_json(masterWb.Sheets['Master All Students']);

const masterByReg = new Map();
const masterByNameFather = new Map();

for (const s of masterData) {
  const reg = cleanReg(s['Registration No.']);
  const name = s['Student Name'];
  const father = s["Father's Name"];
  const keyNF = norm(name) + '|' + norm(father);
  if (reg) masterByReg.set(reg, s);
  if (keyNF.length > 2) {
    if (!masterByNameFather.has(keyNF)) masterByNameFather.set(keyNF, []);
    masterByNameFather.get(keyNF).push(s);
  }
}

function inspectNonMatches(filename) {
  console.log(`\n======================================================`);
  console.log(`DEEP INSPECTION OF NON-EXACT MATCHES: ${filename}`);
  console.log(`======================================================`);
  const wb = xlsx.readFile(filename);
  const rows = xlsx.utils.sheet_to_json(wb.Sheets['Sheet1']);

  const dupes = [];
  const brandNew = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawReg = row['Registration No. '] || row['Registration No.'] || row['Registration '] || row['Registration'] || row['Registration No'];
    const reg = cleanReg(rawReg);
    const name = String(row['Student Name'] || '').trim();
    const father = String(row["Father's Name"] || '').trim();
    const keyNF = norm(name) + '|' + norm(father);
    const mReg = masterByReg.get(reg);

    if (mReg && norm(mReg['Student Name']) === norm(name)) {
      continue; // Exact match
    }

    const matches = masterByNameFather.get(keyNF) || [];

    if (matches.length > 0) {
      dupes.push({
        row: i + 2,
        fileReg: reg,
        name,
        father,
        phone: row['Contact No.'],
        school: row['School Name'],
        class: row['Class '] || row['Class'],
        masterMatches: matches.map(m => ({
          reg: m['Registration No.'],
          name: m['Student Name'],
          father: m["Father's Name"],
          phone: m['Contact No.'],
          school: m['School Name'],
          competition: m['Competition Name']
        }))
      });
    } else {
      brandNew.push({
        row: i + 2,
        fileReg: reg,
        name,
        father,
        dob: row['DOB'],
        aadhar: row['Aadhar Number'] || row['Aadhar No.'],
        phone: row['Contact No.'],
        school: row['School Name'],
        class: row['Class '] || row['Class'],
        rowObj: row
      });
    }
  }

  console.log(`Duplicate / Name+Father matches (${dupes.length}):`);
  dupes.forEach(d => {
    console.log(`  Row ${d.row}: FileReg=${d.fileReg}, Name="${d.name}", Father="${d.father}", Phone=${d.phone}`);
    d.masterMatches.forEach(m => {
      console.log(`     -> Matched Master: Reg=${m.reg}, Name="${m.name}", Father="${m.father}", Phone=${m.phone}, Comp=${m.competition}`);
    });
  });

  console.log(`\nBrand New Candidates (${brandNew.length}):`);
  brandNew.forEach(b => {
    console.log(`  Row ${b.row}: Reg=${b.fileReg}, Name="${b.name}", Father="${b.father}", DOB=${b.dob}, Phone=${b.phone}, School="${b.school}", Class=${b.class}`);
  });

  return { dupes, brandNew };
}

const res27 = inspectNonMatches('27-10-2026.2.xlsx');
const resSirSyed = inspectNonMatches('SIR SYED I C (2).xlsx');

console.log(`\n\nCross check between 27-10 brand new and Sir Syed brand new:`);
for (const b1 of res27.brandNew) {
  for (const b2 of resSirSyed.brandNew) {
    if (b1.fileReg === b2.fileReg || (norm(b1.name) === norm(b2.name) && norm(b1.father) === norm(b2.father))) {
      console.log(`  Overlap between files! Reg: ${b1.fileReg}, Name: ${b1.name}`);
    }
  }
}
