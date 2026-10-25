const XLSX = require('xlsx');
const wb5 = XLSX.readFile('CAndidate_data-5.xlsx');

const allRegs = [];
for (const s of wb5.SheetNames) {
  const data = XLSX.utils.sheet_to_json(wb5.Sheets[s]);
  data.forEach(r => {
    let reg = '';
    for (const [k, v] of Object.entries(r)) {
      if (k.toLowerCase().includes('reg')) reg = String(v).trim().toUpperCase();
    }
    if (reg) allRegs.push({ sheet: s, reg });
  });
}

console.log(`Total extracted registration numbers: ${allRegs.length}`);

// Parse numeric suffix
const nums = allRegs.map(r => {
  const m = r.reg.match(/MS26110?(\d+)/);
  return { ...r, num: m ? parseInt(m[1], 10) : null };
});

nums.sort((a, b) => a.num - b.num);

console.log(`Min: ${nums[0].reg} (${nums[0].num}), Max: ${nums[nums.length - 1].reg} (${nums[nums.length - 1].num})`);

// Find missing numbers in sequence between min and max
const min = nums[0].num;
const max = nums[nums.length - 1].num;
const presentNums = new Set(nums.map(n => n.num));
const missing = [];
for (let i = min; i <= max; i++) {
  if (!presentNums.has(i)) missing.push(i);
}

console.log(`Sequence Range: ${min} to ${max} (Span: ${max - min + 1} numbers)`);
console.log(`Present count: ${presentNums.size}`);
console.log(`Missing numbers count in range: ${missing.length}`);
if (missing.length > 0) {
  console.log('Sample missing numbers:', missing.slice(0, 10));
}
