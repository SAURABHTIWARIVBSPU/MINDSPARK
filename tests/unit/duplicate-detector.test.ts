import { describe, it, expect } from 'vitest';
import { DuplicateDetector } from '@/lib/excel/duplicate-detector';
import { Student } from '@/types';

const mockExistingStudents: Student[] = [
  {
    studentId: 'std_1',
    registrationNumber: 'MS211001',
    name: 'MEENAKSHI GUPTA',
    fatherName: 'RAKESH KUMAR GUPTA',
    dateOfBirth: '2008-05-31',
    phone: '7007440076',
    schoolOrCollege: 'AIMS INTERNATIONAL',
    className: '12',
    competitionName: 'ONLINE QUIZ',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    createdBy: 'test',
    updatedAt: new Date().toISOString(),
    updatedBy: 'test',
    dataVersion: 1,
  },
];

describe('DuplicateDetector Engine', () => {
  it('flags exact existing registration number as conflict', () => {
    const detector = new DuplicateDetector(mockExistingStudents);
    const result = detector.evaluate({
      rowNumber: 2,
      registrationNumber: 'MS211001',
      name: 'OTHER STUDENT',
      fatherName: 'OTHER FATHER',
      phone: '9888888888',
    });

    expect(result.hasConflict).toBe(true);
    expect(result.conflictType).toBe('EXACT_REG_NO');
  });

  it('flags candidate duplicate matching name and father name', () => {
    const detector = new DuplicateDetector(mockExistingStudents);
    const result = detector.evaluate({
      rowNumber: 3,
      name: 'MEENAKSHI GUPTA',
      fatherName: 'RAKESH KUMAR GUPTA',
      phone: '9888888888',
    });

    expect(result.hasConflict).toBe(true);
    expect(result.conflictType).toBe('CANDIDATE_PERSON');
  });

  it('flags candidate duplicate matching contact phone', () => {
    const detector = new DuplicateDetector(mockExistingStudents);
    const result = detector.evaluate({
      rowNumber: 4,
      name: 'SOMEONE ELSE',
      fatherName: 'SOMEONE ELSE',
      phone: '7007440076',
    });

    expect(result.hasConflict).toBe(true);
    expect(result.conflictType).toBe('CANDIDATE_PERSON');
  });

  it('flags intra-file duplicates', () => {
    const detector = new DuplicateDetector([]);
    const row1 = detector.evaluate({
      rowNumber: 2,
      name: 'NEW STUDENT',
      fatherName: 'NEW FATHER',
      phone: '9111111111',
    });
    expect(row1.hasConflict).toBe(false);

    const row2 = detector.evaluate({
      rowNumber: 3,
      name: 'NEW STUDENT',
      fatherName: 'NEW FATHER',
      phone: '9222222222',
    });
    expect(row2.hasConflict).toBe(true);
    expect(row2.conflictType).toBe('INTRA_FILE_DUPLICATE');
  });
});
