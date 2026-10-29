const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

async function run() {
  const res = await fetch(url + '/rest/v1/students?select=competition_name,class_name,status&status=neq.VOID', {
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      Prefer: 'count=exact',
      Range: '0-9999'
    }
  });
  const students = await res.json();
  console.log('Total students fetched:', students.length);
  const counts = {};
  for (const s of students) {
    const comp = (s.competition_name || '').toUpperCase();
    const cls = (s.class_name || '').toUpperCase();
    const key = comp + '___' + cls;
    counts[comp] = (counts[comp] || 0) + 1;
  }
  console.log('Counts by Competition Name:', JSON.stringify(counts, null, 2));
}

run().catch(console.error);
