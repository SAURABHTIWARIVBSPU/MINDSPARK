const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, l) => {
  const [k, ...v] = l.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

const sc = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  console.log('--- 1. PAGINATED RETRIEVAL OF ALL ADMIT CARDS IN SUPABASE ---');
  let allCards = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, count, error } = await sc
      .from('admit_cards')
      .select('student_id, registration_number, file_id, status, storage_type', { count: 'exact' })
      .range(from, from + step - 1);
    
    if (error) {
      console.error('Error fetching cards:', error);
      break;
    }
    if (!data || data.length === 0) break;
    allCards.push(...data);
    console.log(`Fetched range [${from}..${from + data.length - 1}], total accumulated: ${allCards.length} (total count: ${count})`);
    if (data.length < step) break;
    from += step;
  }

  console.log(`\nTotal admit_cards rows retrieved: ${allCards.length}`);
  const readyCount = allCards.filter(c => c.status === 'READY').length;
  console.log(`Rows with status === 'READY': ${readyCount}`);
  const nonReady = allCards.filter(c => c.status !== 'READY');
  if (nonReady.length > 0) {
    console.log(`Non-ready rows count: ${nonReady.length}`);
  }

  const distinctRegs = new Set(allCards.map(c => c.registration_number));
  console.log(`Distinct registration numbers: ${distinctRegs.size}`);
  const distinctStudents = new Set(allCards.map(c => c.student_id));
  console.log(`Distinct student IDs: ${distinctStudents.size}`);

  // Duplicate checks
  const regCounts = {};
  for (const c of allCards) {
    regCounts[c.registration_number] = (regCounts[c.registration_number] || 0) + 1;
  }
  const duplicates = Object.entries(regCounts).filter(([_, count]) => count > 1);
  console.log(`Duplicate registration numbers in admit_cards: ${duplicates.length}`);

  console.log('\n--- 2. PAGINATED RETRIEVAL OF ALL OBJECTS IN STORAGE BUCKET ---');
  let allStorageFiles = [];
  let offset = 0;
  const listLimit = 500;
  while (true) {
    const { data, error } = await sc.storage.from('admit-cards').list('', {
      limit: listLimit,
      offset: offset,
      sortBy: { column: 'name', order: 'asc' }
    });
    if (error) {
      console.error('Storage list error:', error);
      break;
    }
    if (!data || data.length === 0) break;
    allStorageFiles.push(...data);
    console.log(`Fetched ${data.length} objects at offset ${offset}. Total accumulated: ${allStorageFiles.length}`);
    if (data.length < listLimit) break;
    offset += data.length;
  }

  console.log(`\nTotal objects in admit-cards bucket: ${allStorageFiles.length}`);

  console.log('\n--- 3. RECONCILIATION: ADMIT_CARDS TABLE VS STORAGE OBJECTS ---');
  const storageFileNames = new Set(allStorageFiles.map(f => f.name));
  let missingInStorage = 0;
  let mismatchedNames = [];
  for (const card of allCards) {
    if (!storageFileNames.has(card.file_id)) {
      missingInStorage++;
      mismatchedNames.push(card.file_id);
    }
  }
  console.log(`Admit cards missing in storage bucket: ${missingInStorage}`);
  if (mismatchedNames.length > 0) {
    console.log(`Sample missing filenames (first 5):`, mismatchedNames.slice(0, 5));
  }

  // Check orphaned storage files (files in storage not in admit_cards)
  const cardFileNames = new Set(allCards.map(c => c.file_id));
  let orphanedInStorage = 0;
  for (const file of allStorageFiles) {
    if (!cardFileNames.has(file.name)) {
      orphanedInStorage++;
    }
  }
  console.log(`Orphaned storage files not in admit_cards table: ${orphanedInStorage}`);

  // Fetch eligible students to verify 1:1 candidate match
  console.log('\n--- 4. CANDIDATE ELIGIBILITY RECONCILIATION ---');
  let allStudents = [];
  from = 0;
  while (true) {
    const { data, count, error } = await sc
      .from('students')
      .select('student_id, registration_number, status')
      .range(from, from + step - 1);
    if (error) { console.error('Student fetch error:', error); break; }
    if (!data || data.length === 0) break;
    allStudents.push(...data);
    if (data.length < step) break;
    from += step;
  }
  console.log(`Total rows in students table: ${allStudents.length}`);
  
  const officialActive = allStudents.filter(s => s.registration_number.startsWith('MS2611') && s.status === 'ACTIVE');
  const officialPending = allStudents.filter(s => s.registration_number.startsWith('MS2611') && s.status !== 'ACTIVE');
  const sandboxTest = allStudents.filter(s => !s.registration_number.startsWith('MS2611'));

  console.log(`Official Active Candidates (MS2611% & ACTIVE): ${officialActive.length}`);
  console.log(`Official Pending Candidates (MS2611% & not ACTIVE): ${officialPending.length}`);
  console.log(`Sandbox / Test Candidates (not MS2611%): ${sandboxTest.length}`);

  // Verify that every official active candidate has an admit card
  const activeStudentIds = new Set(officialActive.map(s => s.student_id));
  let activeWithoutCard = 0;
  for (const s of officialActive) {
    if (!distinctStudents.has(s.student_id)) {
      activeWithoutCard++;
    }
  }
  console.log(`Active candidates without admit card: ${activeWithoutCard}`);

  // Verify that NO pending or sandbox candidate has an admit card
  let pendingWithCard = 0;
  for (const s of officialPending) {
    if (distinctStudents.has(s.student_id)) pendingWithCard++;
  }
  let sandboxWithCard = 0;
  for (const s of sandboxTest) {
    if (distinctStudents.has(s.student_id)) sandboxWithCard++;
  }
  console.log(`Pending candidates with admit card: ${pendingWithCard} (must be 0)`);
  console.log(`Sandbox candidates with admit card: ${sandboxWithCard} (must be 0)`);
}

verify().catch(console.error);
