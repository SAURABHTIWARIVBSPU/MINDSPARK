const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
});

async function testSend(channel, from) {
  const payload = {
    channel: channel,
    to: ['918948905711'],
    from: from,
    apiKey: env.ICPAAS_API_KEY,
    content: {
      data: {
        text: 'Test message for admit card'
      }
    }
  };

  console.log(`\nTesting channel: ${channel}, from: ${from}`);
  try {
    const res = await fetch('https://icpaas.in/api/v1/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.ICPAAS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, text);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

async function main() {
  await testSend('WhatsApp', '8707744749');
  await testSend('SMS', 'MEENA');
}

main();
