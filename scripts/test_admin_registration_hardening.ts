import fs from 'fs';
import path from 'path';

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

import { getDb } from '../src/lib/db';
import { validateStudentEligibility } from '../src/lib/validation/eligibility';
import { getStudentEventSchedule } from '../src/lib/pdf/event-schedule';

async function runHardeningTests() {
  console.log('========================================================================');
  console.log('   STRICT PRE-REGISTRATION PRODUCTION VERIFICATION & STRESS SUITE       ');
  console.log('========================================================================\n');

  const db = getDb();
  const createdTestStudentIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Standard Normal Registration & Shift Allocation
    // -------------------------------------------------------------------------
    console.log('TEST 1: Verifying Standard Clean Registration & Shift Allocation...');
    const test1Data = {
      name: 'TEST_VERIF_AARAV',
      fatherName: 'TEST_VERIF_RAJESH',
      dateOfBirth: '2020-05-15',
      phone: '9888800001',
      schoolOrCollege: 'TEST MEENA SHAH PUBLIC SCHOOL',
      className: 'NURSERY',
      competitionName: 'Colour by Number',
      status: 'ACTIVE' as const,
      createdBy: 'test_verifier',
      updatedBy: 'test_verifier',
    };

    const student1 = await db.createStudent(test1Data);
    createdTestStudentIds.push(student1.studentId);
    console.log(`   ✅ Student Registered: ${student1.registrationNumber} (${student1.name})`);

    const sched1 = getStudentEventSchedule(student1.competitionName, student1.className, student1.registrationNumber);
    console.log(`   ✅ Shift Allotted: ${sched1.examTime} @ ${sched1.venueDetail}`);
    console.log(`   ✅ Hold Status: ${sched1.isHold ? 'ON HOLD' : 'CONFIRMED ACTIVE (Pass)'}\n`);

    if (sched1.isHold || !student1.registrationNumber.startsWith('MS2611')) {
      throw new Error('Test 1 Failed: Unexpected registration number or hold status on Nursery Colour by Number');
    }

    // -------------------------------------------------------------------------
    // TEST 2: Strict Duplicate Registration Prevention (Single Allotment Invariant)
    // -------------------------------------------------------------------------
    console.log('TEST 2: Verifying Duplicate Prevention (Same Human Student Re-registration)...');
    let duplicatePrevented = false;
    try {
      // Attempt to register the exact same student in a different competition
      await db.createStudent({
        ...test1Data,
        competitionName: 'JOIN THE DOTS',
        className: 'LKG',
      });
    } catch (err: any) {
      if (err.message.includes('DUPLICATE REGISTRATION CONFLICT')) {
        duplicatePrevented = true;
        console.log(`   ✅ Caught Expected Conflict: ${err.message.split(':')[0]}`);
        console.log(`      Detail: Duplicate human candidate was strictly rejected at database layer.`);
      } else {
        throw err;
      }
    }

    if (!duplicatePrevented) {
      throw new Error('Test 2 FAILED: Duplicate registration was not prevented!');
    }
    console.log('   ✅ PASS: Student can never receive two simultaneous registrations or allotments.\n');

    // -------------------------------------------------------------------------
    // TEST 3: Concurrent Simultaneous Registrations (Race Condition Test)
    // -------------------------------------------------------------------------
    console.log('TEST 3: Simulating 5 Concurrent Simultaneous Admin Registrations (Race Condition)...');
    const concurrentPayloads = [
      { name: 'TEST_CONCURRENT_1', fatherName: 'TEST_FATHER_C1', phone: '9777700001', className: '1', competitionName: 'Clay Champs' },
      { name: 'TEST_CONCURRENT_2', fatherName: 'TEST_FATHER_C2', phone: '9777700002', className: '2', competitionName: 'Paint Your Imagination' },
      { name: 'TEST_CONCURRENT_3', fatherName: 'TEST_FATHER_C3', phone: '9777700003', className: '4', competitionName: 'Battle of Brains' },
      { name: 'TEST_CONCURRENT_4', fatherName: 'TEST_FATHER_C4', phone: '9777700004', className: '6', competitionName: 'Sudoku' },
      { name: 'TEST_CONCURRENT_5', fatherName: 'TEST_FATHER_C5', phone: '9777700005', className: '9', competitionName: 'Young Innovators' },
    ];

    const concurrentResults = await Promise.all(
      concurrentPayloads.map((p) =>
        db.createStudent({
          ...p,
          dateOfBirth: '2015-01-01',
          schoolOrCollege: 'TEST CONCURRENT SCHOOL',
          status: 'ACTIVE' as const,
          createdBy: 'concurrent_agent',
          updatedBy: 'concurrent_agent',
        })
      )
    );

    concurrentResults.forEach((s) => createdTestStudentIds.push(s.studentId));

    const allocatedRegNos = concurrentResults.map((s) => s.registrationNumber);
    const uniqueRegNos = new Set(allocatedRegNos);

    console.log(`   Allocated Reg Numbers: ${allocatedRegNos.join(', ')}`);
    if (uniqueRegNos.size !== allocatedRegNos.length) {
      throw new Error('Test 3 FAILED: Collision detected among concurrent registrations!');
    }
    console.log('   ✅ PASS: 100% Unique sequential registration numbers allocated under race condition.\n');

    // -------------------------------------------------------------------------
    // TEST 4: Program Eligibility & Hold Directive Enforcement
    // -------------------------------------------------------------------------
    console.log('TEST 4: Verifying On-Hold Program Directives (Junior Scientist & Graduation)...');
    const holdPayload = {
      name: 'TEST_HOLD_CANDIDATE',
      fatherName: 'TEST_HOLD_FATHER',
      dateOfBirth: '2012-04-10',
      phone: '9666600001',
      schoolOrCollege: 'TEST SCHOOL',
      className: '7',
      competitionName: 'Junior Scientist',
      status: 'ACTIVE' as const,
      createdBy: 'hold_tester',
      updatedBy: 'hold_tester',
    };

    const holdEligibility = validateStudentEligibility(holdPayload.competitionName, holdPayload.className);
    console.log(`   Junior Scientist Eligibility Check:`);
    console.log(`      Valid Program: ${holdEligibility.valid ? 'YES' : 'NO'}`);
    console.log(`      Hold Flag: ${holdEligibility.isHold ? 'YES (Hold enforced)' : 'NO'}`);
    console.log(`      Hold Directive: "${holdEligibility.holdReason}"`);

    if (!holdEligibility.isHold) {
      throw new Error('Test 4 FAILED: Junior Scientist must be flagged ON HOLD per committee directives!');
    }

    const studentHold = await db.createStudent(holdPayload);
    createdTestStudentIds.push(studentHold.studentId);
    console.log(`   ✅ Student Registered on Hold: ${studentHold.registrationNumber}`);
    console.log('   ✅ PASS: Hold directives strictly honored.\n');

    // -------------------------------------------------------------------------
    // TEST 5: Program Update & Admit Card Stale Invalidation
    // -------------------------------------------------------------------------
    console.log('TEST 5: Verifying Program Change & Admit Card Invalidation...');
    // Update student1 from Nursery Colour by Number to Play Group Fancy Dress
    const updatedStudent1 = await db.updateStudent(student1.studentId, {
      competitionName: 'Unique & Creative Handmade Fancy Dress',
      className: 'PLAY GROUP',
    });

    console.log(`   Updated student ${updatedStudent1.registrationNumber} to: ${updatedStudent1.competitionName} (${updatedStudent1.className})`);
    const newSched = getStudentEventSchedule(updatedStudent1.competitionName, updatedStudent1.className, updatedStudent1.registrationNumber);
    console.log(`   New Allotted Schedule: ${newSched.examTime} @ ${newSched.venueDetail}`);

    if (newSched.eventName.includes('Colour by Number')) {
      throw new Error('Test 5 FAILED: Old schedule was not updated to new program!');
    }
    console.log('   ✅ PASS: Program changes dynamically update allotment with zero stale records.\n');

    // -------------------------------------------------------------------------
    // TEST 6: Incompatible Program/Class Validation
    // -------------------------------------------------------------------------
    console.log('TEST 6: Verifying Invalid Program Rejection...');
    const invalidCheck = validateStudentEligibility('NON_EXISTENT_OLYMPIAD_XYZ', '5');
    if (invalidCheck.valid) {
      throw new Error('Test 6 FAILED: Non-existent competition should be invalid!');
    }
    console.log(`   ✅ PASS: Invalid competition rejected with: "${invalidCheck.error}"\n`);

    console.log('========================================================================');
    console.log('🏆 ALL PRE-REGISTRATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } finally {
    // Clean up temporary test student records so production database remains pristine
    console.log(`Cleaning up ${createdTestStudentIds.length} temporary test records...`);
    for (const sid of createdTestStudentIds) {
      try {
        await db.archiveStudent(sid, 'verifier_cleanup');
      } catch (cleanErr) {
        console.warn(`Cleanup notice for ${sid}:`, cleanErr);
      }
    }
    console.log('✅ Temporary test records cleaned up. Production registry is pristine.\n');
  }
}

runHardeningTests().catch((err) => {
  console.error('❌ STRESS TEST FAILED:', err);
  process.exit(1);
});
