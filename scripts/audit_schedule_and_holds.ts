const XLSX = require('xlsx');
const { resolveEventKey, EVENT_SCHEDULE_RULES, getStudentEventSchedule } = require('../src/lib/pdf/event-schedule');

const wb = XLSX.readFile('Master_All_Students_Registry.xlsx');
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Master Students'], { defval: '' });

console.log('=== COMPLETE PROGRAMME-WISE & HOLD AUDIT (5,749 CANDIDATES) ===\n');

const stats = {};
let totalActive = 0;
let totalHold = 0;

rows.forEach(r => {
  const comp = r['Event Category'];
  const cls = String(r['Class']);
  const reg = r['Registration No'];
  const key = resolveEventKey(comp, cls);
  const rule = EVENT_SCHEDULE_RULES[key];

  if (!stats[key]) {
    stats[key] = {
      eventTitle: rule ? rule.eventTitle : comp,
      classMatch: rule ? rule.classMatch : cls,
      isHold: rule ? rule.isHold : false,
      holdReason: rule ? rule.holdReason : '',
      count: 0,
      venue: rule ? rule.venueDetail : '',
      batches: rule ? (rule.batchMode === 'SHIFTS' ? rule.shifts.length : 1) : 1
    };
  }
  stats[key].count++;
  if (rule && rule.isHold) {
    totalHold++;
  } else {
    totalActive++;
  }
});

console.table(Object.entries(stats).map(([k, v]) => ({
  Key: k,
  Programme: v.eventTitle,
  Group: v.classMatch,
  Students: v.count,
  Batches: v.batches,
  Venue: v.venue,
  Status: v.isHold ? 'ON HOLD' : 'ACTIVE'
})));

console.log(`\nTOTAL CANDIDATES: ${rows.length}`);
console.log(`ACTIVE ELIGIBLE CANDIDATES: ${totalActive} (${((totalActive / rows.length) * 100).toFixed(1)}%)`);
console.log(`ON HOLD CANDIDATES:         ${totalHold} (${((totalHold / rows.length) * 100).toFixed(1)}%)`);
