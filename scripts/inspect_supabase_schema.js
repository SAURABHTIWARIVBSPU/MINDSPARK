const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const c = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await c.from('system_settings').select('*').limit(1);
  if (error) {
    console.error('Error fetching system_settings:', error);
  } else {
    console.log('system_settings row keys:', Object.keys(data[0] || {}));
    console.log('system_settings row data:', data[0]);
  }

  const { data: aData, count: aCount, error: aError } = await c.from('admit_cards').select('*', { count: 'exact' }).limit(5);
  if (aError) {
    console.error('Error fetching admit_cards:', aError);
  } else {
    console.log('admit_cards count in Supabase:', aCount);
    console.log('sample admit_cards rows:', aData);
  }
}

run();
