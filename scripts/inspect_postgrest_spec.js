const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

async function inspectPostgrestOpenApi() {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    console.error(`HTTP error: ${res.status} ${res.statusText}`);
    return;
  }

  const spec = await res.json();
  console.log('PostgREST Title:', spec.info?.title);
  console.log('PostgREST Version:', spec.info?.version);

  const paths = Object.keys(spec.paths || {});
  console.log('\nExposed API Paths in Supabase:');
  paths.forEach((p) => console.log('  ', p));

  const definitions = Object.keys(spec.definitions || {});
  console.log('\nExposed Table/View Definitions:');
  definitions.forEach((d) => console.log('  ', d));
}

inspectPostgrestOpenApi().catch(console.error);
