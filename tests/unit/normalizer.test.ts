import { describe, it, expect } from 'vitest';
import {
  normalizeDate,
  normalizePhone,
  normalizeText,
  sanitizeForSpreadsheet,
  matchesDob,
} from '@/lib/excel/normalizer';

describe('Data Normalizer Utilities', () => {
  describe('matchesDob', () => {
    const stored = '2008-05-31';

    it('matches exact ISO date string (YYYY-MM-DD)', () => {
      expect(matchesDob(stored, '2008-05-31')).toBe(true);
    });

    it('matches Indian date format (DD-MM-YYYY and DD/MM/YYYY)', () => {
      expect(matchesDob(stored, '31-05-2008')).toBe(true);
      expect(matchesDob(stored, '31/05/2008')).toBe(true);
      expect(matchesDob(stored, '31.05.2008')).toBe(true);
    });

    it('matches birth year only (YYYY)', () => {
      expect(matchesDob(stored, '2008')).toBe(true);
      expect(matchesDob(stored, ' 2008 ')).toBe(true);
      expect(matchesDob(stored, '2009')).toBe(false);
      expect(matchesDob(stored, '2007')).toBe(false);
    });

    it('rejects non-matching dates', () => {
      expect(matchesDob(stored, '01-01-2008')).toBe(false);
      expect(matchesDob(stored, '30-05-2008')).toBe(false);
      expect(matchesDob(stored, 'invalid')).toBe(false);
      expect(matchesDob('', '2008')).toBe(false);
      expect(matchesDob(stored, '')).toBe(false);
    });
  });

  describe('normalizeDate', () => {
    it('correctly converts Excel serial numbers to YYYY-MM-DD', () => {
      // 39599 = 2008-05-31
      expect(normalizeDate(39599)).toBe('2008-05-31');
      expect(normalizeDate('39599')).toBe('2008-05-31');
      // 38498 = 2005-05-26
      expect(normalizeDate(38498)).toBe('2005-05-26');
    });

    it('correctly formats DD/MM/YYYY strings', () => {
      expect(normalizeDate('31/05/2008')).toBe('2008-05-31');
      expect(normalizeDate('01-10-2009')).toBe('2009-10-01');
    });

    it('preserves valid ISO YYYY-MM-DD strings', () => {
      expect(normalizeDate('2008-05-31')).toBe('2008-05-31');
    });

    it('handles empty or invalid inputs gracefully', () => {
      expect(normalizeDate('')).toBe('');
      expect(normalizeDate(null)).toBe('');
      expect(normalizeDate(undefined)).toBe('');
    });
  });

  describe('normalizePhone', () => {
    it('extracts clean 10-digit Indian phone numbers', () => {
      expect(normalizePhone('7007440076')).toBe('7007440076');
      expect(normalizePhone('+91 7007440076')).toBe('7007440076');
      expect(normalizePhone('07007440076')).toBe('7007440076');
      expect(normalizePhone('91-9236340035')).toBe('9236340035');
    });

    it('strips float decimal notation from Excel numbers', () => {
      expect(normalizePhone('7007440076.0')).toBe('7007440076');
      expect(normalizePhone(7007440076)).toBe('7007440076');
    });

    it('handles empty values', () => {
      expect(normalizePhone('')).toBe('');
      expect(normalizePhone(null)).toBe('');
    });
  });

  describe('normalizeText', () => {
    it('trims and collapses extraneous whitespace', () => {
      expect(normalizeText('  MEENAKSHI   GUPTA  ')).toBe('MEENAKSHI GUPTA');
      expect(normalizeText('AIMS  INTERNATIONAL ')).toBe('AIMS INTERNATIONAL');
    });
  });

  describe('sanitizeForSpreadsheet', () => {
    it('prepends single quote to formula trigger characters', () => {
      expect(sanitizeForSpreadsheet('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeForSpreadsheet('+12345')).toBe("'+12345");
      expect(sanitizeForSpreadsheet('-50')).toBe("'-50");
      expect(sanitizeForSpreadsheet('@cmd')).toBe("'@cmd");
    });

    it('leaves standard text unchanged', () => {
      expect(sanitizeForSpreadsheet('MEENAKSHI GUPTA')).toBe('MEENAKSHI GUPTA');
      expect(sanitizeForSpreadsheet('MS211001')).toBe('MS211001');
    });
  });
});
