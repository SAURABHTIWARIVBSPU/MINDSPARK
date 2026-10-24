import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, resetDbInstance } from '@/lib/db';
import { Student } from '@/types';

describe('WhatsApp Bulk Messaging & Status Management Integration', () => {
  let db: any;
  const testStudentId1 = `std_wa_test_${Date.now()}_1`;
  const testStudentId2 = `std_wa_test_${Date.now()}_2`;

  beforeAll(async () => {
    resetDbInstance();
    db = getDb();

    const rand = Math.floor(Math.random() * 899 + 100);
    // Create 2 test students
    await db.createStudent({
      registrationNumber: `WA${Date.now().toString().slice(-3)}${rand}01`,
      name: 'TEST CANDIDATE ONE',
      fatherName: 'FATHER ONE',
      dateOfBirth: '2008-01-01',
      phone: '9876543210',
      schoolOrCollege: 'TEST ACADEMY',
      className: '10',
      competitionName: 'MATH TEST',
      status: 'ACTIVE',
      createdBy: 'test_admin',
      updatedBy: 'test_admin',
    });

    await db.createStudent({
      registrationNumber: `WA${Date.now().toString().slice(-3)}${rand}02`,
      name: 'TEST CANDIDATE TWO',
      fatherName: 'FATHER TWO',
      dateOfBirth: '2008-02-02',
      phone: '9876543211',
      schoolOrCollege: 'TEST ACADEMY',
      className: '10',
      competitionName: 'MATH TEST',
      status: 'ACTIVE',
      createdBy: 'test_admin',
      updatedBy: 'test_admin',
    });
  });

  it('updates student WhatsApp status individually', async () => {
    const students = await db.getAllActiveStudents();
    const candidate = students[0];
    expect(candidate).toBeDefined();

    const updated = await db.updateStudent(candidate.studentId, {
      whatsappStatus: 'OPENED',
      whatsappSentAt: new Date().toISOString(),
    });

    expect(updated.whatsappStatus).toBe('OPENED');
    expect(updated.whatsappSentAt).toBeDefined();

    const fresh = await db.getStudentById(candidate.studentId);
    expect(fresh?.whatsappStatus).toBe('OPENED');
  });

  it('batch updates WhatsApp status for multiple candidates', async () => {
    const allActive = await db.getAllActiveStudents();
    const notSent = allActive.filter((s: Student) => !s.whatsappStatus || s.whatsappStatus === 'NOT_SENT');
    const ids = notSent.slice(0, 2).map((s: Student) => s.studentId);

    const updatedCount = await db.batchUpdateStudentWhatsAppStatus(ids, 'SENT');
    expect(updatedCount).toBe(2);

    for (const id of ids) {
      const student = await db.getStudentById(id);
      expect(student?.whatsappStatus).toBe('SENT');
      expect(student?.whatsappSentAt).toBeDefined();
    }
  });

  it('resets WhatsApp status back to NOT_SENT', async () => {
    const allActive = await db.getAllActiveStudents();
    const ids = allActive.slice(0, 2).map((s: Student) => s.studentId);

    const updatedCount = await db.batchUpdateStudentWhatsAppStatus(ids, 'NOT_SENT');
    expect(updatedCount).toBe(2);

    for (const id of ids) {
      const student = await db.getStudentById(id);
      expect(student?.whatsappStatus).toBe('NOT_SENT');
    }
  });

  it('filters students by whatsappStatus in getStudents query', async () => {
    const allActive = await db.getAllActiveStudents();
    const firstId = allActive[0].studentId;
    await db.updateStudent(firstId, { whatsappStatus: 'SENT' });

    const sentResult = await db.getStudents({
      whatsappStatus: 'SENT',
      status: 'ACTIVE',
    });

    expect(sentResult.students.some((s: Student) => s.studentId === firstId)).toBe(true);

    const unsentResult = await db.getStudents({
      whatsappStatus: 'NOT_SENT',
      status: 'ACTIVE',
    });

    expect(unsentResult.students.some((s: Student) => s.studentId === firstId)).toBe(false);
  });
});
