const fs = require('fs');

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

const { getDb } = require('../src/lib/db');
const { getStorageAdapter } = require('../src/lib/storage');

async function testServerSideOps() {
  console.log('Testing Server-Side Database & Storage Operations via Service Role:');
  const db = getDb();
  const storage = getStorageAdapter();

  // 1. Get settings
  const settings = await db.getSettings();
  console.log('Settings fetched successfully: venue =', settings.venue ? 'YES' : 'NO', '| examDate =', settings.examDate ? 'YES' : 'NO');

  // 2. Search student
  const student = await db.getStudentByRegNo('MS261100001');
  console.log('Student by regNo fetched:', student ? `YES (id: ${student.studentId}, reg: ${student.registrationNumber})` : 'NO');

  // 3. Get Admit Card
  const card = await db.getAdmitCardByStudentId(student.studentId);
  console.log('Admit card fetched:', card ? `YES (fileId: ${card.fileId}, status: ${card.status})` : 'NO');

  // 4. Storage getDownloadUrl
  if (card) {
    const signedUrl = await storage.getDownloadUrl(card.fileId, 60);
    console.log('Signed download URL generated:', signedUrl ? 'YES (Valid URL)' : 'NO');
    const headRes = await fetch(signedUrl, { method: 'HEAD' });
    console.log('HEAD request to signed URL:', headRes.status === 200 ? 'SUCCESS (HTTP 200)' : `FAILED (${headRes.status})`);
  }
}

testServerSideOps().catch(console.error);
