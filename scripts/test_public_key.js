const key = 'f4aaf8f8-1866-49e6-b035-fa06093b010d';

async function test(name, url, opts) {
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    console.log(`[${res.status}] ${name}: ${text.slice(0, 100)}`);
    if (res.status === 200) {
      console.log(`🎉 SUCCESS WITH ${name}!`);
    }
  } catch (e) {
    console.log(`[ERR] ${name}: ${e.message}`);
  }
}

async function run() {
  const variations = [
    { name: 'Bearer Token', headers: { 'Authorization': 'Bearer ' + key } },
    { name: 'Raw Token', headers: { 'Authorization': key } },
    { name: 'ApiKey Token', headers: { 'Authorization': 'ApiKey ' + key } },
    { name: 'apiKey header', headers: { 'apiKey': key } },
    { name: 'x-api-key header', headers: { 'x-api-key': key } },
    { name: 'Public-Key header', headers: { 'Public-Key': key } },
    { name: 'Query ?apiKey=', url: 'https://icpaas.in/api/v1/meta/templates?apiKey=' + key },
    { name: 'Query ?api_key=', url: 'https://icpaas.in/api/v1/meta/templates?api_key=' + key },
  ];

  for (const v of variations) {
    const u = v.url || 'https://icpaas.in/api/v1/meta/templates';
    await test(v.name, u, { method: 'GET', headers: v.headers || {} });
  }

  // Also test /api/v1/user/balance
  for (const v of variations) {
    const u = v.url ? v.url.replace('/meta/templates', '/user/balance') : 'https://icpaas.in/api/v1/user/balance';
    await test(`[Balance] ${v.name}`, u, { method: 'GET', headers: v.headers || {} });
  }
}

run();
