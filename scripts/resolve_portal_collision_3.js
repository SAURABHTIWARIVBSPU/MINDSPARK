const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
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

async function resolveCollision() {
  console.log('=== RESOLVING 3 PORTAL AUTO-INCREMENT COLLISIONS ===\n');

  // 1. Move the 3 admin students to 6050, 6051, 6052
  const reassignments = [
    { oldReg: 'MS261105208', newReg: 'MS261106050', name: 'ALI HASAN KHAN' },
    { oldReg: 'MS261105209', newReg: 'MS261106051', name: 'ALI HAIDER KHAN' },
    { oldReg: 'MS261105210', newReg: 'MS261106052', name: 'MOHMMAD HUSSAM' },
  ];

  for (const item of reassignments) {
    console.log(`Reassigning portal student ${item.name}: ${item.oldReg} -> ${item.newReg}`);
    
    // Update student table
    const { error: stdErr } = await supabase
      .from('students')
      .update({ registration_number: item.newReg })
      .eq('registration_number', item.oldReg);
    if (stdErr) throw stdErr;

    // Update admit_cards table
    const { error: cardErr } = await supabase
      .from('admit_cards')
      .update({ registration_number: item.newReg })
      .eq('registration_number', item.oldReg);
    if (cardErr) console.warn('Card update note:', cardErr.message);
  }

  // 2. Insert ILMA, SAMAYRA, DANIYA into Supabase with 5208, 5209, 5210
  const sirSyedCandidates = [
    {
      student_id: `std_sir_syed_5208`,
      registration_number: 'MS261105208',
      name: 'ILMA',
      father_name: 'ASLAM',
      date_of_birth: '10-09-2015',
      phone: '9984931343',
      school_or_college: 'SIR SYED MONTESSORI',
      class_name: '4',
      competition_name: 'POSTER ARTIST',
      status: 'ACTIVE',
      whatsapp_status: 'NOT_SENT',
      created_by: 'candidate_data_7'
    },
    {
      student_id: `std_sir_syed_5209`,
      registration_number: 'MS261105209',
      name: 'SAMAYRA',
      father_name: 'GULSHAN',
      date_of_birth: '20-11-2016',
      phone: '8299839953',
      school_or_college: 'SIR SYED MONTESSORI',
      class_name: '4',
      competition_name: 'POSTER ARTIST',
      status: 'ACTIVE',
      whatsapp_status: 'NOT_SENT',
      created_by: 'candidate_data_7'
    },
    {
      student_id: `std_sir_syed_5210`,
      registration_number: 'MS261105210',
      name: 'DANIYA',
      father_name: 'SAMIULLAH',
      date_of_birth: '09-12-2016',
      phone: '8707616147',
      school_or_college: 'SIR SYED MONTESSORI',
      class_name: '4',
      competition_name: 'POSTER ARTIST',
      status: 'ACTIVE',
      whatsapp_status: 'NOT_SENT',
      created_by: 'candidate_data_7'
    }
  ];

  console.log('\nInserting Sir Syed candidates (ILMA, SAMAYRA, DANIYA) into Supabase...');
  const { error: insErr } = await supabase.from('students').insert(sirSyedCandidates);
  if (insErr) throw insErr;
  console.log('✅ Successfully inserted Sir Syed candidates under their official printed registration numbers!');

  // 3. Update system_settings seq to 6052
  await supabase.from('system_settings').update({ reg_no_seq_current: 6052 }).eq('id', 'default');
  console.log('✅ Updated system_settings.reg_no_seq_current to 6052');

  // 4. Update Master Excel file to include the 3 preserved portal candidates
  console.log('\nUpdating Master_All_Students_Registry.xlsx to include the 3 preserved portal candidates...');
  const wb = XLSX.readFile('Master_All_Students_Registry.xlsx');
  const masterSheet = wb.Sheets['Master All Students'];
  const masterStudents = XLSX.utils.sheet_to_json(masterSheet);

  // Add the 3 portal students to master
  const portalStudentsForExcel = [
    {
      'S.No': masterStudents.length + 1,
      'Registration No': 'MS261106050',
      'Student Name': 'ALI HASAN KHAN',
      "Father's Name": 'JAVED KHAN',
      'Date of Birth': '2016-09-14',
      'Phone Number': '7706057073',
      'School / College': 'KANPUR PUBLIC SCHOOL',
      'Class': '4',
      'Event Category': 'BATTLE OF BRAINS',
      'Examination Date': '01 Nov 2026 (Sunday)',
      'Reporting Time': '01:30 PM',
      'Examination Time': '02:00 PM - 03:00 PM',
      'Shift / Batch': 'BATCH 1',
      'Campus / Venue': 'MEENA SHAH PUBLIC SCHOOL',
      'Specific Hall / Room': 'MSPS 1st FLOOR',
      'Admit Card Status': 'ELIGIBLE & SCHEDULED',
      'Eligibility Notes': 'Approved for official examination',
      'WhatsApp Status': 'NOT_SENT'
    },
    {
      'S.No': masterStudents.length + 2,
      'Registration No': 'MS261106051',
      'Student Name': 'ALI HAIDER KHAN',
      "Father's Name": 'JAVED KHAN',
      'Date of Birth': '2022-09-23',
      'Phone Number': '7706057073',
      'School / College': 'KANPUR PUBLIC SCHOOL',
      'Class': 'NURSERY',
      'Event Category': 'COLOUR BY NUMBER',
      'Examination Date': '01 Nov 2026 (Sunday)',
      'Reporting Time': '10:30 AM',
      'Examination Time': '11:00 AM - 12:00 PM',
      'Shift / Batch': 'BATCH 1',
      'Campus / Venue': 'MEENA SHAH PUBLIC SCHOOL',
      'Specific Hall / Room': 'MSPS 1st FLOOR',
      'Admit Card Status': 'ELIGIBLE & SCHEDULED',
      'Eligibility Notes': 'Approved for official examination',
      'WhatsApp Status': 'NOT_SENT'
    },
    {
      'S.No': masterStudents.length + 3,
      'Registration No': 'MS261106052',
      'Student Name': 'MOHMMAD HUSSAM',
      "Father's Name": 'MOHAMMAD FIROZ',
      'Date of Birth': '2021-06-29',
      'Phone Number': '7985140704',
      'School / College': 'FATIMA SCHOOL',
      'Class': 'LKG',
      'Event Category': 'JOINTS THE DOTS AND COLOUR',
      'Examination Date': '01 Nov 2026 (Sunday)',
      'Reporting Time': '10:30 AM',
      'Examination Time': '11:00 AM - 12:00 PM',
      'Shift / Batch': 'BATCH 1',
      'Campus / Venue': 'MEENA SHAH PUBLIC SCHOOL',
      'Specific Hall / Room': 'MSPS GROUND FLOOR',
      'Admit Card Status': 'ELIGIBLE & SCHEDULED',
      'Eligibility Notes': 'Approved for official examination',
      'WhatsApp Status': 'NOT_SENT'
    }
  ];

  const updatedMasterList = masterStudents.concat(portalStudentsForExcel);
  wb.Sheets['Master All Students'] = XLSX.utils.json_to_sheet(updatedMasterList);
  XLSX.writeFile(wb, 'Master_All_Students_Registry.xlsx');
  XLSX.writeFile(wb, 'MINDSPARK_2026_MASTER_APPROVED_DELIVERABLE.xlsx');
  XLSX.writeFile(wb, 'C:\\Users\\Saurabh Tiwari\\Desktop\\MINDSPARK_2026_MASTER_APPROVED_DELIVERABLE.xlsx');
  console.log(`✅ Master workbooks updated. Total Master Students: ${updatedMasterList.length}`);
}

resolveCollision().catch(console.error);
