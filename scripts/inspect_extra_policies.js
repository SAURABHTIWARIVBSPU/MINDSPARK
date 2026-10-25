const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

async function inspectExtraPolicies() {
  const anonClient = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Check message_jobs
  const { data: sJobs } = await serviceClient.from('message_jobs').select('*');
  console.log('message_jobs rows (service_role):', sJobs?.length);

  const { data: aJobs, error: aErr } = await anonClient.from('message_jobs').select('*');
  console.log('message_jobs rows (anon):', aJobs?.length, 'error:', aErr?.message);

  // Check message_templates
  const { data: sTemplates } = await serviceClient.from('message_templates').select('*');
  console.log('message_templates rows (service_role):', sTemplates?.length);

  const { data: aTemplates, error: atErr } = await anonClient.from('message_templates').select('*');
  console.log('message_templates rows (anon):', aTemplates?.length, 'error:', atErr?.message);
}

inspectExtraPolicies().catch(console.error);
