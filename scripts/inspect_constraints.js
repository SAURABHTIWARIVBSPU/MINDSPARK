const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  console.log('Testing constraint on registration_number...');
  // Attempt to insert duplicate registration_number to verify unique constraint enforcement
  const testStudent = {
    student_id: 'test_constraint_' + Date.now(),
    registration_number: 'MS261100001', // Already belongs to Mohammad Aayan
    name: 'TEST DUPLICATE',
    father_name: 'TEST FATHER',
    date_of_birth: '2014-01-01',
    phone: '9999999999',
    school_or_college: 'TEST SCHOOL',
    class_name: '3',
    competition_name: 'PAINT YOUR IMAGINATION',
    status: 'ACTIVE'
  };

  const { data, error } = await supabase.from('students').insert(testStudent);
  if (error) {
    console.log('✅ Database strictly prevented duplicate registration_number:');
    console.log('   Error Code:', error.code);
    console.log('   Message:', error.message);
  } else {
    console.error('❌ CRITICAL VULNERABILITY: Duplicate registration number was allowed!');
  }

  console.log('\nTesting constraint on admit_cards table...');
  const { data: existingCard } = await supabase.from('admit_cards').select('*').limit(1).single();
  if (existingCard) {
    console.log('Sample existing card student_id:', existingCard.student_id);
    const testCard = {
      card_id: 'test_card_' + Date.now(),
      student_id: existingCard.student_id,
      registration_number: 'MS26TEST_CARD',
      file_id: 'test.pdf',
      storage_type: 'supabase',
      template_version: 'v3.4',
      source_data_hash: 'hash',
      status: 'READY'
    };
    const { data: cardData, error: cardError } = await supabase.from('admit_cards').insert(testCard);
    if (cardError) {
      console.log('✅ admit_cards constraint triggered:');
      console.log('   Error Code:', cardError.code);
      console.log('   Message:', cardError.message);
    } else {
      console.log('ℹ️ Note: admit_cards student_id has no unique constraint, deleting test card...');
      await supabase.from('admit_cards').delete().eq('card_id', testCard.card_id);
    }
  }
}

inspect().catch(console.error);
