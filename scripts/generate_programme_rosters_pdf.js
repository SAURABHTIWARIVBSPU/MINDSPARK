const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const outDir = path.resolve('c:/Users/Saurabh Tiwari/Desktop/MINDSPARK/Programme_Wise_Candidate_PDFs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Color Palette - Institutional Maroon, Gold, Slate
const MAROON = rgb(122 / 255, 12 / 255, 22 / 255);       // #7a0c16
const GOLD = rgb(217 / 255, 119 / 255, 6 / 255);         // #d97706
const DARK_SLATE = rgb(30 / 255, 41 / 255, 59 / 255);    // #1e293b
const LIGHT_ROW = rgb(248 / 255, 250 / 255, 252 / 255);  // #f8fafc
const BORDER_COLOR = rgb(226 / 255, 232 / 255, 240 / 255);// #e2e8f0
const TEXT_MUTED = rgb(100 / 255, 116 / 255, 139 / 255); // #64748b
const GREEN = rgb(22 / 255, 101 / 255, 52 / 255);        // #166534
const RED = rgb(159 / 255, 18 / 255, 57 / 255);          // #9f1239
const AMBER = rgb(180 / 255, 83 / 255, 9 / 255);         // #b45309

async function generateRosterPdfs() {
  console.log('Fetching live students from Supabase...');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let allStudents = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('students')
      .select('student_id, registration_number, name, class_name, competition_name, phone, school_or_college, whatsapp_status')
      .range(from, from + 999);

    if (error) {
      console.error('Supabase fetch error:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allStudents = allStudents.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  console.log(`Successfully fetched ${allStudents.length} students from Supabase.`);

  // Group by Competition
  const competitionGroups = {};
  for (const s of allStudents) {
    const rawComp = (s.competition_name || 'UNASSIGNED').trim().toUpperCase();
    if (!competitionGroups[rawComp]) {
      competitionGroups[rawComp] = [];
    }
    competitionGroups[rawComp].push(s);
  }

  const compNames = Object.keys(competitionGroups).sort();
  console.log(`Generating separate PDFs for ${compNames.length} Programmes/Competitions...`);

  const PAGE_WIDTH = 595.28;  // A4 Portrait
  const PAGE_HEIGHT = 841.89;
  const MARGIN_X = 25;
  const MARGIN_BOTTOM = 35;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 545.28

  // Table Column Definitions
  const colWidths = {
    sno: 25,
    regNo: 75,
    name: 135,
    className: 40,
    phone: 75,
    school: 140,
    status: 55,
  };

  const generatedFiles = [];

  for (const compName of compNames) {
    const students = competitionGroups[compName];
    // Sort by registration number
    students.sort((a, b) => (a.registration_number || '').localeCompare(b.registration_number || ''));

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const ROWS_PER_PAGE = 26;
    const totalPages = Math.ceil(students.length / ROWS_PER_PAGE) || 1;

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const pageStudents = students.slice(pageIdx * ROWS_PER_PAGE, (pageIdx + 1) * ROWS_PER_PAGE);

      let currentY = PAGE_HEIGHT - 25;

      // 1. Institutional Header Banner
      page.drawRectangle({
        x: MARGIN_X,
        y: currentY - 55,
        width: CONTENT_WIDTH,
        height: 60,
        color: MAROON,
      });

      // Gold Accent line at bottom of header
      page.drawRectangle({
        x: MARGIN_X,
        y: currentY - 58,
        width: CONTENT_WIDTH,
        height: 3,
        color: GOLD,
      });

      page.drawText('MEENA SHAH PUBLIC SCHOOL, GONDA', {
        x: MARGIN_X + 15,
        y: currentY - 20,
        size: 13,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText('MIND SPARK COMPETITION 2026 — OFFICIAL CANDIDATE TRACKING ROSTER', {
        x: MARGIN_X + 15,
        y: currentY - 36,
        size: 9,
        font: fontRegular,
        color: rgb(254 / 255, 243 / 255, 199 / 255), // light amber
      });

      page.drawText(`Date: 24-Oct-2026 | Session: 2026-27 | Authoritative Record`, {
        x: MARGIN_X + 15,
        y: currentY - 49,
        size: 7.5,
        font: fontRegular,
        color: rgb(241 / 255, 245 / 255, 249 / 255),
      });

      currentY -= 68;

      // 2. Programme Info Box
      page.drawRectangle({
        x: MARGIN_X,
        y: currentY - 32,
        width: CONTENT_WIDTH,
        height: 32,
        color: rgb(248 / 255, 250 / 255, 252 / 255),
        borderColor: rgb(203 / 255, 213 / 255, 225 / 255),
        borderWidth: 1,
      });

      page.drawText(`PROGRAMME / COMPETITION: ${compName}`, {
        x: MARGIN_X + 10,
        y: currentY - 15,
        size: 9.5,
        font: fontBold,
        color: MAROON,
      });

      const sentCount = students.filter(s => ['SENT', 'DELIVERED', 'READ', 'OPENED'].includes(s.whatsapp_status)).length;
      const pendingCount = students.filter(s => !s.whatsapp_status || s.whatsapp_status === 'NOT_SENT').length;
      const failedCount = students.filter(s => s.whatsapp_status === 'FAILED').length;

      page.drawText(`Total Candidates: ${students.length}   |   Sent: ${sentCount}   |   Pending: ${pendingCount}   |   Page ${pageIdx + 1} of ${totalPages}`, {
        x: MARGIN_X + 10,
        y: currentY - 27,
        size: 7.5,
        font: fontRegular,
        color: DARK_SLATE,
      });

      currentY -= 40;

      // 3. Table Header
      const ROW_HEIGHT = 20;
      page.drawRectangle({
        x: MARGIN_X,
        y: currentY - ROW_HEIGHT,
        width: CONTENT_WIDTH,
        height: ROW_HEIGHT,
        color: DARK_SLATE,
      });

      let colX = MARGIN_X;
      const headerTextY = currentY - 14;

      const drawHeaderCell = (text, width) => {
        page.drawText(text, {
          x: colX + 4,
          y: headerTextY,
          size: 7.5,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        colX += width;
      };

      drawHeaderCell('#', colWidths.sno);
      drawHeaderCell('REG. NO.', colWidths.regNo);
      drawHeaderCell('CANDIDATE NAME', colWidths.name);
      drawHeaderCell('CLASS', colWidths.className);
      drawHeaderCell('MOBILE NO.', colWidths.phone);
      drawHeaderCell('SCHOOL / COLLEGE', colWidths.school);
      drawHeaderCell('STATUS', colWidths.status);

      currentY -= ROW_HEIGHT;

      // 4. Student Rows
      pageStudents.forEach((student, rIdx) => {
        const globalIdx = pageIdx * ROWS_PER_PAGE + rIdx + 1;
        const rowBg = rIdx % 2 === 0 ? rgb(1, 1, 1) : LIGHT_ROW;

        page.drawRectangle({
          x: MARGIN_X,
          y: currentY - ROW_HEIGHT,
          width: CONTENT_WIDTH,
          height: ROW_HEIGHT,
          color: rowBg,
          borderColor: BORDER_COLOR,
          borderWidth: 0.5,
        });

        let curX = MARGIN_X;
        const textY = currentY - 14;

        // Truncate helper
        const truncate = (str, maxLen) => {
          if (!str) return '';
          return str.length > maxLen ? str.slice(0, maxLen - 2) + '..' : str;
        };

        // S.No
        page.drawText(String(globalIdx), {
          x: curX + 4,
          y: textY,
          size: 7.5,
          font: fontRegular,
          color: TEXT_MUTED,
        });
        curX += colWidths.sno;

        // Reg No
        page.drawText(student.registration_number || 'N/A', {
          x: curX + 4,
          y: textY,
          size: 7.5,
          font: fontBold,
          color: MAROON,
        });
        curX += colWidths.regNo;

        // Name
        page.drawText(truncate(student.name || 'N/A', 22).toUpperCase(), {
          x: curX + 4,
          y: textY,
          size: 7.5,
          font: fontBold,
          color: DARK_SLATE,
        });
        curX += colWidths.name;

        // Class
        page.drawText(truncate(student.class_name || 'N/A', 6), {
          x: curX + 4,
          y: textY,
          size: 7.5,
          font: fontRegular,
          color: DARK_SLATE,
        });
        curX += colWidths.className;

        // Phone
        const rawPhone = student.phone || '';
        const isInvalid = !rawPhone || rawPhone.length !== 10;
        page.drawText(rawPhone || 'MISSING', {
          x: curX + 4,
          y: textY,
          size: 7.5,
          font: isInvalid ? fontBold : fontRegular,
          color: isInvalid ? RED : DARK_SLATE,
        });
        curX += colWidths.phone;

        // School
        page.drawText(truncate(student.school_or_college || 'N/A', 25).toUpperCase(), {
          x: curX + 4,
          y: textY,
          size: 7,
          font: fontRegular,
          color: DARK_SLATE,
        });
        curX += colWidths.school;

        // Status
        const st = student.whatsapp_status || 'NOT_SENT';
        const isDelivered = ['SENT', 'DELIVERED', 'READ', 'OPENED'].includes(st);
        page.drawText(isDelivered ? 'SENT' : (st === 'FAILED' ? 'FAILED' : 'PENDING'), {
          x: curX + 4,
          y: textY,
          size: 7,
          font: fontBold,
          color: isDelivered ? GREEN : (st === 'FAILED' ? RED : AMBER),
        });

        currentY -= ROW_HEIGHT;
      });

      // 5. Footer on Page
      page.drawLine({
        start: { x: MARGIN_X, y: MARGIN_BOTTOM + 12 },
        end: { x: MARGIN_X + CONTENT_WIDTH, y: MARGIN_BOTTOM + 12 },
        thickness: 0.5,
        color: BORDER_COLOR,
      });

      page.drawText(`Meena Shah Public School — Mind Spark 2026 Operations | Generated: 24/10/2026`, {
        x: MARGIN_X,
        y: MARGIN_BOTTOM,
        size: 7,
        font: fontRegular,
        color: TEXT_MUTED,
      });

      page.drawText(`Page ${pageIdx + 1} of ${totalPages}`, {
        x: MARGIN_X + CONTENT_WIDTH - 65,
        y: MARGIN_BOTTOM,
        size: 7,
        font: fontBold,
        color: TEXT_MUTED,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const cleanFileName = compName.replace(/[^A-Z0-9_-]/gi, '_') + '.pdf';
    const filePath = path.join(outDir, cleanFileName);
    fs.writeFileSync(filePath, pdfBytes);
    generatedFiles.push({ compName, count: students.length, fileName: cleanFileName, size: pdfBytes.length });
    console.log(`✓ Generated: ${cleanFileName} (${students.length} students, ${totalPages} pages)`);
  }

  // Generate Master Summary Index PDF
  console.log('\nGenerating Master Index PDF...');
  const indexDoc = await PDFDocument.create();
  const fontRegular = await indexDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await indexDoc.embedFont(StandardFonts.HelveticaBold);

  const indexPage = indexDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - 30;

  // Header
  indexPage.drawRectangle({
    x: MARGIN_X,
    y: currentY - 60,
    width: CONTENT_WIDTH,
    height: 65,
    color: MAROON,
  });
  indexPage.drawRectangle({
    x: MARGIN_X,
    y: currentY - 63,
    width: CONTENT_WIDTH,
    height: 3,
    color: GOLD,
  });

  indexPage.drawText('MEENA SHAH PUBLIC SCHOOL, GONDA', {
    x: MARGIN_X + 15,
    y: currentY - 22,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  indexPage.drawText('MIND SPARK 2026 — MASTER PROGRAMME-WISE ROSTER DIRECTORY', {
    x: MARGIN_X + 15,
    y: currentY - 40,
    size: 9.5,
    font: fontRegular,
    color: rgb(254 / 255, 243 / 255, 199 / 255),
  });

  indexPage.drawText(`Total Registrations: ${allStudents.length} Candidates | Total Programmes: ${compNames.length} | Date: 24-Oct-2026`, {
    x: MARGIN_X + 15,
    y: currentY - 54,
    size: 8,
    font: fontRegular,
    color: rgb(241 / 255, 245 / 255, 249 / 255),
  });

  currentY -= 85;

  // Table header
  indexPage.drawRectangle({
    x: MARGIN_X,
    y: currentY - 22,
    width: CONTENT_WIDTH,
    height: 22,
    color: DARK_SLATE,
  });

  indexPage.drawText('#', { x: MARGIN_X + 8, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  indexPage.drawText('PROGRAMME / COMPETITION NAME', { x: MARGIN_X + 35, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  indexPage.drawText('CANDIDATES', { x: MARGIN_X + 280, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  indexPage.drawText('SENT', { x: MARGIN_X + 360, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  indexPage.drawText('PENDING', { x: MARGIN_X + 415, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  indexPage.drawText('SEPARATE PDF FILE', { x: MARGIN_X + 470, y: currentY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });

  currentY -= 22;

  generatedFiles.forEach((f, idx) => {
    const students = competitionGroups[f.compName];
    const sent = students.filter(s => ['SENT', 'DELIVERED', 'READ', 'OPENED'].includes(s.whatsapp_status)).length;
    const pending = students.filter(s => !s.whatsapp_status || s.whatsapp_status === 'NOT_SENT').length;
    const rowBg = idx % 2 === 0 ? rgb(1, 1, 1) : LIGHT_ROW;

    indexPage.drawRectangle({
      x: MARGIN_X,
      y: currentY - 20,
      width: CONTENT_WIDTH,
      height: 20,
      color: rowBg,
      borderColor: BORDER_COLOR,
      borderWidth: 0.5,
    });

    const yPos = currentY - 14;
    indexPage.drawText(String(idx + 1), { x: MARGIN_X + 8, y: yPos, size: 7.5, font: fontRegular, color: TEXT_MUTED });
    indexPage.drawText(f.compName, { x: MARGIN_X + 35, y: yPos, size: 7.5, font: fontBold, color: MAROON });
    indexPage.drawText(String(f.count), { x: MARGIN_X + 295, y: yPos, size: 7.5, font: fontBold, color: DARK_SLATE });
    indexPage.drawText(String(sent), { x: MARGIN_X + 370, y: yPos, size: 7.5, font: fontRegular, color: GREEN });
    indexPage.drawText(String(pending), { x: MARGIN_X + 425, y: yPos, size: 7.5, font: fontRegular, color: pending > 0 ? AMBER : TEXT_MUTED });
    indexPage.drawText(f.fileName.length > 18 ? f.fileName.slice(0, 16) + '..' : f.fileName, { x: MARGIN_X + 470, y: yPos, size: 6.5, font: fontRegular, color: TEXT_MUTED });

    currentY -= 20;
  });

  const indexBytes = await indexDoc.save();
  fs.writeFileSync(path.join(outDir, '00_MASTER_PROGRAMME_INDEX.pdf'), indexBytes);
  console.log('✓ Generated: 00_MASTER_PROGRAMME_INDEX.pdf');

  console.log(`\n🎉 SUCCESS! All ${generatedFiles.length} Programme PDFs + Master Index generated in:`);
  console.log(outDir);
}

generateRosterPdfs();
