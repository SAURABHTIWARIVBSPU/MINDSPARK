const fs = require('fs');
const path = require('path');

function searchHistory() {
  const f = 'scripts/chrome_fresh/History';
  if (!fs.existsSync(f)) return;
  const buf = fs.readFileSync(f);
  const str = buf.toString('latin1');
  const urls = [...str.matchAll(/https?:\/\/[a-zA-Z0-9_\-\.:]+\/?[^\s\x00-\x1f\x7f-\xff]*/g)].map(m => m[0]);
  console.log('Total URLs found in Chrome fresh history:', urls.length);
  const icpaasUrls = urls.filter(u => u.includes('icpaas'));
  console.log('ICPaaS URLs in Chrome:');
  [...new Set(icpaasUrls)].forEach(u => console.log('  ', u));
}

function searchLevelDB() {
  const dir = 'scripts/chrome_fresh/leveldb';
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.ldb') || f.endsWith('.log')) {
      const buf = fs.readFileSync(path.join(dir, f));
      const str = buf.toString('latin1');
      if (str.includes('icpaas') || str.includes('Authorization') || str.includes('Bearer') || str.includes('meenashah')) {
        console.log(`\nMatch in Chrome leveldb: ${f}`);
        // look for tokens or uuid or jwt
        const jwts = [...str.matchAll(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+/g)].map(m => m[0]);
        if (jwts.length) console.log('  JWTs:', [...new Set(jwts)]);
        const uuids = [...str.matchAll(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi)].map(m => m[0]);
        if (uuids.length) console.log('  UUIDs:', [...new Set(uuids)]);
        // Snippets
        const lines = str.split(/[\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f]+/);
        lines.forEach(l => {
          if (l.includes('icpaas') || l.includes('token') || l.includes('auth')) {
            console.log('  Line:', l.trim().slice(0, 200));
          }
        });
      }
    }
  }
}

searchHistory();
searchLevelDB();
