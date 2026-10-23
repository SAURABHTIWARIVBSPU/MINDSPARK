const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
});

const apiKey = env.ICPAAS_API_KEY;
const username = env.ICPAAS_USERNAME || 'meenashahschool';

async function testFormats() {
  const testVariations = [
    // 1. In Query param: ?key=... or ?apikey=...
    { url: `https://icpaas.in/api/v1/send?apikey=${apiKey}`, headers: { 'Content-Type': 'application/json' }, body: { to: '918948905711', message: 'Test' } },
    { url: `https://icpaas.in/api/v1/send?key=${apiKey}`, headers: { 'Content-Type': 'application/json' }, body: { to: '918948905711', message: 'Test' } },
    { url: `https://icpaas.in/api/v1/send?api_key=${apiKey}`, headers: { 'Content-Type': 'application/json' }, body: { to: '918948905711', message: 'Test' } },
    { url: `https://icpaas.in/api/v1/send?apiKey=${apiKey}`, headers: { 'Content-Type': 'application/json' }, body: { to: '918948905711', message: 'Test' } },

    // 2. In Headers: apikey, x-api-key, key, api-key
    { url: `https://icpaas.in/api/v1/send`, headers: { 'Content-Type': 'application/json', 'apikey': apiKey }, body: { to: '918948905711', message: 'Test' } },
    { url: `https://icpaas.in/api/v1/send`, headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: { to: '918948905711', message: 'Test' } },
    { url: `https://icpaas.in/api/v1/send`, headers: { 'Content-Type': 'application/json', 'key': apiKey }, body: { to: '918948905711', message: 'Test' } },
    { url: `https://icpaas.in/api/v1/send`, headers: { 'Content-Type': 'application/json', 'api-key': apiKey }, body: { to: '918948905711', message: 'Test' } },
    { url: `https://icpaas.in/api/v1/send`, headers: { 'Content-Type': 'application/json', 'Authorization': apiKey }, body: { to: '918948905711', message: 'Test' } },

    // 3. In Body: key, apikey, api_key
    { url: `https://icpaas.in/api/v1/send`, headers: { 'Content-Type': 'application/json' }, body: { key: apiKey, to: '918948905711', message: 'Test' } },
    { url: `https://icpaas.in/api/v1/send`, headers: { 'Content-Type': 'application/json' }, body: { apikey: apiKey, to: '918948905711', message: 'Test' } },
    { url: `https://icpaas.in/api/v1/send`, headers: { 'Content-Type': 'application/json' }, body: { api_key: apiKey, to: '918948905711', message: 'Test' } },

    // 4. GET request variations
    { url: `https://icpaas.in/api/v1/send?apikey=${apiKey}&mobile=918948905711&msg=Test`, method: 'GET' },
  ];

  for (let i = 0; i < testVariations.length; i++) {
    const v = testVariations[i];
    try {
      const res = await fetch(v.url, {
        method: v.method || 'POST',
        headers: v.headers || {},
        body: v.body ? JSON.stringify(v.body) : undefined,
      });

      const text = await res.text();
      console.log(`[Variation ${i + 1}] Status: ${res.status} | Snippet:`, text.substring(0, 150));
    } catch (e) {
      console.log(`[Variation ${i + 1}] Error:`, e.message);
    }
  }
}

testFormats().catch(console.error);
