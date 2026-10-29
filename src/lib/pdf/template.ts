import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Student, SystemSettings } from '@/types';
import { getStudentEventSchedule } from './event-schedule';

export const ADMIT_CARD_TEMPLATE_VERSION = 'v3.4';

/**
 * Computes a deterministic SHA-256 hash of the student's data and template version.
 * If data doesn't change, we skip regenerating the PDF!
 */
export function computeStudentDataHash(
  student: Student,
  templateVersion: string = ADMIT_CARD_TEMPLATE_VERSION
): string {
  const payload = `${student.studentId}|${student.registrationNumber}|${student.name}|${student.fatherName}|${student.dateOfBirth}|${student.phone}|${student.schoolOrCollege}|${student.className}|${student.competitionName}|${templateVersion}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// Cached template bytes in memory for ultra-fast generation
let cachedTemplateBytes: Buffer | null = null;

function getAdmitCardTemplateBytes(): Buffer {
  if (cachedTemplateBytes) return cachedTemplateBytes;
  const candidatePaths = [
    path.join(process.cwd(), 'public', 'admit_card_template.pdf'),
    path.join(process.cwd(), 'admit card.pdf'),
    path.resolve('admit card.pdf'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      cachedTemplateBytes = fs.readFileSync(p);
      return cachedTemplateBytes;
    }
  }
  throw new Error('Official admit_card_template.pdf template not found in filesystem.');
}

// WinAnsi safe text converter
function safeText(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2022\u25b6\u25ba]/g, '>')
    .replace(/[^\x20-\x7E]/g, ' ')
    .trim();
}

function truncate(str: string | undefined | null, maxLen: number): string {
  const s = safeText(str);
  if (!s) return '';
  return s.length > maxLen ? s.slice(0, maxLen - 2) + '..' : s;
}

function formatDob(raw?: string): string {
  if (!raw) return 'N/A';
  const s = String(raw).trim();
  const mYmd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (mYmd) {
    return `${mYmd[3].padStart(2, '0')}-${mYmd[2].padStart(2, '0')}-${mYmd[1]}`;
  }
  const mDmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (mDmy) {
    return `${mDmy[1].padStart(2, '0')}-${mDmy[2].padStart(2, '0')}-${mDmy[3]}`;
  }
  return s;
}

function formatPhone(raw?: string): string {
  if (!raw) return 'N/A';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10 && digits !== '0000000000') {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const d10 = digits.slice(2);
    return `+91 ${d10.slice(0, 5)} ${d10.slice(5)}`;
  }
  return digits || 'N/A';
}

/**
 * Generates an official, printable A4 Admit Card PDF matching the finalized
 * institutional template from Meena Shah Public School (Mindspark 2026).
 */
export async function generateAdmitCardPdf(
  student: Student,
  settings: SystemSettings
): Promise<Uint8Array> {
  const templateBytes = getAdmitCardTemplateBytes();
  const templateDoc = await PDFDocument.load(templateBytes);
  const pdfDoc = await PDFDocument.create();

  // Embed the high-resolution vector template onto an exact standard A4 page (595.28 x 841.89 pt)
  const [embeddedTemplate] = await pdfDoc.embedPdf(templateDoc, [0]);
  const page = pdfDoc.addPage([595.28, 841.89]);
  page.drawPage(embeddedTemplate, { x: 0, y: 0, width: 595.28, height: 841.89 });

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);

const CODE39_PATTERNS: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', 'A': 'wnnnnwnnw', 'B': 'nnwnnwnnw',
  'C': 'wnwnnwnnn', 'D': 'nnnnwwnnw', 'E': 'wnnnwwnnn', 'F': 'nnwnwwnnn',
  'G': 'nnnnnwwnw', 'H': 'wnnnnwwnn', 'I': 'nnwnnwwnn', 'J': 'nnnnwwwnn',
  'K': 'wnnnnnnww', 'L': 'nnwnnnnww', 'M': 'wnwnnnnwn', 'N': 'nnnnwnnww',
  'O': 'wnnnwnnwn', 'P': 'nnwnwnnwn', 'Q': 'nnnnnnwww', 'R': 'wnnnnnwwn',
  'S': 'nnwnnnwwn', 'T': 'nnnnwnwwn', 'U': 'wwnnnnnnw', 'V': 'nwwnnnnnw',
  'W': 'wwwnnnnnn', 'X': 'nwnnwnnnw', 'Y': 'wwnnwnnnn', 'Z': 'nwwnwnnnn',
  '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
  '$': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn'
};

function drawBarcode(
  page: any,
  text: string,
  box: { x: number; y: number; width: number; height: number },
  color: any
) {
  const clean = '*' + String(text).toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, '') + '*';
  let totalUnits = 0;
  for (let i = 0; i < clean.length; i++) {
    const pattern = CODE39_PATTERNS[clean[i]] || CODE39_PATTERNS['-'];
    for (const ch of pattern) {
      totalUnits += (ch === 'w' ? 2.2 : 1.0);
    }
    if (i < clean.length - 1) totalUnits += 1.0;
  }

  const unitWidth = Math.min(0.52, (box.width - 2) / totalUnits);
  const actualBarcodeWidth = totalUnits * unitWidth;
  let curX = box.x + (box.width - actualBarcodeWidth) / 2;

  for (let i = 0; i < clean.length; i++) {
    const pattern = CODE39_PATTERNS[clean[i]] || CODE39_PATTERNS['-'];
    for (let p = 0; p < pattern.length; p++) {
      const isWide = pattern[p] === 'w';
      const w = (isWide ? 2.2 : 1.0) * unitWidth;
      const isBar = (p % 2 === 0);
      if (isBar) {
        page.drawRectangle({
          x: curX,
          y: box.y,
          width: w,
          height: box.height,
          color,
        });
      }
      curX += w;
    }
    curX += 1.0 * unitWidth;
  }
}

  const DARK = rgb(15 / 255, 23 / 255, 42 / 255);
  const MAROON = rgb(122 / 255, 12 / 255, 22 / 255);
  const WHITE = rgb(1, 1, 1);

  // 1. Top Bar Information:
  // Column 1: Registration Number
  page.drawRectangle({ x: 20, y: 654, width: 195, height: 26, color: WHITE });
  page.drawText('REGISTRATION NO. : ', { x: 24, y: 660, size: 8.5, font: fontBold, color: DARK });
  page.drawText(safeText(student.registrationNumber || 'N/A'), {
    x: 128,
    y: 660,
    size: 9.5,
    font: fontBold,
    color: MAROON,
  });

  // Column 2: Class / Degree
  page.drawRectangle({ x: 218, y: 654, width: 136, height: 26, color: WHITE });
  page.drawText('CLASS / DEGREE : ', { x: 222, y: 660, size: 7.5, font: fontBold, color: DARK });
  const rawClass = safeText(student.className || 'General');
  let classText = rawClass;
  if (/^(\d+|[IVXLCDM]+)$/i.test(rawClass.trim()) || /^\d+(st|nd|rd|th)$/i.test(rawClass.trim())) {
    classText = `Class ${rawClass.trim()}`;
  }
  const maxClassW = 55;
  let classSize = 8.5;
  const measuredClassW = fontBold.widthOfTextAtSize(classText, classSize);
  if (measuredClassW > maxClassW) {
    classSize = Math.max(6.5, (maxClassW / measuredClassW) * classSize);
  }
  page.drawText(classText, {
    x: 294,
    y: 660,
    size: classSize,
    font: fontBold,
    color: MAROON,
  });

  // Column 3: Official Barcode (Exact clean fit inside container borders)
  page.drawRectangle({ x: 358, y: 655, width: 212, height: 24, color: WHITE });

  page.drawText('OFFICIAL BARCODE : ', { x: 362, y: 660, size: 8.5, font: fontBold, color: DARK });

  // Draw clean vector barcode representing the candidate's registration number (comfortably inside borders)
  drawBarcode(page, student.registrationNumber || 'MS26-00000', {
    x: 466,
    y: 657,
    width: 94,
    height: 18,
  }, DARK);

  // 2. Candidate Particulars (Clean overlay directly above each dotted line)
  const particularsX = 182;
  const maxParticularsW = 285;

  const getFittedSize = (txt: string, initSize: number, minSize: number, fnt: any) => {
    const w = fnt.widthOfTextAtSize(txt, initSize);
    return w > maxParticularsW ? Math.max(minSize, (maxParticularsW / w) * initSize) : initSize;
  };

  // Candidate Full Name
  const nameText = safeText(student.name || 'N/A').toUpperCase();
  const nameSize = getFittedSize(nameText, 9.5, 7.5, fontBold);
  page.drawText(nameText, {
    x: particularsX,
    y: 593,
    size: nameSize,
    font: fontBold,
    color: DARK,
  });

  // Father's / Guardian's Name
  const fatherText = safeText(student.fatherName || 'N/A').toUpperCase();
  const fatherSize = getFittedSize(fatherText, 9.0, 7.2, fontRegular);
  page.drawText(fatherText, {
    x: particularsX,
    y: 572,
    size: fatherSize,
    font: fontRegular,
    color: DARK,
  });

  // Date of Birth (DD-MM-YYYY)
  const dobText = formatDob(student.dateOfBirth);
  page.drawText(dobText, {
    x: particularsX,
    y: 551,
    size: 9,
    font: fontRegular,
    color: DARK,
  });

  // Registered Contact / Phone
  const phoneText = formatPhone(student.phone);
  page.drawText(phoneText, {
    x: particularsX,
    y: 533,
    size: 9,
    font: fontBold,
    color: DARK,
  });

  // Competition Category
  const compText = safeText(student.competitionName || 'N/A').toUpperCase();
  const compSize = getFittedSize(compText, 9.0, 7.0, fontBold);
  page.drawText(compText, {
    x: particularsX,
    y: 512,
    size: compSize,
    font: fontBold,
    color: MAROON,
  });

  // School / College / Institution
  const schoolText = safeText(student.schoolOrCollege || 'MEENA SHAH PUBLIC SCHOOL, GONDA').toUpperCase();
  const schoolSize = getFittedSize(schoolText, 8.5, 7.0, fontRegular);
  page.drawText(schoolText, {
    x: particularsX,
    y: 490,
    size: schoolSize,
    font: fontRegular,
    color: DARK,
  });

  // 3. Examination Schedule & Venue Details:
  const schedule = getStudentEventSchedule(
    student.competitionName || '',
    student.className || '',
    student.registrationNumber
  );

  // Column 1 Clean Overwrite (Date of Examination) if date is 2 Nov 2026
  if (schedule.examDate && (schedule.examDate.includes('02') || schedule.examDate.includes('2 Nov'))) {
    page.drawRectangle({ x: 20, y: 390, width: 155, height: 50, color: WHITE });
    page.drawText('DATE OF EXAMINATION :', { x: 24, y: 422, size: 7.5, font: fontBold, color: DARK });
    page.drawText('02- Nov- 2026', { x: 24, y: 402, size: 9.0, font: fontBold, color: MAROON });
  }

  // Column 2 Clean Overwrite (Reporting Time & Exam Time)
  page.drawRectangle({ x: 180, y: 390, width: 155, height: 50, color: WHITE });

  const repTime = safeText(schedule.reportingTime || settings.reportingTime || '09:00 AM');
  page.drawText('REPORTING TIME :', { x: 185, y: 422, size: 7.5, font: fontBold, color: DARK });
  page.drawText(repTime, { x: 265, y: 422, size: 8.0, font: fontBold, color: MAROON });

  const exTime = safeText(schedule.examTime || settings.examTime || '10:00 AM');
  page.drawText('EXAM TIME :', { x: 185, y: 402, size: 7.5, font: fontBold, color: DARK });

  // Auto-fit exam time if long (e.g. shifts like 10:00 AM - 11:00 AM (BATCH 1))
  const maxExW = 88;
  let exSize = 7.5;
  const measuredExW = fontBold.widthOfTextAtSize(exTime, exSize);
  if (measuredExW > maxExW) {
    exSize = Math.max(6.2, (maxExW / measuredExW) * exSize);
  }
  page.drawText(exTime, { x: 242, y: 402, size: exSize, font: fontBold, color: DARK });

  // Column 3 Clean Overwrite (Allocated Examination Venue)
  // Clean white box covering underneath ALLOCATED EXAMINATION VENUE :
  page.drawRectangle({ x: 332, y: 392, width: 240, height: 26, color: WHITE });

  // Line 1: Main Institution Campus
  page.drawText(schedule.venueMain, {
    x: 346,
    y: 407,
    size: 8.0,
    font: fontBold,
    color: MAROON,
  });

  // Line 2: Specific Venue Floor / Room from Events Deatails.xlsx
  const venueDetailText = `VENUE: ${schedule.venueDetail}`;
  const maxVenueW = 220;
  let venueSize = 8.0;
  const measuredVenueW = fontBold.widthOfTextAtSize(venueDetailText, venueSize);
  if (measuredVenueW > maxVenueW) {
    venueSize = Math.max(6.5, (maxVenueW / measuredVenueW) * venueSize);
  }
  page.drawText(venueDetailText, {
    x: 346,
    y: 395,
    size: venueSize,
    font: fontBold,
    color: DARK,
  });

  // 4. Essential Directives for Candidate:
  // Points 1-9 are finalized directly in the institutional vector template
  return await pdfDoc.save();
}
