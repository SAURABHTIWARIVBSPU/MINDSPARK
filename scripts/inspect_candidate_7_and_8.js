const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function analyzeFile(filename) {
  const wb = XLSX.readFile(filename);
  console.log('==============================================');
  console.log('FILE:', filename);
  let totalRows = 0;
  const regCounts = {};
  const emptyRegs = [];
  const rows = [];
  wb.SheetNames.forEach(sName => {
    const s = wb.Sheets[sName];
    const data = XLSX.utils.sheet_to_json(s, { defval: '' });
    console.log('  Sheet:', sName, '-> rows:', data.length);
    data.forEach((r, idx) => {
      totalRows++;
      // check all keys for registration
      let reg = '';
      for (const k of Object.keys(r)) {
        if (k.toLowerCase().includes('reg')) {
          reg = String(r[k]).trim();
          break;
        }
      }
      const name = String(r['Student Name'] || r['Name'] || '').trim();
      const father = String(r["Father's Name"] || r['Father Name'] || '').trim();
      const phone = String(r['Contact No.'] || r['Mobile'] || '').trim();
      const school = String(r['School Name'] || '').trim();
      const cls = String(r['Class '] || r['Class'] || '').trim();
      let comp = '';
      for (const [k, v] of Object.entries(r)) {
        if (k.includes('(') && String(v).trim()) {
          comp = String(v).trim();
          break;
        }
      }
      if (!reg) {
        emptyRegs.push({ sheet: sName, row: idx + 2, name, father, comp });
      } else {
        regCounts[reg] = (regCounts[reg] || 0) + 1;
      }
      rows.push({ sheet: sName, row: idx + 2, reg, name, father, phone, school, cls, comp });
    });
  });
  console.log('Total data rows:', totalRows);
  console.log('Empty Regs count:', emptyRegs.length);
  if (emptyRegs.length > 0) {
    console.log('Sample empty regs:', emptyRegs.slice(0, 10));
  }
  const dupRegs = Object.entries(regCounts).filter(([k, v]) => v > 1);
  console.log('Duplicate Regs count inside file:', dupRegs.length, dupRegs.slice(0, 5));
  const allRegs = Object.keys(regCounts);
  console.log('Sample Regs:', allRegs.slice(0, 5), '...', allRegs.slice(-5));
  return { filename, totalRows, emptyRegs, dupRegs, rows, allRegs };
}

const f7 = analyzeFile('Candidate_data-7.xlsx');
const f8 = analyzeFile('Candidate_data_8.xlsx');
