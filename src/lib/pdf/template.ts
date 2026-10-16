import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import { Student, SystemSettings } from '@/types';

export const ADMIT_CARD_TEMPLATE_VERSION = 'v1.0';

/**
 * Computes a hash of the student's data and template version.
 * If data doesn't change, we skip regenerating the PDF!
 */
export function computeStudentDataHash(student: Student, templateVersion: string = ADMIT_CARD_TEMPLATE_VERSION): string {
  const payload = `${student.studentId}|${student.registrationNumber}|${student.name}|${student.fatherName}|${student.dateOfBirth}|${student.phone}|${student.schoolOrCollege}|${student.className}|${student.competitionName}|${templateVersion}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Generates an official, printable A4 Admit Card PDF.
 */
export async function generateAdmitCardPdf(
  student: Student,
  settings: SystemSettings
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  // Standard A4: 595.28 x 841.89 pt
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

  // Palette
  const navy = rgb(0.08, 0.16, 0.36);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.94, 0.95, 0.96);
  const borderGray = rgb(0.75, 0.78, 0.82);
  const accentBlue = rgb(0.18, 0.35, 0.72);

  // 1. Outer Border
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: navy,
    borderWidth: 2,
  });

  // Inner decorative border
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderColor: borderGray,
    borderWidth: 0.8,
  });

  let curY = height - 60;

  // 2. Header Banner
  page.drawRectangle({
    x: 35,
    y: curY - 50,
    width: width - 70,
    height: 65,
    color: navy,
  });

  const schoolTitle = settings.schoolName.toUpperCase();
  const schoolTitleWidth = fontHelveticaBold.widthOfTextAtSize(schoolTitle, 16);
  page.drawText(schoolTitle, {
    x: (width - schoolTitleWidth) / 2,
    y: curY - 5,
    size: 16,
    font: fontHelveticaBold,
    color: rgb(1, 1, 1),
  });

  const eventTitle = settings.competitionTitle.toUpperCase();
  const eventTitleWidth = fontHelvetica.widthOfTextAtSize(eventTitle, 11);
  page.drawText(eventTitle, {
    x: (width - eventTitleWidth) / 2,
    y: curY - 24,
    size: 11,
    font: fontHelvetica,
    color: rgb(0.85, 0.9, 1),
  });

  const bannerBadge = 'OFFICIAL EXAMINATION ADMIT CARD';
  const badgeWidth = fontHelveticaBold.widthOfTextAtSize(bannerBadge, 10);
  page.drawText(bannerBadge, {
    x: (width - badgeWidth) / 2,
    y: curY - 42,
    size: 10,
    font: fontHelveticaBold,
    color: rgb(0.95, 0.85, 0.2), // Gold badge
  });

  curY -= 75;

  // 3. Registration Box
  const regBoxWidth = width - 70;
  const regBoxHeight = 42;
  page.drawRectangle({
    x: 35,
    y: curY - regBoxHeight,
    width: regBoxWidth,
    height: regBoxHeight,
    color: lightGray,
    borderColor: accentBlue,
    borderWidth: 1.5,
  });

  page.drawText('REGISTRATION NUMBER:', {
    x: 50,
    y: curY - 26,
    size: 11,
    font: fontHelveticaBold,
    color: navy,
  });

  page.drawText(student.registrationNumber, {
    x: 215,
    y: curY - 27,
    size: 16,
    font: fontHelveticaBold,
    color: accentBlue,
  });

  // Stamp / QR code mock on the right
  page.drawRectangle({
    x: width - 150,
    y: curY - regBoxHeight + 5,
    width: 100,
    height: 32,
    borderColor: borderGray,
    borderWidth: 1,
  });
  page.drawText('VERIFIED TICKET', {
    x: width - 142,
    y: curY - 24,
    size: 8,
    font: fontCourier,
    color: darkGray,
  });

  curY -= 55;

  // 4. Candidate Details Section
  page.drawText('CANDIDATE PARTICULARS', {
    x: 35,
    y: curY,
    size: 11,
    font: fontHelveticaBold,
    color: navy,
  });

  curY -= 12;

  // Details Grid
  const gridFields = [
    { label: 'Student Full Name', val: student.name },
    { label: "Father's / Guardian's Name", val: student.fatherName },
    { label: 'Date of Birth (YYYY-MM-DD)', val: student.dateOfBirth },
    { label: 'Registered Contact / WhatsApp', val: student.phone },
    { label: 'School / College / Institution', val: student.schoolOrCollege },
    { label: 'Class / Standard', val: student.className || 'N/A' },
    { label: 'Competition Category', val: student.competitionName },
  ];

  const rowH = 22;
  const gridW = width - 70;

  for (let i = 0; i < gridFields.length; i++) {
    const item = gridFields[i];
    const rowY = curY - (i + 1) * rowH;

    // Alternate row shading
    if (i % 2 === 0) {
      page.drawRectangle({
        x: 35,
        y: rowY,
        width: gridW,
        height: rowH,
        color: rgb(0.97, 0.98, 0.99),
      });
    }

    // Border line below each row
    page.drawLine({
      start: { x: 35, y: rowY },
      end: { x: 35 + gridW, y: rowY },
      color: borderGray,
      thickness: 0.5,
    });

    // Label
    page.drawText(item.label, {
      x: 45,
      y: rowY + 6,
      size: 9.5,
      font: fontHelveticaBold,
      color: darkGray,
    });

    // Colon
    page.drawText(':', {
      x: 215,
      y: rowY + 6,
      size: 9.5,
      font: fontHelveticaBold,
      color: darkGray,
    });

    // Value
    page.drawText(String(item.val).toUpperCase(), {
      x: 230,
      y: rowY + 6,
      size: 9.5,
      font: fontHelvetica,
      color: rgb(0.05, 0.05, 0.05),
    });
  }

  curY -= gridFields.length * rowH + 20;

  // 5. Examination Schedule Box
  page.drawText('EXAMINATION SCHEDULE & VENUE DETAILS', {
    x: 35,
    y: curY,
    size: 11,
    font: fontHelveticaBold,
    color: navy,
  });

  curY -= 10;

  const schedH = 68;
  page.drawRectangle({
    x: 35,
    y: curY - schedH,
    width: gridW,
    height: schedH,
    color: lightGray,
    borderColor: borderGray,
    borderWidth: 1,
  });

  page.drawText('Date of Examination :', {
    x: 45,
    y: curY - 20,
    size: 9.5,
    font: fontHelveticaBold,
    color: darkGray,
  });
  page.drawText(settings.examDate, {
    x: 180,
    y: curY - 20,
    size: 9.5,
    font: fontHelveticaBold,
    color: accentBlue,
  });

  page.drawText('Reporting Time :', {
    x: 310,
    y: curY - 20,
    size: 9.5,
    font: fontHelveticaBold,
    color: darkGray,
  });
  page.drawText(settings.reportingTime, {
    x: 420,
    y: curY - 20,
    size: 9.5,
    font: fontHelveticaBold,
    color: rgb(0.7, 0.1, 0.1),
  });

  page.drawText('Examination Venue :', {
    x: 45,
    y: curY - 42,
    size: 9.5,
    font: fontHelveticaBold,
    color: darkGray,
  });
  page.drawText(settings.venue, {
    x: 180,
    y: curY - 42,
    size: 9,
    font: fontHelvetica,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText('Helpdesk Contact :', {
    x: 45,
    y: curY - 60,
    size: 9.5,
    font: fontHelveticaBold,
    color: darkGray,
  });
  page.drawText(`${settings.contactPhone} | ${settings.contactEmail}`, {
    x: 180,
    y: curY - 60,
    size: 9,
    font: fontHelvetica,
    color: darkGray,
  });

  curY -= schedH + 20;

  // 6. Important Guidelines
  page.drawText('IMPORTANT EXAMINATION INSTRUCTIONS', {
    x: 35,
    y: curY,
    size: 10,
    font: fontHelveticaBold,
    color: navy,
  });

  curY -= 14;

  const instructions = [
    '1. The candidate MUST bring this printed Admit Card and their original School/College ID card.',
    '2. Candidates must report at the examination venue strictly before the designated Reporting Time.',
    '3. Possession of mobile phones, smartwatches, calculators, or any electronic equipment is strictly banned.',
    '4. Any impersonation or unfair means detected will result in immediate disqualification and disciplinary action.',
    '5. Please retain this Admit Card until the announcement of final competition results and awards.',
  ];

  for (const rule of instructions) {
    page.drawText(rule, {
      x: 40,
      y: curY,
      size: 8,
      font: fontHelvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    curY -= 13;
  }

  curY -= 15;

  // 7. Signature & Authorization Area
  const sigBoxW = 160;
  const sigBoxH = 50;

  // Candidate Signature Box
  page.drawRectangle({
    x: 50,
    y: curY - sigBoxH,
    width: sigBoxW,
    height: sigBoxH,
    borderColor: borderGray,
    borderWidth: 1,
  });
  page.drawText("Candidate's Signature", {
    x: 75,
    y: curY - sigBoxH + 6,
    size: 8.5,
    font: fontHelveticaBold,
    color: darkGray,
  });

  // Controller Signature Box
  page.drawRectangle({
    x: width - 50 - sigBoxW,
    y: curY - sigBoxH,
    width: sigBoxW,
    height: sigBoxH,
    borderColor: borderGray,
    borderWidth: 1,
  });
  page.drawText('Controller of Examinations', {
    x: width - 40 - sigBoxW,
    y: curY - sigBoxH + 6,
    size: 8.5,
    font: fontHelveticaBold,
    color: navy,
  });

  // Footer stamp
  page.drawText(
    `Generated by Mind-Spark Secure Examination Portal • Template ${ADMIT_CARD_TEMPLATE_VERSION} • Internal ID: ${student.studentId}`,
    {
      x: 35,
      y: 35,
      size: 7,
      font: fontHelvetica,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  return await pdfDoc.save();
}
