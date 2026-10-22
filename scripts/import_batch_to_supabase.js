const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[k] = v;
  }
});

const { createClient } = require('@supabase/supabase-js');
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const masterFile = path.join(process.cwd(), 'Master_Student_Category_Report_2026.xlsx');
if (!fs.existsSync(masterFile)) {
  console.error('Master report file not found');
  process.exit(1);
}

const wb = XLSX.readFile(masterFile);
const students = XLSX.utils.sheet_to_json(wb.Sheets['Master Students']);

async function importBatch() {
  console.log(`Starting Supabase Cloud sync for ${students.length} verified candidate records...`);
  
  const recordsToInsert = students.map((s, idx) => {
    // Convert DD-MM-YYYY to YYYY-MM-DD
    let dob = s['Date of Birth'];
    if (dob && dob.includes('-')) {
      const parts = dob.split('-');
      if (parts[0].length === 2 && parts[2].length === 4) {
        dob = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    return {
      student_id: `std_${Date.now()}_${String(idx + 1).padStart(5, '0')}`,
      registration_number: s['Registration No'],
      name: s['Student Name'],
      father_name: s["Father's Name"],
      date_of_birth: dob,
      phone: s['Phone Number'] || '0000000000',
      school_or_college: s['School / College'] || 'MSITM',
      class_name: s['Class'] || 'N/A',
      competition_name: s['Event Category'] || 'GENERAL',
      status: s['Validation Status'].startsWith('FLAGGED') ? 'PENDING_REVIEW' : 'ACTIVE',
      whatsapp_status: 'NOT_SENT',
      created_by: 'batch_import_21_10_2026',
      updated_by: 'batch_import_21_10_2026',
      data_version: 1
    };
  });

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
    const chunk = recordsToInsert.slice(i, i + BATCH_SIZE);
    const { data, error } = await client.from('students').insert(chunk);
    if (error) {
      console.error(`Error at chunk ${i} - ${i + chunk.length}:`, error.message);
      throw error;
    }
    inserted += chunk.length;
    console.log(`Uploaded ${inserted} / ${recordsToInsert.length} candidates...`);
  }

  // Update reg_no_seq_current in system_settings
  const nextSeq = 1140 + students.length;
  await client.from('system_settings').update({ reg_no_seq_current: nextSeq }).eq('id', 'default_settings');

  console.log(`ALL ${inserted} CANDIDATES SUCCESSFULLY IMPORTED TO SUPABASE POSTGRESQL!`);
  console.log(`Updated next sequence counter to: ${nextSeq}`);
}

// Check if user passed --execute flag
if (process.argv.includes('--execute')) {
  importBatch().catch(console.error);
} else {
  console.log('DRY RUN COMPLETE: Run with --execute after user confirmation to push to live database.');
}
