import { describe, it, expect, beforeEach } from 'vitest';
import { LocalJsonDbAdapter } from '@/lib/db/local.adapter';
import path from 'path';
import fs from 'fs';

const testDbPath = path.join(process.cwd(), '.data', 'test_reg_db.json');

describe('Registration Number Engine', () => {
  let db: LocalJsonDbAdapter;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new LocalJsonDbAdapter(testDbPath);
  });

  it('allocates sequential collision-safe registration numbers', async () => {
    const reg1 = await db.allocateNextRegistrationNumber('MS', '26');
    expect(reg1).toBe('MS261001');

    const reg2 = await db.allocateNextRegistrationNumber('MS', '26');
    expect(reg2).toBe('MS261002');

    const reg3 = await db.allocateNextRegistrationNumber('MS', '26');
    expect(reg3).toBe('MS261003');
  });

  it('preserves existing registration number when provided', async () => {
    const student = await db.createStudent({
      registrationNumber: 'MS211099',
      name: 'TEST STUDENT',
      fatherName: 'TEST FATHER',
      dateOfBirth: '2008-01-01',
      phone: '9999999999',
      schoolOrCollege: 'TEST SCHOOL',
      className: '10',
      competitionName: 'QUIZ',
      status: 'ACTIVE',
      createdBy: 'tester',
      updatedBy: 'tester',
    });

    expect(student.registrationNumber).toBe('MS211099');
  });

  it('prevents collision if duplicate registration number is inserted', async () => {
    await db.createStudent({
      registrationNumber: 'MS211088',
      name: 'STUDENT A',
      fatherName: 'FATHER A',
      dateOfBirth: '2008-01-01',
      phone: '9999999991',
      schoolOrCollege: 'TEST SCHOOL',
      className: '10',
      competitionName: 'QUIZ',
      status: 'ACTIVE',
      createdBy: 'tester',
      updatedBy: 'tester',
    });

    await expect(
      db.createStudent({
        registrationNumber: 'MS211088',
        name: 'STUDENT B',
        fatherName: 'FATHER B',
        dateOfBirth: '2008-01-01',
        phone: '9999999992',
        schoolOrCollege: 'TEST SCHOOL',
        className: '10',
        competitionName: 'QUIZ',
        status: 'ACTIVE',
        createdBy: 'tester',
        updatedBy: 'tester',
      })
    ).rejects.toThrow(/already exists/);
  });
});
