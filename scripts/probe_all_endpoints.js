const API_KEY = 'f4aaf8f8-1866-49e6-b035-fa06093b010d';

async function testEndpoint(method, path, body = null) {
  try {
    const res = await fetch(`https://icpaas.in${path}`, {
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    console.log(`[${res.status}] ${method} ${path} ->`, text.slice(0, 150));
  } catch (e) {
    console.log(`[ERR] ${method} ${path} ->`, e.message);
  }
}

async function main() {
  console.log('Testing endpoints with Bearer f4aaf8f8-1866-49e6-b035-fa06093b010d:');
  await testEndpoint('GET', '/api/v1/user/balance');
  await testEndpoint('GET', '/api/v1/meta/templates');
  await testEndpoint('GET', '/v18.0/channels');
  await testEndpoint('GET', '/v1.0/channels');
  await testEndpoint('GET', '/v17.0/channels');
  await testEndpoint('GET', '/v16.0/channels');
  await testEndpoint('POST', '/api/v1/meta/templates/sync');
}

main();
