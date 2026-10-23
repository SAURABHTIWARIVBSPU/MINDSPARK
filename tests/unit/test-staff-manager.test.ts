import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getTestStaffList,
  addTestStaffRecipient,
  initTestStaffRegistry,
} from '@/lib/excel/test-staff-manager';

describe('Test Teachers and Staff Registry Deduplication Tests', () => {
  const REGISTRY_PATH = path.join(process.cwd(), 'Test_Teachers_And_Staff_Registry.xlsx');

  beforeEach(() => {
    initTestStaffRegistry();
  });

  it('initializes Test_Teachers_And_Staff_Registry.xlsx if missing', () => {
    expect(fs.existsSync(REGISTRY_PATH)).toBe(true);
  });

  it('reads pre-seeded test staff recipients with valid 10-digit phones', async () => {
    const list = await getTestStaffList();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.some((s) => s.phone === '8948905711')).toBe(true);
    expect(list.some((s) => s.phone === '9795600217')).toBe(true);
  });

  it('strictly rejects duplicate phone numbers when adding a teacher', async () => {
    // Attempt to add a teacher with an already registered phone (8948905711)
    const result = await addTestStaffRecipient({
      name: 'DUPLICATE TEACHER',
      phone: '+91 8948905711', // Formatted differently but same number
      designation: 'MATHEMATICS HEAD',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('DUPLICATE REJECTED');
  });

  it('strictly rejects invalid phone numbers (non-10 digits)', async () => {
    const result = await addTestStaffRecipient({
      name: 'INVALID PHONE TEACHER',
      phone: '12345',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid phone number');
  });
});
