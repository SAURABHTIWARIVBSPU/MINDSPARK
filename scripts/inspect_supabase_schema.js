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

  const { data: aData, count: aCount, error: aError } = await c.from('admit_cards').select('*', { count: 'exact' }).limit(1);
  if (aError) {
    console.error('Error fetching admit_cards:', aError);
  } else {
    console.log('admit_cards count in Supabase:', aCount);
    if (aData && aData.length > 0) {
      console.log('admit_cards row keys:', Object.keys(aData[0]));
      console.log('admit_cards sample row:', aData[0]);
    }
  }

  const { data: sData, count: sCount } = await c.from('students').select('*', { count: 'exact' }).limit(1);
  console.log('students count in Supabase:', sCount);
  if (sData && sData.length > 0) {
    console.log('students row keys:', Object.keys(sData[0]));
    console.log('sample student row:', sData[0]);
  }
}

run();
