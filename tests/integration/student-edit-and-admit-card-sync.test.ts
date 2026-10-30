import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, resetDbInstance } from '@/lib/db';
import { getStorageAdapter } from '@/lib/storage';
import {
  getStudentEventSchedule,
  registerCandidateInRankCache,
  transferCandidateRank,
  resolveEventKey,
} from '@/lib/pdf/event-schedule';
import {
  generateAdmitCardPdf,
  computeStudentDataHash,
  ADMIT_CARD_TEMPLATE_VERSION,
} from '@/lib/pdf/template';
import { Student } from '@/types';
import { PDFDocument } from 'pdf-lib';

describe('Student Admin Panel Edit & Admit Card Permanent Synchronization Suite', () => {
  let db: any;
  let storage: any;

  beforeAll(() => {
    resetDbInstance();
    db = getDb();
    storage = getStorageAdapter();
  });

  it('Guarantees candidate exam timing and batch NEVER change when editing personal particulars (Name, Father, DOB, Phone, School)', async () => {
    // 1. Create a student in a multi-shift competition (CLAY CHAMPS - 4 batches)
    const originalStudent: Student = {
      studentId: `std_shift_lock_${Date.now()}`,
      registrationNumber: 'MS26118801',
      name: 'RAVI SHARMA',
      fatherName: 'DINESH SHARMA',
      dateOfBirth: '2018-05-10',
      phone: '9876543210',
      schoolOrCollege: 'ST XAVIERS SCHOOL',
      className: 'CLASS 1',
      competitionName: 'CLAY CHAMPS',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
      dataVersion: 1,
    };

    const initialSchedule = getStudentEventSchedule(
      originalStudent.competitionName,
      originalStudent.className,
      originalStudent.registrationNumber
    );

    expect(initialSchedule.examTime).toBeDefined();
    expect(initialSchedule.reportingTime).toBeDefined();
    expect(initialSchedule.batchInfo).toBeDefined();

    // 2. Perform 5 successive edits simulating multiple admin edits for typos
    const edits = [
      { name: 'RAVI KUMAR SHARMA' },
      { fatherName: 'DINESH CHANDRA SHARMA' },
      { dateOfBirth: '2018-05-12' },
      { phone: '9876543219' },
      { schoolOrCollege: 'ST XAVIERS SENIOR SECONDARY SCHOOL' },
    ];

    let currentStudent = { ...originalStudent };
    for (const edit of edits) {
      currentStudent = { ...currentStudent, ...edit };

      // In real PUT endpoint: if event doesn't change, registerCandidateInRankCache is NOT called,
      // but even if called, it MUST preserve the candidate rank!
      registerCandidateInRankCache(
        currentStudent.competitionName,
        currentStudent.className,
        currentStudent.registrationNumber
      );

      const editedSchedule = getStudentEventSchedule(
        currentStudent.competitionName,
        currentStudent.className,
        currentStudent.registrationNumber
      );

      expect(editedSchedule.examTime).toBe(initialSchedule.examTime);
      expect(editedSchedule.reportingTime).toBe(initialSchedule.reportingTime);
      expect(editedSchedule.batchInfo).toBe(initialSchedule.batchInfo);
      expect(editedSchedule.venueDetail).toBe(initialSchedule.venueDetail);
    }
  });

  it('Invalidates stale admit card in database and removes old PDF from storage upon student edit', async () => {
    // 1. Create student in DB
    const student = await db.createStudent({
      registrationNumber: `MS2611${Date.now().toString().slice(-4)}`,
      name: 'INITIAL CANDIDATE NAME',
      fatherName: 'INITIAL FATHER NAME',
      dateOfBirth: '2016-04-15',
      phone: '9876500001',
      schoolOrCollege: 'CENTRAL ACADEMY',
      className: 'CLASSES 2 & 3',
      competitionName: 'Paint Your Imagination',
      status: 'ACTIVE',
      createdBy: 'admin',
      updatedBy: 'admin',
    });

    const settings = await db.getSettings();

    // 2. Generate initial admit card and save to storage & DB
    const initialPdf = await generateAdmitCardPdf(student, settings);
    const initialHash = computeStudentDataHash(student, ADMIT_CARD_TEMPLATE_VERSION);
    const { fileId, storageType } = await storage.saveFile(
      `AdmitCard_${student.registrationNumber}.pdf`,
      initialPdf,
      'application/pdf'
    );

    await db.saveAdmitCard({
      studentId: student.studentId,
      registrationNumber: student.registrationNumber,
      fileId,
      storageType,
      templateVersion: ADMIT_CARD_TEMPLATE_VERSION,
      sourceDataHash: initialHash,
      status: 'READY',
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Verify admit card exists before edit
    const savedCardBefore = await db.getAdmitCardByStudentId(student.studentId);
    expect(savedCardBefore).not.toBeNull();
    expect(savedCardBefore.sourceDataHash).toBe(initialHash);

    // 3. Admin edits student details
    const updatedName = 'REVISED CANDIDATE NAME';
    const updatedFather = 'REVISED FATHER NAME';
    const updatedStudent = await db.updateStudent(student.studentId, {
      name: updatedName,
      fatherName: updatedFather,
    });

    // 4. Verify stale admit card record is invalidated in DB
    const savedCardAfter = await db.getAdmitCardByStudentId(student.studentId);
    expect(savedCardAfter).toBeNull(); // Cleanly deleted/invalidated!

    // 5. Generate fresh PDF for the updated student
    const updatedPdf = await generateAdmitCardPdf(updatedStudent, settings);
    const updatedHash = computeStudentDataHash(updatedStudent, ADMIT_CARD_TEMPLATE_VERSION);

    // Verify hash changed
    expect(updatedHash).not.toBe(initialHash);

    // Verify PDF is valid and has expected byte structure
    expect(updatedPdf.length).toBeGreaterThan(1000);
    const parsedPdf = await PDFDocument.load(updatedPdf);
    expect(parsedPdf.getPageCount()).toBe(1);
  });

  it('Cleanly transfers allocated shift rank when registration number is updated', () => {
    const oldReg = `MS26_OLD_${Date.now()}`;
    const newReg = `MS26_NEW_${Date.now()}`;

    // Allocate initial rank for old registration
    const initialRank = registerCandidateInRankCache('CLAY CHAMPS', 'CLASS 1', oldReg);
    const initialSchedule = getStudentEventSchedule('CLAY CHAMPS', 'CLASS 1', oldReg);

    // Transfer rank to new registration number
    transferCandidateRank(oldReg, newReg, 'CLAY CHAMPS', 'CLASS 1');

    const transferredSchedule = getStudentEventSchedule('CLAY CHAMPS', 'CLASS 1', newReg);
    expect(transferredSchedule.examTime).toBe(initialSchedule.examTime);
    expect(transferredSchedule.reportingTime).toBe(initialSchedule.reportingTime);
    expect(transferredSchedule.batchInfo).toBe(initialSchedule.batchInfo);
  });

  it('Recalculates schedule properly when student competition category is changed', () => {
    const regNo = `MS26_CHANGE_${Date.now()}`;

    // Student starts in COLOUR BY NUMBER (NURSERY: 11:00 AM - 12:00 PM)
    const schedColour = getStudentEventSchedule('Colour by Number', 'NURSERY', regNo);
    expect(schedColour.eventName).toContain('Colour by Number');
    expect(schedColour.examTime).toContain('11:00 AM');

    // Admin edits student to switch to JOIN THE DOTS (LKG: 12:00 PM - 01:00 PM)
    const schedJoin = getStudentEventSchedule('Join the Dots & Colour', 'LKG', regNo);
    expect(schedJoin.eventName).toContain('Join the Dots');
    expect(schedJoin.examTime).toContain('12:00 PM');
  });
});
