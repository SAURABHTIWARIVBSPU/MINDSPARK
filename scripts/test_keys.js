const candidateKeys = [
  'f4aaf8f8-1866-49e6-b035-fa06093b010d', // existing
  '6c527e1a-b85d-46f0-8e87-d179b811db60',
  'a7ae2f06-c74b-4677-9462-8664bac07b2a',
  '7b748488-77b8-4b6c-b1f1-0feb8634caab',
  '5b93d52a-b543-4e10-a188-2b9df28ebfad',
  'babbed08-2a86-45ff-bc53-911d1bccbab8',
  '1ca1923f-d9ce-494c-beaf-3530eb348178',
  '74f80e2f-1a02-449e-9087-136ecb926959',
  '9af59462-24ce-49be-b87d-cb8f70a4bbec',
  'a40aaa9a-2b95-4c4f-9dc7-ade644154b14'
];

async function testKey(key) {
  try {
    const res = await fetch('https://icpaas.in/api/v1/meta/templates', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    const text = await res.text();
    console.log(`[${res.status}] Key ${key.slice(0, 8)}...:`, text.slice(0, 150));
    if (res.status === 200) {
      console.log(`🎉 SUCCESS WITH KEY: ${key}!`);
    }
  } catch (e) {
    console.log(`Err: ${e.message}`);
  }
}

async function main() {
  console.log(`Testing ${candidateKeys.length} candidate keys...`);
  for (const k of candidateKeys) {
    await testKey(k);
  }
}

main();
