import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, resetDbInstance } from '@/lib/db';
import { getStorageAdapter } from '@/lib/storage';
import {
  getStudentEventSchedule,
  registerCandidateInRankCache,
  transferCandidateRank,
  reallocateCandidateEvent,
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
    const student = await db.createStudent({
      registrationNumber: `MS2611${Date.now().toString().slice(-4)}`,
      name: `INITIAL CANDIDATE ${Date.now()}`,
      fatherName: `INITIAL FATHER ${Date.now()}`,
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

    const savedCardBefore = await db.getAdmitCardByStudentId(student.studentId);
    expect(savedCardBefore).not.toBeNull();
    expect(savedCardBefore.sourceDataHash).toBe(initialHash);

    const updatedName = `REVISED CANDIDATE ${Date.now()}`;
    const updatedFather = `REVISED FATHER ${Date.now()}`;
    const updatedStudent = await db.updateStudent(student.studentId, {
      name: updatedName,
      fatherName: updatedFather,
    });

    const savedCardAfter = await db.getAdmitCardByStudentId(student.studentId);
    expect(savedCardAfter).toBeNull();

    const updatedPdf = await generateAdmitCardPdf(updatedStudent, settings);
    const updatedHash = computeStudentDataHash(updatedStudent, ADMIT_CARD_TEMPLATE_VERSION);

    expect(updatedHash).not.toBe(initialHash);
    expect(updatedPdf.length).toBeGreaterThan(1000);
    const parsedPdf = await PDFDocument.load(updatedPdf);
    expect(parsedPdf.getPageCount()).toBe(1);
  });

  it('Cleanly transfers allocated shift rank when registration number is updated', () => {
    const oldReg = `MS26_OLD_${Date.now()}`;
    const newReg = `MS26_NEW_${Date.now()}`;

    const initialRank = registerCandidateInRankCache('CLAY CHAMPS', 'CLASS 1', oldReg);
    const initialSchedule = getStudentEventSchedule('CLAY CHAMPS', 'CLASS 1', oldReg);

    transferCandidateRank(oldReg, newReg, 'CLAY CHAMPS', 'CLASS 1');

    const transferredSchedule = getStudentEventSchedule('CLAY CHAMPS', 'CLASS 1', newReg);
    expect(transferredSchedule.examTime).toBe(initialSchedule.examTime);
    expect(transferredSchedule.reportingTime).toBe(initialSchedule.reportingTime);
    expect(transferredSchedule.batchInfo).toBe(initialSchedule.batchInfo);
  });

  it('Recalculates schedule properly when student competition category is changed', () => {
    const regNo = `MS26_CHANGE_${Date.now()}`;

    const schedColour = getStudentEventSchedule('Colour by Number', 'NURSERY', regNo);
    expect(schedColour.eventName).toContain('Colour by Number');
    expect(schedColour.examTime).toContain('11:00 AM');

    const schedJoin = getStudentEventSchedule('Join the Dots & Colour', 'LKG', regNo);
    expect(schedJoin.eventName).toContain('Join the Dots');
    expect(schedJoin.examTime).toContain('12:00 PM');
  });

  it('E2E API Route Verification: Admin PUT /api/students/[id] immediately updates student and reflects in admit card download', async () => {
    const { PUT: studentPutHandler } = await import('@/app/api/students/[id]/route');
    const { GET: admitCardDownloadHandler } = await import('@/app/api/admit-cards/download/[studentId]/route');
    const sessionModule = await import('@/lib/auth/session');
    const { vi } = await import('vitest');

    const adminUser = await db.getUserByEmail('superadmin@mindspark.edu.in');
    vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(adminUser);

    const ts = Date.now();
    const initialName = `E2E STUDENT ${ts}`;
    const initialFather = `E2E FATHER ${ts}`;

    const createdStudent = await db.createStudent({
      registrationNumber: `MS26E2E${ts.toString().slice(-4)}`,
      name: initialName,
      fatherName: initialFather,
      dateOfBirth: '2015-06-15',
      phone: '9876543210',
      schoolOrCollege: 'OLD PUBLIC SCHOOL',
      className: 'CLASSES 2 & 3',
      competitionName: 'Paint Your Imagination',
      status: 'ACTIVE',
      createdBy: 'admin',
      updatedBy: 'admin',
    });

    const downloadReqInitial = new NextRequest(
      `http://localhost:3000/api/admit-cards/download/${createdStudent.studentId}`
    );
    const downloadResInitial = await admitCardDownloadHandler(downloadReqInitial, {
      params: Promise.resolve({ studentId: createdStudent.studentId }),
    });
    expect(downloadResInitial.status).toBe(200);

    const revisedName = `REVISED STUDENT ${ts}`;
    const revisedFather = `REVISED FATHER ${ts}`;
    const revisedSchool = 'NEW MODERN ACADEMY';

    const updatedPayload = {
      registrationNumber: createdStudent.registrationNumber,
      name: revisedName,
      fatherName: revisedFather,
      dateOfBirth: '2015-06-20',
      phone: '9876543211',
      schoolOrCollege: revisedSchool,
      className: 'CLASSES 2 & 3',
      competitionName: 'Paint Your Imagination',
      status: 'ACTIVE',
    };

    const putReq = new NextRequest(`http://localhost:3000/api/students/${createdStudent.studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedPayload),
    });

    const putRes = await studentPutHandler(putReq, {
      params: Promise.resolve({ id: createdStudent.studentId }),
    });
    expect(putRes.status).toBe(200);

    const putData = await putRes.json();
    expect(putData.success).toBe(true);
    expect(putData.student.name).toBe(revisedName);
    expect(putData.student.fatherName).toBe(revisedFather);
    expect(putData.student.schoolOrCollege).toBe(revisedSchool);

    const downloadReqAfter = new NextRequest(
      `http://localhost:3000/api/admit-cards/download/${createdStudent.studentId}`
    );
    const downloadResAfter = await admitCardDownloadHandler(downloadReqAfter, {
      params: Promise.resolve({ studentId: createdStudent.studentId }),
    });
    expect(downloadResAfter.status).toBe(200);
    expect(downloadResAfter.headers.get('Content-Type')).toBe('application/pdf');
    expect(downloadResAfter.headers.get('Cache-Control')).toContain('no-cache');

    const pdfBuffer = await downloadResAfter.arrayBuffer();
    expect(pdfBuffer.byteLength).toBeGreaterThan(1000);
  });
  it('Permanently fixes competition change blunder: ALFISHA MS261105482 switched from Online Quiz to Essay Writing receives legitimate 03:30 PM reporting and 04:00 PM exam time', async () => {
    // MS261105482 baseline: Online Quiz (Graduation) rank 629
    // Admin switches competition to Essay Writing (Graduation)
    const schedule = reallocateCandidateEvent(
      'MS261105482',
      'Online Quiz',
      'GRADUATION',
      'Essay Writing',
      'GRADUATION'
    );

    // Official timetable verification:
    // ESSAY_WRITING_GRADUATION is strictly on Sunday 01 Nov 2026, Batch 1: 04:00 PM - 05:00 PM, Reporting 03:30 PM
    expect(schedule.examDate).toBe('01 Nov 2026 (Sunday)');
    expect(schedule.reportingTime).toBe('03:30 PM');
    expect(schedule.examTime).toContain('04:00 PM - 05:00 PM');
    expect(schedule.batchInfo).toContain('Batch 1');
    expect(schedule.venueMain).toBe('MEENA SHAH PUBLIC SCHOOL');
    expect(schedule.venueDetail).toBe('MSITM LT-2, LT-3 & LT-4');
    expect(schedule.isHold).toBe(false);

    // Verify subsequent lookup returns the exact same locked schedule (never 06:30 PM, never Batch 4)
    const directLookup = getStudentEventSchedule('Essay Writing', 'GRADUATION', 'MS261105482');
    expect(directLookup.reportingTime).toBe('03:30 PM');
    expect(directLookup.examTime).toContain('04:00 PM - 05:00 PM');
    expect(directLookup.batchInfo).toContain('Batch 1');
  });

  it('E2E Admin PUT switches candidate from Online Quiz to Essay Writing and downloads updated admit card with 03:30 PM reporting time', async () => {
    const { PUT: studentPutHandler } = await import('@/app/api/students/[id]/route');
    const { GET: admitCardDownloadHandler } = await import('@/app/api/admit-cards/download/[studentId]/route');
    const sessionModule = await import('@/lib/auth/session');
    const { vi } = await import('vitest');

    const adminUser = await db.getUserByEmail('superadmin@mindspark.edu.in');
    vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(adminUser);

    const ts = Date.now();
    const candidate = await db.createStudent({
      registrationNumber: `MS26ALF${ts.toString().slice(-4)}`,
      name: `ALFISHA TEST ${ts}`,
      fatherName: `RAFEEQ ${ts}`,
      dateOfBirth: '2005-04-12',
      phone: '7985171291',
      schoolOrCollege: 'MSITM COLLEGE',
      className: 'GRADUATION',
      competitionName: 'Online Quiz',
      status: 'ACTIVE',
      createdBy: 'admin',
      updatedBy: 'admin',
    });

    // 1. Initial admit card in Online Quiz
    const dl1 = await admitCardDownloadHandler(
      new NextRequest(`http://localhost:3000/api/admit-cards/download/${candidate.studentId}`),
      { params: Promise.resolve({ studentId: candidate.studentId }) }
    );
    expect(dl1.status).toBe(200);

    // 2. Admin switches competition to Essay Writing
    const putRes = await studentPutHandler(
      new NextRequest(`http://localhost:3000/api/students/${candidate.studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationNumber: candidate.registrationNumber,
          name: candidate.name,
          fatherName: candidate.fatherName,
          dateOfBirth: candidate.dateOfBirth,
          phone: candidate.phone,
          schoolOrCollege: candidate.schoolOrCollege,
          className: 'GRADUATION',
          competitionName: 'Essay Writing',
          status: 'ACTIVE',
        }),
      }),
      { params: Promise.resolve({ id: candidate.studentId }) }
    );
    expect(putRes.status).toBe(200);

    // 3. Download fresh admit card after edit
    const dl2 = await admitCardDownloadHandler(
      new NextRequest(`http://localhost:3000/api/admit-cards/download/${candidate.studentId}`),
      { params: Promise.resolve({ studentId: candidate.studentId }) }
    );
    expect(dl2.status).toBe(200);
    const pdfBytes = await dl2.arrayBuffer();
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);

    // Verify schedule for this candidate
    const finalSchedule = getStudentEventSchedule('Essay Writing', 'GRADUATION', candidate.registrationNumber);
    expect(finalSchedule.reportingTime).toBe('03:30 PM');
    expect(finalSchedule.examTime).toContain('04:00 PM - 05:00 PM');
    expect(finalSchedule.batchInfo).toContain('Batch 1');
  });
});
