import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, resetDbInstance } from '@/lib/db';

describe('Official Candidates Dataset (1,134 Records)', () => {
  beforeEach(() => {
    resetDbInstance();
  });

  it('contains at least 1,134 active, deduplicated students', async () => {
    const db = getDb();
    const students = await db.getAllActiveStudents();
    expect(students.length).toBeGreaterThanOrEqual(1134);
  });

  it('guarantees 100% collision-free unique registration numbers', async () => {
    const db = getDb();
    const students = await db.getAllActiveStudents();
    const regSet = new Set<string>();

    for (const s of students) {
      expect(s.registrationNumber).toBeTruthy();
      expect(regSet.has(s.registrationNumber)).toBe(false);
      regSet.add(s.registrationNumber);
    }

    expect(regSet.size).toBeGreaterThanOrEqual(1134);
  });

  it('successfully locates candidates across all class tiers (Playgroup to Graduation)', async () => {
    const db = getDb();

    // 1. Playgroup candidate
    const playgroup = await db.getStudentByRegNo('MS261100037');
    expect(playgroup).not.toBeNull();
    expect(playgroup?.className).toBe('PLAY GROUP');
    expect(playgroup?.competitionName).toBe('UNIQUE AND CREATIVE HANDMADE FANCY DRESS');

    // 2. Class 10 candidate
    const class10 = await db.getStudentByRegNo('MS261100196');
    expect(class10).not.toBeNull();
    expect(class10?.name).toBe('RUBEENA');
    expect(class10?.competitionName).toBe('ONLINE QUIZ');

    // 3. Graduation candidate
    const grad = await db.getStudentByRegNo('MS261100145');
    expect(grad).not.toBeNull();
    expect(grad?.className).toBe('GRADUATION');
    expect(grad?.competitionName).toBe('ONLINE QUIZ');
  });

  it('allocates the next non-clashing sequence for future candidate imports', async () => {
    const db = getDb();
    const nextRegNo = await db.allocateNextRegistrationNumber();

    expect(nextRegNo).toMatch(/^MS2611\d{5}$/);
    // Must be greater than 1140 (the max in Candidate_data.xlsx)
    const seq = parseInt(nextRegNo.replace('MS2611', ''), 10);
    expect(seq).toBeGreaterThan(1140);

    // Verify it doesn't clash with any existing student
    const existing = await db.getStudentByRegNo(nextRegNo);
    expect(existing).toBeNull();
  });
});
