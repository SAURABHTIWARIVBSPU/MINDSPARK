const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

async function run() {
  const c = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: d1 } = await c.from('students').select('registration_number').ilike('registration_number', 'MS26%').order('registration_number', { ascending: false }).limit(10);
  console.log('Highest 10 registration numbers:', d1);

  const { data: st } = await c.from('system_settings').select('*');
  console.log('system_settings:', st);
}

run().catch(console.error);
