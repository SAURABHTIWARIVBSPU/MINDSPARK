const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[k] = v;
  }
});

async function run() {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const regs = ['MS261106050', 'MS261106051', 'MS261106052', 'MS261106054', 'MS261106055'];
  const filter = 'in.(' + regs.join(',') + ')';
  const res = await fetch(url + '/rest/v1/students?select=*&registration_number=' + encodeURIComponent(filter), {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const data = await res.json();
  console.log('Current DB records for 6050-6055:');
  data.forEach(d => {
    console.log(d.registration_number, '| Name:', d.name, '| Father:', d.father_name, '| School:', d.school_or_college, '| Source:', d.source_import_id, '| CreatedBy:', d.created_by, '| CreatedAt:', d.created_at);
  });
}

run().catch(console.error);

