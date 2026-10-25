const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, l) => {
  const [k, ...v] = l.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

const anonClient = createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testRealDml() {
  console.log('Testing Anon INSERT with REAL columns on students:');
  const insRes = await anonClient.from('students').insert({
    student_id: 'hack_id_9999',
    registration_number: 'MS26HACK9999',
    name: 'Attacker'
  });
  console.log('Insert Result:', insRes.error ? `DENIED: ${insRes.error.message} (${insRes.error.code})` : 'UNSAFE: SUCCESS');

  console.log('\nTesting Anon UPDATE with REAL columns on students:');
  const updRes = await anonClient.from('students').update({
    name: 'Defaced Name'
  }).eq('registration_number', 'MS261100001');
  console.log('Update Result:', updRes.error ? `DENIED: ${updRes.error.message} (${updRes.error.code})` : 'UNSAFE: SUCCESS');

  console.log('\nTesting Anon DELETE with REAL columns on students:');
  const delRes = await anonClient.from('students').delete().eq('registration_number', 'MS261100001');
  console.log('Delete Result:', delRes.error ? `DENIED: ${delRes.error.message} (${delRes.error.code})` : 'UNSAFE: SUCCESS');

  console.log('\nTesting Anon INSERT with REAL columns on users:');
  const uIns = await anonClient.from('users').insert({
    uid: 'hack_admin',
    email: 'hacker@evil.com',
    role: 'ADMIN'
  });
  console.log('User Insert Result:', uIns.error ? `DENIED: ${uIns.error.message} (${uIns.error.code})` : 'UNSAFE: SUCCESS');
}

testRealDml().catch(console.error);
