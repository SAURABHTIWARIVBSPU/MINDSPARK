const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');

async function benchmark(name, concurrency, totalRequests, makeRequest) {
  console.log(`\n--- [${name}] Concurrency: ${concurrency} | Total: ${totalRequests} ---`);
  const latencies = [];
  let status200 = 0;
  let statusOther = 0;
  let errors = 0;

  const startTime = Date.now();
  let requestIndex = 0;

  async function worker() {
    while (requestIndex < totalRequests) {
      const idx = requestIndex++;
      const t0 = Date.now();
      try {
        const res = await makeRequest(idx);
        const elapsed = Date.now() - t0;
        latencies.push(elapsed);
        if (res.status === 200) status200++;
        else statusOther++;
      } catch (err) {
        errors++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const totalTimeSec = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = (latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1)).toFixed(1);
  const rps = (totalRequests / totalTimeSec).toFixed(1);

  console.log(`  Completed: ${totalRequests} | 200 OK: ${status200} | Non-200: ${statusOther} | Errors: ${errors}`);
  console.log(`  Throughput: ${rps} req/sec | Duration: ${totalTimeSec.toFixed(2)}s`);
  console.log(`  Latency: p50: ${p50}ms | p90: ${p90}ms | p95: ${p95}ms | p99: ${p99}ms | Avg: ${avg}ms`);

  return { concurrency, rps, p50, p95, p99, status200, errors };
}

async function run() {
  const c = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: st } = await c.from('students').select('registration_number, date_of_birth').eq('status', 'ACTIVE').limit(1);
  const cand = st[0];
  console.log(`Using live test record for benchmark (masked)`);

  // Warmup
  await fetch('http://localhost:3006/api/settings');

  // 1. Search Endpoint Benchmarks
  console.log('\n=============================================');
  console.log('PART 1: STUDENT SEARCH BENCHMARK (POST)');
  console.log('=============================================');

  await benchmark('Search @ 50 Users', 50, 250, (idx) => {
    return fetch('http://localhost:3006/api/public/admit-card/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': `10.10.${Math.floor(idx / 50)}.${(idx % 50) + 1}`,
      },
      body: JSON.stringify({
        registrationNumber: cand.registration_number,
        dateOfBirth: cand.date_of_birth,
      }),
    });
  });

  await benchmark('Search @ 100 Users', 100, 500, (idx) => {
    return fetch('http://localhost:3006/api/public/admit-card/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': `10.10.${Math.floor(idx / 50)}.${(idx % 50) + 1}`,
      },
      body: JSON.stringify({
        registrationNumber: cand.registration_number,
        dateOfBirth: cand.date_of_birth,
      }),
    });
  });

  // 2. Download Endpoint Benchmarks
  console.log('\n=============================================');
  console.log('PART 2: PDF DOWNLOAD BENCHMARK (GET)');
  console.log('=============================================');

  await benchmark('Download @ 50 Users', 50, 200, (idx) => {
    return fetch(
      `http://localhost:3006/api/public/admit-card/download?regNo=${cand.registration_number}&dob=${cand.date_of_birth}&bypassDateLock=true`,
      {
        headers: {
          'X-Forwarded-For': `10.20.${Math.floor(idx / 50)}.${(idx % 50) + 1}`,
        },
      }
    );
  });

  await benchmark('Download @ 100 Users', 100, 400, (idx) => {
    return fetch(
      `http://localhost:3006/api/public/admit-card/download?regNo=${cand.registration_number}&dob=${cand.date_of_birth}&bypassDateLock=true`,
      {
        headers: {
          'X-Forwarded-For': `10.20.${Math.floor(idx / 50)}.${(idx % 50) + 1}`,
        },
      }
    );
  });
}

run().catch(console.error);
