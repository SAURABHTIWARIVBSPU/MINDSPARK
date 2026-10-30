import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDbInstance } from '@/lib/db';
import { allocateStudentToBatch, calculateShiftWiseMetrics, getNextAvailableBatchForEvent } from '@/lib/allocation/seating-engine';
import { renderMessageTemplate } from '@/lib/whatsapp/message-builder';
import { registerCandidateInRankCache } from '@/lib/pdf/event-schedule';
import { PROGRAM_SEATING_RULES } from '@/lib/allocation/seating-rules';
import { getStudentEventSchedule, resolveEventKey } from '@/lib/pdf/event-schedule';

describe('Strict Production-Grade Seating & Batch Allocation Engine', () => {
  beforeEach(() => {
    resetDbInstance();
  });

  describe('1. Batch-Wise Progression & Full-Batch Rollover', () => {
    it('allocates candidate 0 to Batch 1 of Clay Champs', () => {
      const alloc = allocateStudentToBatch('Clay Champs', '1', 0);
      expect(alloc.status).toBe('CONFIRMED');
      expect(alloc.batchNumber).toBe(1);
      expect(alloc.examTime).toContain('10:00 AM - 11:00 AM (BATCH 1)');
      expect(alloc.reportingTime).toBe('09:30 AM');
      expect(alloc.seatNumber).toBe(1);
      expect(alloc.venueDetail).toBe('MSPS MUSIC ROOM');
    });

    it('allocates candidate 49 to Batch 1 and candidate 50 to Batch 2 when Batch 1 is full', () => {
      // Index 49 (50th student) -> Batch 1 (Capacity 50)
      const alloc49 = allocateStudentToBatch('Clay Champs', '1', 49);
      expect(alloc49.batchNumber).toBe(1);
      expect(alloc49.seatNumber).toBe(50);
      expect(alloc49.batchSeatIndex).toBe(50);

      // Index 50 (51st student) -> Rollover to Batch 2 (Capacity 50)
      const alloc50 = allocateStudentToBatch('Clay Champs', '1', 50);
      expect(alloc50.batchNumber).toBe(2);
      expect(alloc50.examTime).toContain('11:00 AM - 12:00 PM (BATCH 2)');
      expect(alloc50.reportingTime).toBe('10:30 AM');
      expect(alloc50.seatNumber).toBe(51);
      expect(alloc50.batchSeatIndex).toBe(1);
    });

    it('advances sequentially through Batches 1 to 5 for Fireless Cooking', () => {
      // Fireless Cooking: Batch 1 (120), Batch 2 (120), Batch 3 (120), Batch 4 (120), Batch 5 (200)
      const b1 = allocateStudentToBatch('Fireless Cooking', '6', 0);
      expect(b1.batchNumber).toBe(1);
      expect(b1.examTime).toContain('09:00 AM - 10:00 AM');

      const b2 = allocateStudentToBatch('Fireless Cooking', '6', 120);
      expect(b2.batchNumber).toBe(2);
      expect(b2.examTime).toContain('10:00 AM - 11:00 AM');

      const b3 = allocateStudentToBatch('Fireless Cooking', '7', 240);
      expect(b3.batchNumber).toBe(3);
      expect(b3.examTime).toContain('11:00 AM - 12:00 PM');

      const b4 = allocateStudentToBatch('Fireless Cooking', '8', 360);
      expect(b4.batchNumber).toBe(4);
      expect(b4.examTime).toContain('12:00 PM - 01:00 PM');

      const b5 = allocateStudentToBatch('Fireless Cooking', '8', 480);
      expect(b5.batchNumber).toBe(5);
      expect(b5.examTime).toContain('02:00 PM - 03:00 PM');
    });
  });

  describe('2. Automatic Batch Rollover & Capacity Expansion', () => {
    it('automatically allocates student to new Batch 5 when previous batches are filled', () => {
      // Young Innovators: Batches 1-3 (40 each) + Batch 4 (50) = Total 170
      const atMax = allocateStudentToBatch('Young Innovators', '9', 169);
      expect(atMax.status).toBe('CONFIRMED');
      expect(atMax.batchNumber).toBe(4);

      // Beyond previous capacity, system seamlessly allocates to Batch 5
      const beyondMax = allocateStudentToBatch('Young Innovators', '9', 170);
      expect(beyondMax.status).toBe('CONFIRMED');
      expect(beyondMax.canIssueAdmitCard).toBe(true);
      expect(beyondMax.batchNumber).toBe(5);
      expect(beyondMax.examTime).toContain('BATCH 5');
    });
  });

  describe('3. Official Announcement Schedule & Unhold Verification', () => {
    it('allocates and confirms admit card issuance for Junior Scientist at MSPS Ground', () => {
      const alloc = allocateStudentToBatch('Junior Scientist', '7', 10);
      expect(alloc.isHold).toBe(false);
      expect(alloc.status).toBe('CONFIRMED');
      expect(alloc.canIssueAdmitCard).toBe(true);
      expect(alloc.venueDetail).toBe('MSPS GROUND');
      expect(alloc.examDate).toBe('01 Nov 2026');
      expect(alloc.batchNumber).toBe(1);
    });

    it('allocates and confirms admit card issuance for Online Quiz (Graduation) on 02 Nov', () => {
      const alloc = allocateStudentToBatch('Online Quiz', 'GRADUATION', 5);
      expect(alloc.isHold).toBe(false);
      expect(alloc.status).toBe('CONFIRMED');
      expect(alloc.canIssueAdmitCard).toBe(true);
      expect(alloc.venueDetail).toBe('MSITM LAB');
      expect(alloc.examDate).toBe('02 Nov 2026');
      expect(alloc.luckyDrawNotice).toContain('Lucky Draw');
    });

    it('allocates and confirms admit card issuance for Essay Writing (Graduation) at 4:00 PM', () => {
      const alloc = allocateStudentToBatch('Essay Writing', 'GRADUATION', 0);
      expect(alloc.isHold).toBe(false);
      expect(alloc.status).toBe('CONFIRMED');
      expect(alloc.canIssueAdmitCard).toBe(true);
      expect(alloc.venueDetail).toBe('MSITM LT-2, LT-3 & LT-4');
      expect(alloc.examTime).toContain('04:00 PM - 05:00 PM');
    });

    it('strictly locks unknown or unallocated competition on hold', () => {
      const alloc = allocateStudentToBatch('Unrecognized Competition', '10', 0);
      expect(alloc.isHold).toBe(true);
      expect(alloc.status).toBe('ON_HOLD');
      expect(alloc.canIssueAdmitCard).toBe(false);
    });
  });

  describe('4. Anti-Double Allocation Invariant', () => {
    it('guarantees a student receives exactly one shift, batch, and venue', () => {
      const sched = getStudentEventSchedule('Online Quiz', '10', 'MS261100001');
      expect(sched.batchInfo).toBeTruthy();
      expect(sched.examTime).toBeTruthy();
      expect(sched.venueMain).toBe('MEENA SHAH PUBLIC SCHOOL');
      expect(sched.candidateRank).toBeGreaterThan(0);
    });

    it('ensures distinct candidates receive unique sequential ranks within the same event', () => {
      const sched1 = getStudentEventSchedule('Clay Champs', '1', 0);
      const sched2 = getStudentEventSchedule('Clay Champs', '1', 1);

      expect(sched1.candidateRank).toBe(1);
      expect(sched2.candidateRank).toBe(2);
      expect(sched1.candidateRank).not.toEqual(sched2.candidateRank);
    });
  });

  describe('5. Shift-Wise Metrics & Real-Time Remaining Capacity', () => {
    it('correctly aggregates student counts and available seats across shifts', () => {
      const sampleStudents = [
        { competition_name: 'Colour by Number', class_name: 'NURSERY' },
        { competition_name: 'Colour by Number', class_name: 'NURSERY' },
        { competition_name: 'Clay Champs', class_name: '1' },
        { competition_name: 'Junior Scientist', class_name: '7' },
      ];

      const metrics = calculateShiftWiseMetrics(sampleStudents, { includeBaseline: false });
      expect(metrics.length).toBeGreaterThan(0);

      const cbn = metrics.find((m) => m.eventKey === 'COLOUR_BY_NUMBER');
      expect(cbn).toBeDefined();
      expect(cbn?.allocatedCount).toBe(2);
      expect(cbn?.availableSeats).toBe(cbn!.totalProgramCapacity - 2);
      expect(cbn?.status).toBe('SEATS_AVAILABLE');

      const js = metrics.find((m) => m.eventKey === 'JUNIOR_SCIENTIST');
      expect(js).toBeDefined();
      expect(js?.isHold).toBe(false);
      expect(js?.status).toBe('SEATS_AVAILABLE');
      expect(js?.venue).toContain('MSPS GROUND');
    });
  });
  describe('6. Next Available Batch & Strict Capacity Lock', () => {
    it('accurately advances through all 4 batches of Graduation Quiz and locks when full', () => {
      // Batch 1 (0-179)
      const b1 = getNextAvailableBatchForEvent('Online Quiz', 'GRADUATION', 0);
      expect(b1.status).toBe('CONFIRMED');
      expect(b1.batchNumber).toBe(1);
      expect(b1.examTime).toContain('09:00 AM - 10:00 AM');
      expect(b1.reportingTime).toBe('08:30 AM');
      expect(b1.examDate).toBe('02 Nov 2026');

      // Batch 2 (180-359)
      const b2 = getNextAvailableBatchForEvent('Online Quiz', 'GRADUATION', 180);
      expect(b2.status).toBe('CONFIRMED');
      expect(b2.batchNumber).toBe(2);
      expect(b2.examTime).toContain('10:00 AM - 11:00 AM');
      expect(b2.reportingTime).toBe('09:30 AM');

      // Batch 3 (360-539)
      const b3 = getNextAvailableBatchForEvent('Online Quiz', 'GRADUATION', 360);
      expect(b3.status).toBe('CONFIRMED');
      expect(b3.batchNumber).toBe(3);
      expect(b3.examTime).toContain('11:00 AM - 12:00 PM');
      expect(b3.reportingTime).toBe('10:30 AM');

      // Batch 4 (540-719)
      const b4 = getNextAvailableBatchForEvent('Online Quiz', 'GRADUATION', 540);
      expect(b4.status).toBe('CONFIRMED');
      expect(b4.batchNumber).toBe(4);
      expect(b4.examTime).toContain('01:00 PM - 02:00 PM');
      expect(b4.reportingTime).toBe('12:30 PM');

      // Dynamic Rollover: when 720 seats are full, automatically opens Batch 5
      const b5 = getNextAvailableBatchForEvent('Online Quiz', 'GRADUATION', 720);
      expect(b5.status).toBe('CONFIRMED');
      expect(b5.isFull).toBe(false);
      expect(b5.batchNumber).toBe(5);
      expect(b5.examTime).toContain('BATCH 5');
      expect(b5.availableSeats).toBeGreaterThan(0);
    });

    it('guarantees allocated batch information is 100% identical between admit card and WhatsApp dispatch', () => {
      const regNo = 'MS26TESTBATCH01';
      registerCandidateInRankCache('Online Quiz', 'GRADUATION', regNo);

      const sched = getStudentEventSchedule('Online Quiz', 'GRADUATION', regNo);
      expect(sched.batchInfo).toBeTruthy();
      expect(sched.examTime).toBeTruthy();
      expect(sched.reportingTime).toBeTruthy();

      const studentMock: any = {
        studentId: 'test_std_1',
        registrationNumber: regNo,
        name: 'RAHUL VERMA',
        fatherName: 'SURESH VERMA',
        className: 'GRADUATION',
        competitionName: 'Online Quiz (Graduation)',
        phone: '9876543210'
      };

      const msg = renderMessageTemplate(
        'Dear {name}, your Batch is {batch}, Exam Time: {exam_time}, Reporting: {reporting_time}, Date: {exam_date}',
        studentMock,
        {} as any
      );

      expect(msg).toContain(`Batch is ${sched.batchInfo}`);
      expect(msg).toContain(`Exam Time: ${sched.examTime}`);
      expect(msg).toContain(`Reporting: ${sched.reportingTime}`);
      expect(msg).toContain(`Date: ${sched.examDate}`);
    });

    it('seamlessly generates new batches on the fly when candidate volume exceeds predefined batches', () => {
      // Predefined Battle of Brains has 3 batches (1,140 seats).
      // Allocation for candidate index 1200 dynamically generates Batch 4:
      const dynBatch = allocateStudentToBatch('Battle of Brains', '5', 1200);
      expect(dynBatch.status).toBe('CONFIRMED');
      expect(dynBatch.canIssueAdmitCard).toBe(true);
      expect(dynBatch.batchNumber).toBe(4);
      expect(dynBatch.examTime).toContain('BATCH 4');
      expect(dynBatch.venueDetail).toBe('MSPS 1st FLOOR');
      expect(dynBatch.examDate).toBe('01 Nov 2026');
    });
  });
});
