/**
 * Data normalization helpers for Excel ingestion and export.
 */

/**
 * Normalizes Excel date representations (serial integers, DD/MM/YYYY, YYYY-MM-DD, etc.)
 * into an ISO standard YYYY-MM-DD string.
 */
export function normalizeDate(input: any): string {
  if (input === null || input === undefined || input === '') {
    return '';
  }

  // If input is an Excel serial number or string of digits
  const num = typeof input === 'number' ? input : Number(String(input).trim());
  if (!isNaN(num) && num > 1000 && num < 100000) {
    // Excel base date epoch is Dec 30, 1899 (accounting for 1900 leap year bug)
    // 25569 = Days between 1899-12-30 and 1970-01-01
    const msSinceEpoch = Math.round((num - 25569) * 86400 * 1000);
    const d = new Date(msSinceEpoch);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // If input is a Date object
  if (input instanceof Date && !isNaN(input.getTime())) {
    const year = input.getFullYear();
    const month = String(input.getMonth() + 1).padStart(2, '0');
    const day = String(input.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(input).trim();

  // Pattern: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Pattern: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Pattern: MM/DD/YYYY (if day is > 12)
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return str;
}

/**
 * Normalizes phone numbers to clean 10 digits for Indian mobile numbers.
 */
export function normalizePhone(input: any): string {
  if (input === null || input === undefined) return '';

  // Handle numbers serialized as floating points (e.g. 7007440076.0)
  let str = String(input).trim();
  if (str.includes('.')) {
    str = str.split('.')[0];
  }

  // Keep only digits
  let cleaned = str.replace(/\D/g, '');

  // Strip international prefix if present (91)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Cleans and trims text strings, reducing multiple internal whitespace to a single space.
 */
export function normalizeText(input: any): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes cell values for CSV/Excel export to prevent formula injection attacks.
 * Prepend single quote (') if value begins with =, +, -, @, or tab/return.
 */
export function sanitizeForSpreadsheet(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=\+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Checks if an input date of birth matches the student's stored date of birth.
 * Supports:
 * - Full dates in DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD
 * - Birth year only (YYYY, e.g. "2008")
 */
export function matchesDob(storedDob: string, inputDob: string): boolean {
  if (!storedDob || !inputDob) return false;

  const cleanInput = String(inputDob).trim();
  if (!cleanInput) return false;

  const normStored = normalizeDate(storedDob); // e.g. "2008-05-31"

  // 1. Birth Year only match (e.g. "2008")
  if (/^\d{4}$/.test(cleanInput)) {
    const storedYear = normStored ? normStored.split('-')[0] : String(storedDob).substring(0, 4);
    return storedYear === cleanInput;
  }

  // 2. Full date normalization match (e.g. "31-05-2008" or "2008-05-31")
  const normInput = normalizeDate(cleanInput);
  if (normInput && normStored && normInput === normStored) {
    return true;
  }

  // 3. Fallback raw comparison
  return String(storedDob).trim().toLowerCase() === cleanInput.toLowerCase();
}

