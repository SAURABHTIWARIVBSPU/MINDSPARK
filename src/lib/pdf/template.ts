import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import { Student, SystemSettings } from '@/types';

export const ADMIT_CARD_TEMPLATE_VERSION = 'v2.0';

/**
 * Computes a hash of the student's data and template version.
 * If data doesn't change, we skip regenerating the PDF!
 */
export function computeStudentDataHash(
  student: Student,
  templateVersion: string = ADMIT_CARD_TEMPLATE_VERSION
): string {
  const payload = `${student.studentId}|${student.registrationNumber}|${student.name}|${student.fatherName}|${student.dateOfBirth}|${student.phone}|${student.schoolOrCollege}|${student.className}|${student.competitionName}|${templateVersion}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Generates an official, printable ultra-premium A4 Admit Card PDF.
 * Designed with UP Scholarship institutional aesthetic, dual security borders,
 * candidate particulars grid, official photo box, dynamic barcode, and triple signature panels.
 */
export async function generateAdmitCardPdf(
  student: Student,
  settings: SystemSettings
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  // Standard A4: 595.28 x 841.89 pt
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Institutional UP Scholarship / Mind-Spark Premium Palette
  const maroon = rgb(0.48, 0.05, 0.09); // #7a0c16
  const darkMaroon = rgb(0.36, 0.0, 0.04); // #5c000b
  const gold = rgb(0.85, 0.47, 0.02); // #d97706
  const lightGold = rgb(0.99, 0.96, 0.90);
  const darkCharcoal = rgb(0.12, 0.13, 0.15);
  const mediumGray = rgb(0.35, 0.38, 0.42);
  const borderGray = rgb(0.80, 0.83, 0.87);
  const cardBg = rgb(0.985, 0.988, 0.992);

  // 1. Dual Outer Borders
  page.drawRectangle({
    x: 22,
    y: 22,
    width: width - 44,
    height: height - 44,
    borderColor: maroon,
    borderWidth: 2,
  });

  page.drawRectangle({
    x: 26,
    y: 26,
    width: width - 52,
    height: height - 52,
    borderColor: gold,
    borderWidth: 0.8,
  });

  let curY = height - 52;

  // 2. Premium Header Banner
  const headerHeight = 76;
  page.drawRectangle({
    x: 30,
    y: curY - headerHeight,
    width: width - 60,
    height: headerHeight,
    color: maroon,
  });

  // Top Accent Gold Bar
  page.drawRectangle({
    x: 30,
    y: curY - 3,
    width: width - 60,
    height: 3,
    color: gold,
  });

  // Title: School Name / Organization
  const schoolTitle = (settings.schoolName || 'MIND-SPARK ACADEMIC OLYMPIAD').toUpperCase();
  const schoolW = fontBold.widthOfTextAtSize(schoolTitle, 15);
  page.drawText(schoolTitle, {
    x: (width - schoolW) / 2,
    y: curY - 24,
    size: 15,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Subtitle: Competition Title
  const compTitle = (settings.competitionTitle || 'ANNUAL INTER-SCHOOL COMPETITION 2026').toUpperCase();
  const compW = fontRegular.widthOfTextAtSize(compTitle, 10);
  page.drawText(compTitle, {
    x: (width - compW) / 2,
    y: curY - 42,
    size: 10,
    font: fontRegular,
    color: rgb(0.96, 0.92, 0.82),
  });

  // Badge: Official Hall Ticket / Admit Card
  const badgeText = 'OFFICIAL PROVISIONAL ADMIT CARD / ENTRY PASS | 2026';
  const badgeW = fontBold.widthOfTextAtSize(badgeText, 9.5);
  const badgeBoxW = badgeW + 24;
  page.drawRectangle({
    x: (width - badgeBoxW) / 2,
    y: curY - 68,
    width: badgeBoxW,
    height: 18,
    color: lightGold,
    borderColor: gold,
    borderWidth: 1,
  });
  page.drawText(badgeText, {
    x: (width - badgeW) / 2,
    y: curY - 63,
    size: 9.5,
    font: fontBold,
    color: darkMaroon,
  });

  curY -= headerHeight + 14;

  // 3. Highlighted Registration & Barcode Bar
  const regBarH = 48;
  page.drawRectangle({
    x: 30,
    y: curY - regBarH,
    width: width - 60,
    height: regBarH,
    color: cardBg,
    borderColor: borderGray,
    borderWidth: 1,
  });

  // Left side: Registration Box
  page.drawText('REGISTRATION NO.', {
    x: 44,
    y: curY - 18,
    size: 9,
    font: fontBold,
    color: mediumGray,
  });

  page.drawText(student.registrationNumber, {
    x: 44,
    y: curY - 38,
    size: 17,
    font: fontBold,
    color: maroon,
  });

  // Middle: Candidate Class Badge
  page.drawText('CLASS / GRADE:', {
    x: 235,
    y: curY - 18,
    size: 9,
    font: fontBold,
    color: mediumGray,
  });

  const classStr = (student.className || 'GENERAL').toUpperCase();
  page.drawText(classStr, {
    x: 235,
    y: curY - 37,
    size: 13,
    font: fontBold,
    color: darkCharcoal,
  });

  // Right side: Realistic Barcode Lines
  const barcodeX = width - 180;
  const barcodeY = curY - 38;
  const barcodeH = 24;
  const codeStr = student.registrationNumber.replace(/[^A-Z0-9]/g, '');
  let bX = barcodeX;
  for (let i = 0; i < codeStr.length; i++) {
    const charCode = codeStr.charCodeAt(i);
    const barW = (charCode % 3) + 1.2;
    page.drawRectangle({
      x: bX,
      y: barcodeY,
      width: barW,
      height: barcodeH,
      color: darkCharcoal,
    });
    bX += barW + 1.8;
  }
  page.drawText('OFFICIAL VERIFIED BARCODE', {
    x: barcodeX,
    y: curY - 45,
    size: 6.5,
    font: fontRegular,
    color: mediumGray,
  });

  curY -= regBarH + 14;

  // 4. Candidate Particulars & Photo Box Section
  const particularsW = width - 60 - 120; // 535 - 120 = 415 pt
  const photoW = 105;
  const photoH = 125;
  const photoX = width - 30 - photoW;
  const photoY = curY - photoH;

  // Header Title
  page.drawText('CANDIDATE PARTICULARS', {
    x: 32,
    y: curY,
    size: 10.5,
    font: fontBold,
    color: maroon,
  });

  curY -= 10;

  // Photo Box Placeholder
  page.drawRectangle({
    x: photoX,
    y: photoY,
    width: photoW,
    height: photoH,
    color: rgb(0.97, 0.97, 0.98),
    borderColor: borderGray,
    borderWidth: 1,
  });

  // Inner portrait frame
  page.drawRectangle({
    x: photoX + 32,
    y: photoY + 68,
    width: 40,
    height: 40,
    borderColor: rgb(0.75, 0.78, 0.82),
    borderWidth: 0.8,
  });

  page.drawText('AFFIX RECENT', {
    x: photoX + 18,
    y: photoY + 50,
    size: 8,
    font: fontBold,
    color: mediumGray,
  });
  page.drawText('COLOR PASSPORT', {
    x: photoX + 11,
    y: photoY + 38,
    size: 7.5,
    font: fontBold,
    color: mediumGray,
  });
  page.drawText('PHOTOGRAPH', {
    x: photoX + 22,
    y: photoY + 26,
    size: 7.5,
    font: fontBold,
    color: mediumGray,
  });
  page.drawText('(Self-Attested)', {
    x: photoX + 22,
    y: photoY + 14,
    size: 7,
    font: fontRegular,
    color: rgb(0.5, 0.53, 0.58),
  });

  // Particulars Table (Left column)
  const fields = [
    { label: 'Candidate Full Name', value: student.name },
    { label: "Father's / Guardian's Name", value: student.fatherName },
    { label: 'Date of Birth (YYYY-MM-DD)', value: student.dateOfBirth },
    { label: 'Registered Contact / Phone', value: `+91 ${student.phone}` },
    { label: 'Competition Category', value: student.competitionName },
    { label: 'School / College / Institution', value: student.schoolOrCollege },
  ];

  const rowHeight = 22;
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const rY = curY - (i + 1) * rowHeight;

    // Row alternating background
    if (i % 2 === 0) {
      page.drawRectangle({
        x: 30,
        y: rY,
        width: particularsW,
        height: rowHeight,
        color: rgb(0.975, 0.98, 0.985),
      });
    }

    // Border line under each row
    page.drawLine({
      start: { x: 30, y: rY },
      end: { x: 30 + particularsW, y: rY },
      color: borderGray,
      thickness: 0.5,
    });

    // Label
    page.drawText(f.label, {
      x: 38,
      y: rY + 6,
      size: 9,
      font: fontBold,
      color: mediumGray,
    });

    // Colon
    page.drawText(':', {
      x: 185,
      y: rY + 6,
      size: 9,
      font: fontBold,
      color: mediumGray,
    });

    // Value with auto-scaled font
    const valText = String(f.value || '').toUpperCase();
    const maxValW = particularsW - 170;
    let vFontSize = 9.5;
    const vTextW = fontBold.widthOfTextAtSize(valText, vFontSize);
    if (vTextW > maxValW) {
      vFontSize = Math.max(7.2, (maxValW / vTextW) * vFontSize);
    }

    page.drawText(valText, {
      x: 195,
      y: rY + (vFontSize < 9 ? 6.8 : 6),
      size: vFontSize,
      font: i === 0 ? fontBold : (f.label.includes('Category') ? fontBold : fontRegular),
      color: i === 0 ? maroon : (f.label.includes('Category') ? darkMaroon : darkCharcoal),
    });
  }

  // True bounding bottom of section 4 (whichever extends lower: table or photo box)
  const tableBottomY = curY - fields.length * rowHeight;
  const particularsSectionBottom = Math.min(tableBottomY, photoY);
  curY = particularsSectionBottom - 22;

  // 5. Examination Schedule & Venue (Highlighted Card)
  page.drawText('EXAMINATION SCHEDULE & VENUE DETAILS', {
    x: 32,
    y: curY,
    size: 10.5,
    font: fontBold,
    color: maroon,
  });

  curY -= 12;
  const schedHeight = 72;
  page.drawRectangle({
    x: 30,
    y: curY - schedHeight,
    width: width - 60,
    height: schedHeight,
    color: lightGold,
    borderColor: gold,
    borderWidth: 1,
  });

  // Left partition: Exam Date & Reporting
  page.drawText('DATE OF EXAMINATION', {
    x: 44,
    y: curY - 20,
    size: 8.5,
    font: fontBold,
    color: mediumGray,
  });
  page.drawText(settings.examDate || '01 Nov 2026', {
    x: 44,
    y: curY - 36,
    size: 13,
    font: fontBold,
    color: maroon,
  });

  page.drawText('REPORTING TIME', {
    x: 200,
    y: curY - 20,
    size: 8.5,
    font: fontBold,
    color: mediumGray,
  });
  page.drawText(settings.reportingTime || '09:00 AM', {
    x: 200,
    y: curY - 36,
    size: 13,
    font: fontBold,
    color: rgb(0.7, 0.1, 0.1),
  });

  page.drawText('GATE CLOSES: 09:30 AM STRICTLY', {
    x: 200,
    y: curY - 50,
    size: 7.5,
    font: fontBold,
    color: rgb(0.65, 0.1, 0.1),
  });

  // Right partition: Examination Venue
  page.drawText('ALLOCATED EXAMINATION VENUE', {
    x: 350,
    y: curY - 20,
    size: 8.5,
    font: fontBold,
    color: mediumGray,
  });

  const venueStr = (settings.venue || 'CENTRAL EXAMINATION VENUE').toUpperCase();
  const maxVenueWidth = width - 60 - 350 - 10;
  let vSize = 9;
  const vWidth = fontBold.widthOfTextAtSize(venueStr, vSize);
  if (vWidth > maxVenueWidth) {
    vSize = Math.max(7.2, (maxVenueWidth / vWidth) * vSize);
  }

  page.drawText(venueStr, {
    x: 350,
    y: curY - 36,
    size: vSize,
    font: fontBold,
    color: darkCharcoal,
  });

  page.drawText(`Helpdesk: ${settings.contactPhone || '9876543210'} | ${settings.contactEmail || 'admissions@mindspark.edu.in'}`, {
    x: 350,
    y: curY - 52,
    size: 7.5,
    font: fontRegular,
    color: mediumGray,
  });

  curY -= schedHeight + 16;

  // 6. Important Directives Box
  page.drawText('ESSENTIAL DIRECTIVES FOR CANDIDATES', {
    x: 32,
    y: curY,
    size: 10,
    font: fontBold,
    color: maroon,
  });

  curY -= 10;
  const rulesHeight = 74;
  page.drawRectangle({
    x: 30,
    y: curY - rulesHeight,
    width: width - 60,
    height: rulesHeight,
    color: cardBg,
    borderColor: borderGray,
    borderWidth: 0.8,
  });

  const directives = [
    '1. The candidate MUST bring this printed Admit Card and original School/College Photo ID card.',
    '2. Candidates must report at the examination venue strictly before the designated Reporting Time.',
    '3. Possession of mobile phones, smartwatches, calculators, or any electronic equipment is strictly banned.',
    '4. Any impersonation, unfair means, or indiscipline will result in immediate cancellation of candidature.',
    '5. Retain this Admit Card safely until the announcement of official competition results and merit honors.',
  ];

  let dirY = curY - 15;
  for (const d of directives) {
    page.drawText(d, {
      x: 40,
      y: dirY,
      size: 8,
      font: fontRegular,
      color: darkCharcoal,
    });
    dirY -= 12;
  }

  curY -= rulesHeight + 18;

  // 7. Signature & Authorization Area (3 Panels)
  const sigH = 50;
  const panelW = (width - 60 - 24) / 3; // ~170 pt each

  // Panel 1: Candidate's Signature
  page.drawRectangle({
    x: 30,
    y: curY - sigH,
    width: panelW,
    height: sigH,
    color: rgb(0.99, 0.99, 0.99),
    borderColor: borderGray,
    borderWidth: 0.8,
  });
  page.drawText("Candidate's Signature", {
    x: 45,
    y: curY - sigH + 8,
    size: 8,
    font: fontBold,
    color: mediumGray,
  });
  page.drawText('(In presence of Invigilator)', {
    x: 45,
    y: curY - sigH + 20,
    size: 6.5,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.6),
  });

  // Panel 2: Invigilator's Signature
  page.drawRectangle({
    x: 30 + panelW + 12,
    y: curY - sigH,
    width: panelW,
    height: sigH,
    color: rgb(0.99, 0.99, 0.99),
    borderColor: borderGray,
    borderWidth: 0.8,
  });
  page.drawText("Room Invigilator's Signature", {
    x: 30 + panelW + 22,
    y: curY - sigH + 8,
    size: 8,
    font: fontBold,
    color: mediumGray,
  });
  page.drawText('(Verified Photo & Identity)', {
    x: 30 + panelW + 22,
    y: curY - sigH + 20,
    size: 6.5,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.6),
  });

  // Panel 3: Controller of Examinations & Seal
  page.drawRectangle({
    x: 30 + (panelW * 2) + 24,
    y: curY - sigH,
    width: panelW,
    height: sigH,
    color: lightGold,
    borderColor: gold,
    borderWidth: 1,
  });
  page.drawText('Controller of Examinations', {
    x: 30 + (panelW * 2) + 38,
    y: curY - sigH + 8,
    size: 8,
    font: fontBold,
    color: maroon,
  });
  page.drawText('[ OFFICIAL SEAL & AUTHORIZATION ]', {
    x: 30 + (panelW * 2) + 26,
    y: curY - sigH + 24,
    size: 6.5,
    font: fontBold,
    color: gold,
  });

  // Footer Verification Note
  page.drawText(
    `Official Admit Card | Mind-Spark Secure Examination Portal | Registration: ${student.registrationNumber} | Generated on ${new Date().toLocaleDateString('en-GB')}`,
    {
      x: 30,
      y: 32,
      size: 7,
      font: fontRegular,
      color: mediumGray,
    }
  );

  return await pdfDoc.save();
}
