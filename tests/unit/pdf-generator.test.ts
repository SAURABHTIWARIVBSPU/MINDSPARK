import { describe, it, expect } from 'vitest';
import { generateAdmitCardPdf, computeStudentDataHash } from '@/lib/pdf/template';
import { Student, SystemSettings } from '@/types';

const mockStudent: Student = {
  studentId: 'std_test_1',
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
};

const mockSettings: SystemSettings = {
  schoolName: 'Mind-Spark Inter-School Competition',
  competitionTitle: 'Annual Mind-Spark Academic Olympiad 2026',
  venue: 'MSITM DEGREE COLLEGE GONDA UTTAR PRADESH',
  examDate: '01 Nov 2026',
  reportingTime: '09:00 AM',
  contactPhone: '9876543210',
  contactEmail: 'admissions@mindspark.edu.in',
  regNoPrefix: 'MS',
  regNoYear: '26',
  regNoSeqCurrent: 1000,
};

describe('Admit Card PDF Generator', () => {
  it('generates valid non-empty PDF binary bytes', async () => {
    const pdfBytes = await generateAdmitCardPdf(mockStudent, mockSettings);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Verify PDF header %PDF-
    const headerStr = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(headerStr).toBe('%PDF-');
  });

  it('computes deterministic SHA-256 data hash for caching', () => {
    const hash1 = computeStudentDataHash(mockStudent);
    const hash2 = computeStudentDataHash(mockStudent);
    expect(hash1).toBe(hash2);

    const modifiedStudent = { ...mockStudent, name: 'CHANGED NAME' };
    const hash3 = computeStudentDataHash(modifiedStudent);
    expect(hash1).not.toBe(hash3);
  });
});
