const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

async function inspectSettingsSecrets() {
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await client.from('system_settings').select('*');
  if (error) {
    console.error('Error fetching settings:', error);
    return;
  }
  for (const row of data || []) {
    console.log(`Settings Row ID: "${row.id}"`);
    console.log(`  whatsapp_cloud_token: ${row.whatsapp_cloud_token ? `Present (length: ${row.whatsapp_cloud_token.length}, prefix: ${row.whatsapp_cloud_token.slice(0, 4)}***)` : 'null/absent'}`);
    console.log(`  whatsapp_phone_number_id: ${row.whatsapp_phone_number_id ? `Present (length: ${row.whatsapp_phone_number_id.length})` : 'null/absent'}`);
  }

  // Check audit_logs to see if there are logs of unauthorized queries
  const { data: logs, count } = await client.from('audit_logs').select('action, actor_uid, timestamp', { count: 'exact' }).order('timestamp', { ascending: false }).limit(5);
  console.log(`Total audit logs: ${count}`);
  console.log('Recent 5 audit actions:', logs);
}

inspectSettingsSecrets().catch(console.error);
