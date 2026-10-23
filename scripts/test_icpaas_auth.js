const fs = require('fs');
const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
});

const API_KEY = env.ICPAAS_API_KEY;
const USERNAME = env.ICPAAS_USERNAME;

async function probe(title, url, options) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    console.log(`[${res.status}] ${title}:`, json || text.slice(0, 300));
  } catch (err) {
    console.log(`[ERR] ${title}:`, err.message);
  }
}

async function main() {
  console.log('Testing with API_KEY:', API_KEY, 'USERNAME:', USERNAME);

  const variations = [
    {
      name: 'Bearer Token',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
    },
    {
      name: 'apiKey header',
      headers: { 'apiKey': API_KEY, 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
    },
    {
      name: 'x-api-key header',
      headers: { 'x-api-key': API_KEY, 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
    },
    {
      name: 'Basic auth (username:apikey)',
      headers: { 'Authorization': 'Basic ' + Buffer.from(`${USERNAME}:${API_KEY}`).toString('base64'), 'Content-Type': 'application/json' }
    }
  ];

  for (const v of variations) {
    await probe(`${v.name} -> /api/v1/user/balance`, 'https://icpaas.in/api/v1/user/balance', {
      method: 'GET',
      headers: v.headers
    });
  }

  for (const v of variations) {
    await probe(`${v.name} -> /api/v1/meta/templates`, 'https://icpaas.in/api/v1/meta/templates', {
      method: 'GET',
      headers: v.headers
    });
  }
}

main();
