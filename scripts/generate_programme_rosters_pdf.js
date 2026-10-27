const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[k] = v;
  }
});

const outDir = path.resolve('Programme_Wise_Candidate_PDFs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Color Palette - Institutional High-Contrast Calling Palette
const MAROON = rgb(122 / 255, 12 / 255, 22 / 255);        // #7a0c16
const GOLD = rgb(217 / 255, 119 / 255, 6 / 255);          // #d97706
const DARK_SLATE = rgb(15 / 255, 23 / 255, 42 / 255);     // #0f172a (Deepest slate for maximum contrast)
const LIGHT_ROW = rgb(248 / 255, 250 / 255, 252 / 255);   // #f8fafc
const BORDER_COLOR = rgb(226 / 255, 232 / 255, 240 / 255); // #e2e8f0
const SECTION_BG = rgb(241 / 255, 245 / 255, 249 / 255);   // #f1f5f9
const TEXT_MUTED = rgb(100 / 255, 116 / 255, 139 / 255);  // #64748b
const GREEN = rgb(22 / 255, 101 / 255, 52 / 255);         // #166534
const RED = rgb(185 / 255, 28 / 255, 28 / 255);           // #b91c1c
const AMBER = rgb(180 / 255, 83 / 255, 9 / 255);          // #b45309

const PROGRAMME_GROUPS = {
  'UNIQUE AND CREATIVE HANDMADE FANCY DRESS': {
    groupName: 'Play Group',
    classes: ['PLAY GROUP'],
    categoryDesc: 'Play Group Category',
  },
  'COLOUR BY NUMBER': {
    groupName: 'Nursery Group',
    classes: ['NURSERY'],
    categoryDesc: 'Nursery Category',
  },
  'JOIN THE DOTS AND COLOUR': {
    groupName: 'LKG Group',
    classes: ['LKG'],
    categoryDesc: 'LKG Category',
  },
  'COMPLETE THE PICTURE AND COLOUR': {
    groupName: 'UKG Group',
    classes: ['UKG'],
    categoryDesc: 'UKG Category',
  },
  'CLAY CHAMPS': {
    groupName: 'Primary Group 1',
    classes: ['1'],
    categoryDesc: 'Class 1 Category',
  },
  'DRESS TO IMPRESS': {
    groupName: 'Primary Group 1',
    classes: ['1'],
    categoryDesc: 'Class 1 Category',
  },
  'PAINT YOUR IMAGINATION': {
    groupName: 'Primary Group 2-3',
    classes: ['2', '3'],
    categoryDesc: 'Class 2 & Class 3 Category',
  },
  'WRITING STARS': {
    groupName: 'Primary Group 2-3',
    classes: ['2', '3'],
    categoryDesc: 'Class 2 & Class 3 Category',
  },
  'BATTLE OF BRAINS': {
    groupName: 'Sub-Junior Group 4-5',
    classes: ['4', '5'],
    categoryDesc: 'Class 4 & Class 5 Category',
  },
  'POSTER ARTIST': {
    groupName: 'Sub-Junior Group 4-5',
    classes: ['4', '5'],
    categoryDesc: 'Class 4 & Class 5 Category',
  },
  'FIRELESS COOKING': {
    groupName: 'Junior Group 6-8',
    classes: ['6', '7', '8'],
    categoryDesc: 'Class 6, 7 & 8 Category',
  },
  'JUNIOR SCIENTIST': {
    groupName: 'Junior Group 6-8',
    classes: ['6', '7', '8'],
    categoryDesc: 'Class 6, 7 & 8 Category',
  },
  'YOUNG INNOVATORS': {
    groupName: 'Secondary Group 9-10',
    classes: ['9', '10'],
    categoryDesc: 'Class 9 & 10 Category',
  },
  'WRITING QUEST': {
    groupName: 'Senior Secondary Group 11-12',
    classes: ['11', '12'],
    categoryDesc: 'Class 11 & 12 Category',
  },
  'ESSAY WRITING': {
    groupName: 'Higher Education / College Group',
    classes: ['GRADUATION'],
    categoryDesc: 'Graduation / Degree Category',
  },
  'ONLINE QUIZ': {
    groupName: 'Senior & Graduation Combined Group',
    classes: ['9', '10', '11', '12', 'GRADUATION'],
    categoryDesc: 'Class 9 to 12 & Graduation Categories',
  },
  'MISSING_EVENT': {
    groupName: 'Unassigned / Review Required',
    classes: ['N/A'],
    categoryDesc: 'Unassigned Category',
  }
};

function normalizeClassName(raw) {
  if (!raw) return 'N/A';
  const s = String(raw).trim().toUpperCase();
  if (s === 'PLAY' || s === 'PLAY GROUP' || s === 'PLAYGROUP') return 'PLAY';
  if (s === 'NUR' || s === 'NURSARY' || s === 'NURSERY') return 'NURSERY';
  if (s === 'LKG') return 'LKG';
  if (s === 'UKG') return 'UKG';
  if (s === 'CLASS 1' || s === '1') return '1';
  if (s === 'CLASS 2' || s === '2') return '2';
  if (s === 'CLASS 3' || s === '3') return '3';
  if (s === 'CLASS 4' || s === '4') return '4';
  if (s === 'CLASS 5' || s === '5') return '5';
  if (s === 'CLASS 6' || s === '6') return '6';
  if (s === 'CLASS 7' || s === '7') return '7';
  if (s === 'CLASS 8' || s === '8') return '8';
  if (s === 'CLASS 9' || s === '9') return '9';
  if (s === 'CLASS 10' || s === '10') return '10';
  if (s === 'CLASS 11' || s === '11') return '11';
  if (s === 'CLASS 12' || s === '12') return '12';
  if (s === 'GRADUATION' || s === 'GRADUTION' || s === 'BBA' || s === 'BCA' || s.includes('GRAD')) return 'GRAD.';
  return s;
}

function getClassOrderRank(className) {
  const norm = normalizeClassName(className);
  const ranks = {
    'PLAY': 1,
    'NURSERY': 2,
    'LKG': 3,
    'UKG': 4,
    '1': 5,
    '2': 6,
    '3': 7,
    '4': 8,
    '5': 9,
    '6': 10,
    '7': 11,
    '8': 12,
    '9': 13,
    '10': 14,
    '11': 15,
    '12': 16,
    'GRAD.': 17,
    'N/A': 99
  };
  return ranks[norm] || 50;
}

// Format phone for rapid dialling: "98765 43210"
function formatCallingPhone(raw) {
  if (!raw) return { text: 'MISSING', isInvalid: true };
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10 && digits !== '0000000000') {
    return { text: `${digits.slice(0, 5)} ${digits.slice(5)}`, isInvalid: false };
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const d10 = digits.slice(2);
    return { text: `${d10.slice(0, 5)} ${d10.slice(5)}`, isInvalid: false };
  }
  return { text: digits || 'MISSING', isInvalid: true };
}

// WinAnsi safe text converter
function safeText(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2022\u25b6\u25ba]/g, '>')
    .replace(/[^\x20-\x7E]/g, ' ')
    .trim();
}

// Truncate helper
const truncate = (str, maxLen) => {
  const safe = safeText(str);
  if (!safe) return '';
  return safe.length > maxLen ? safe.slice(0, maxLen - 2) + '..' : safe;
};

async function generateAllUpdatedRosters() {
  console.log('=== Mind Spark 2026 - Large Font Calling Roster Generation ===');
  console.log('Connecting to Supabase...');
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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

  // Filter out MS26TEST candidates so official count is exactly 2,885
  const officialStudents = allStudents.filter(s => !(s.registration_number || '').startsWith('MS26TEST'));
  console.log(`Fetched ${allStudents.length} total students. Official registered candidates: ${officialStudents.length}.`);

  // Group by Competition
  const competitionGroups = {};
  for (const s of officialStudents) {
    const rawComp = (s.competition_name || 'UNASSIGNED').trim().toUpperCase();
    if (!competitionGroups[rawComp]) {
      competitionGroups[rawComp] = [];
    }
    competitionGroups[rawComp].push(s);
  }

  const compNames = Object.keys(competitionGroups).sort();
  console.log(`Found ${compNames.length} Programmes. Generating calling-optimized PDFs...`);

  const PAGE_WIDTH = 595.28;   // A4 Portrait
  const PAGE_HEIGHT = 841.89;
  const MARGIN_X = 25;
  const MARGIN_BOTTOM = 35;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 545.28

  // Optimized Calling Table Column Widths (Sum = 545.28)
  const colWidths = {
    sno: 22,
    regNo: 68,
    name: 148,
    className: 38,
    phone: 86,
    school: 128,
    status: 55.28,
  };

  const generatedFiles = [];

  for (const compName of compNames) {
    const students = competitionGroups[compName];
    const meta = PROGRAMME_GROUPS[compName] || { groupName: 'General', categoryDesc: 'All Classes' };

    // Sort Class-wise first, then Registration Number
    students.sort((a, b) => {
      const rA = getClassOrderRank(a.class_name);
      const rB = getClassOrderRank(b.class_name);
      if (rA !== rB) return rA - rB;
      return (a.registration_number || '').localeCompare(b.registration_number || '');
    });

    // Compute Class Breakdown Summary
    const classCounts = {};
    for (const s of students) {
      const cl = normalizeClassName(s.class_name);
      classCounts[cl] = (classCounts[cl] || 0) + 1;
    }
    const classSummaryStr = Object.entries(classCounts).map(([cl, cnt]) => `Class ${cl}: ${cnt}`).join('  |  ');

    // Build flow items with 25pt row height for calling legibility
    const flowItems = [];
    let currentClassRank = null;
    let globalIndex = 1;

    for (const student of students) {
      const rank = getClassOrderRank(student.class_name);
      const normCl = normalizeClassName(student.class_name);

      if (rank !== currentClassRank) {
        currentClassRank = rank;
        const countInThisClass = classCounts[normCl] || 0;
        flowItems.push({
          type: 'CLASS_HEADER',
          height: 20, // 20pt for class header
          title: `>> CLASS: ${normCl}  |  ${countInThisClass} REGISTERED CANDIDATE${countInThisClass > 1 ? 'S' : ''}`,
        });
      }

      flowItems.push({
        type: 'STUDENT_ROW',
        height: 25, // 25pt row height for large font & dialling ease
        sno: globalIndex++,
        student: student,
        normClass: normCl,
      });
    }

    // Paginate flow items
    const MAX_PAGE_HEIGHT = 605; // leaves comfortable room for margins and footer
    const pagesItems = [];
    let curPage = [];
    let curHeight = 0;

    for (const item of flowItems) {
      if (curHeight + item.height > MAX_PAGE_HEIGHT && curPage.length > 0) {
        pagesItems.push(curPage);
        curPage = [];
        curHeight = 0;
      }
      curPage.push(item);
      curHeight += item.height;
    }
    if (curPage.length > 0) {
      pagesItems.push(curPage);
    }

    const totalPages = pagesItems.length || 1;

    // Create PDF Document
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const sentCount = students.filter(s => ['SENT', 'DELIVERED', 'READ', 'OPENED'].includes(s.whatsapp_status)).length;
    const pendingCount = students.filter(s => !s.whatsapp_status || s.whatsapp_status === 'NOT_SENT').length;
    const failedCount = students.filter(s => s.whatsapp_status === 'FAILED').length;

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const itemsOnThisPage = pagesItems[pageIdx] || [];

      let currentY = PAGE_HEIGHT - 22;

      // 1. Institutional Header Banner
      page.drawRectangle({
        x: MARGIN_X,
        y: currentY - 52,
        width: CONTENT_WIDTH,
        height: 52,
        color: MAROON,
      });

      // Gold Accent line at bottom of header
      page.drawRectangle({
        x: MARGIN_X,
        y: currentY - 55,
        width: CONTENT_WIDTH,
        height: 3,
        color: GOLD,
      });

      page.drawText(safeText('MEENA SHAH PUBLIC SCHOOL, GONDA'), {
        x: MARGIN_X + 15,
        y: currentY - 18,
        size: 13,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText(safeText('MIND SPARK 2026 - OFFICIAL CALLING & VERIFICATION ROSTER'), {
        x: MARGIN_X + 15,
        y: currentY - 32,
        size: 9,
        font: fontRegular,
        color: rgb(254 / 255, 243 / 255, 199 / 255), // light amber
      });

      page.drawText(safeText('Session: 2026-27 | Authoritative Record | Date: 26-Oct-2026'), {
        x: MARGIN_X + 15,
        y: currentY - 45,
        size: 7.5,
        font: fontRegular,
        color: rgb(241 / 255, 245 / 255, 249 / 255),
      });

      currentY -= 61;

      // 2. Programme & Group Info Box
      const INFO_BOX_HEIGHT = 44;
      page.drawRectangle({
        x: MARGIN_X,
        y: currentY - INFO_BOX_HEIGHT,
        width: CONTENT_WIDTH,
        height: INFO_BOX_HEIGHT,
        color: rgb(248 / 255, 250 / 255, 252 / 255),
        borderColor: rgb(203 / 255, 213 / 255, 225 / 255),
        borderWidth: 1,
      });

      // Line 1: Programme Name & Group Name
      page.drawText(safeText(`PROGRAMME: ${compName}   |   GROUP: ${meta.groupName.toUpperCase()}`), {
        x: MARGIN_X + 10,
        y: currentY - 14,
        size: 9.5,
        font: fontBold,
        color: MAROON,
      });

      // Line 2: Eligible Classes & Breakdown
      page.drawText(safeText(`ELIGIBLE: ${meta.categoryDesc}   |   CLASS BREAKDOWN: ${truncate(classSummaryStr, 76)}`), {
        x: MARGIN_X + 10,
        y: currentY - 26,
        size: 7.5,
        font: fontRegular,
        color: DARK_SLATE,
      });

      // Line 3: Statistics & Page info
      page.drawText(safeText(`Total Candidates: ${students.length}   |   Sent: ${sentCount}   |   Pending: ${pendingCount}   |   Failed: ${failedCount}   |   Page ${pageIdx + 1} of ${totalPages}`), {
        x: MARGIN_X + 10,
        y: currentY - 38,
        size: 7.5,
        font: fontRegular,
        color: TEXT_MUTED,
      });

      currentY -= INFO_BOX_HEIGHT + 6;

      // 3. Table Column Header (Height: 22pt)
      const TABLE_HDR_HEIGHT = 22;
      page.drawRectangle({
        x: MARGIN_X,
        y: currentY - TABLE_HDR_HEIGHT,
        width: CONTENT_WIDTH,
        height: TABLE_HDR_HEIGHT,
        color: DARK_SLATE,
      });

      let colX = MARGIN_X;
      const headerTextY = currentY - 15;

      const drawHeaderCell = (text, width) => {
        page.drawText(safeText(text), {
          x: colX + 4,
          y: headerTextY,
          size: 8.5,
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

      currentY -= TABLE_HDR_HEIGHT;

      // 4. Render Items on This Page (Height: 25pt for Student Row)
      itemsOnThisPage.forEach((item, rIdx) => {
        if (item.type === 'CLASS_HEADER') {
          page.drawRectangle({
            x: MARGIN_X,
            y: currentY - item.height,
            width: CONTENT_WIDTH,
            height: item.height,
            color: SECTION_BG,
            borderColor: BORDER_COLOR,
            borderWidth: 0.5,
          });

          page.drawRectangle({
            x: MARGIN_X,
            y: currentY - item.height,
            width: 4,
            height: item.height,
            color: MAROON,
          });

          page.drawText(safeText(item.title), {
            x: MARGIN_X + 12,
            y: currentY - 14,
            size: 9,
            font: fontBold,
            color: MAROON,
          });

          currentY -= item.height;
        } else if (item.type === 'STUDENT_ROW') {
          const student = item.student;
          const rowBg = rIdx % 2 === 0 ? rgb(1, 1, 1) : LIGHT_ROW;

          page.drawRectangle({
            x: MARGIN_X,
            y: currentY - item.height,
            width: CONTENT_WIDTH,
            height: item.height,
            color: rowBg,
            borderColor: BORDER_COLOR,
            borderWidth: 0.5,
          });

          let curX = MARGIN_X;
          // Vertically centered baseline for 25pt row
          const textY = currentY - 16.5;

          // S.No (8.5pt Regular)
          page.drawText(safeText(String(item.sno)), {
            x: curX + 3,
            y: textY,
            size: 8.5,
            font: fontRegular,
            color: TEXT_MUTED,
          });
          curX += colWidths.sno;

          // Reg No (8.5pt Bold Maroon)
          page.drawText(safeText(student.registration_number || 'N/A'), {
            x: curX + 3,
            y: textY,
            size: 8.5,
            font: fontBold,
            color: MAROON,
          });
          curX += colWidths.regNo;

          // Candidate Name (9.5pt BOLD Dark Slate - Prominent!)
          page.drawText(truncate(student.name || 'N/A', 24).toUpperCase(), {
            x: curX + 3,
            y: textY,
            size: 9.5,
            font: fontBold,
            color: DARK_SLATE,
          });
          curX += colWidths.name;

          // Class (8.5pt Bold)
          page.drawText(truncate(item.normClass, 6), {
            x: curX + 4,
            y: textY,
            size: 8.5,
            font: fontBold,
            color: DARK_SLATE,
          });
          curX += colWidths.className;

          // Mobile No (10pt BOLD with space formatting "98765 43210" for calling!)
          const phoneInfo = formatCallingPhone(student.phone);
          page.drawText(phoneInfo.text, {
            x: curX + 4,
            y: textY,
            size: 10,
            font: fontBold,
            color: phoneInfo.isInvalid ? RED : DARK_SLATE,
          });
          curX += colWidths.phone;

          // School / College (8pt Regular)
          page.drawText(truncate(student.school_or_college || 'N/A', 22).toUpperCase(), {
            x: curX + 3,
            y: textY,
            size: 8,
            font: fontRegular,
            color: DARK_SLATE,
          });
          curX += colWidths.school;

          // Status Badge (8pt Bold)
          const st = student.whatsapp_status || 'NOT_SENT';
          const isDelivered = ['SENT', 'DELIVERED', 'READ', 'OPENED'].includes(st);
          page.drawText(safeText(isDelivered ? 'SENT' : (st === 'FAILED' ? 'FAILED' : 'PENDING')), {
            x: curX + 4,
            y: textY,
            size: 8,
            font: fontBold,
            color: isDelivered ? GREEN : (st === 'FAILED' ? RED : AMBER),
          });

          currentY -= item.height;
        }
      });

      // 5. Page Footer
      page.drawLine({
        start: { x: MARGIN_X, y: MARGIN_BOTTOM + 12 },
        end: { x: MARGIN_X + CONTENT_WIDTH, y: MARGIN_BOTTOM + 12 },
        thickness: 0.5,
        color: BORDER_COLOR,
      });

      page.drawText(safeText('Meena Shah Public School - Mind Spark 2026 Operations | Official Calling Registry | Updated: 26/10/2026'), {
        x: MARGIN_X,
        y: MARGIN_BOTTOM,
        size: 7.5,
        font: fontRegular,
        color: TEXT_MUTED,
      });

      page.drawText(safeText(`Page ${pageIdx + 1} of ${totalPages}`), {
        x: MARGIN_X + CONTENT_WIDTH - 65,
        y: MARGIN_BOTTOM,
        size: 7.5,
        font: fontBold,
        color: TEXT_MUTED,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const cleanFileName = compName.replace(/[^A-Z0-9_-]/gi, '_') + '.pdf';
    const filePath = path.join(outDir, cleanFileName);
    fs.writeFileSync(filePath, pdfBytes);
    generatedFiles.push({
      compName,
      groupName: meta.groupName,
      categoryDesc: meta.categoryDesc,
      count: students.length,
      sentCount,
      pendingCount,
      failedCount,
      totalPages,
      fileName: cleanFileName,
      size: pdfBytes.length,
    });
    console.log(`✓ Generated: ${cleanFileName.padEnd(45)} | ${students.length} students | ${totalPages} pages`);
  }

  // ==========================================
  // Generate Master Summary Index PDF
  // ==========================================
  console.log('\nGenerating 00_MASTER_PROGRAMME_INDEX.pdf...');
  const indexDoc = await PDFDocument.create();
  const fontRegular = await indexDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await indexDoc.embedFont(StandardFonts.HelveticaBold);

  const indexPage = indexDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - 22;

  // Header
  indexPage.drawRectangle({
    x: MARGIN_X,
    y: currentY - 56,
    width: CONTENT_WIDTH,
    height: 56,
    color: MAROON,
  });
  indexPage.drawRectangle({
    x: MARGIN_X,
    y: currentY - 59,
    width: CONTENT_WIDTH,
    height: 3,
    color: GOLD,
  });

  indexPage.drawText(safeText('MEENA SHAH PUBLIC SCHOOL, GONDA'), {
    x: MARGIN_X + 15,
    y: currentY - 20,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  indexPage.drawText(safeText('MIND SPARK 2026 - MASTER PROGRAMME-WISE DIRECTORY (CALLING ROSTER)'), {
    x: MARGIN_X + 15,
    y: currentY - 36,
    size: 9.5,
    font: fontRegular,
    color: rgb(254 / 255, 243 / 255, 199 / 255),
  });

  const totalRegistered = officialStudents.length;
  const totalSent = officialStudents.filter(s => ['SENT', 'DELIVERED', 'READ', 'OPENED'].includes(s.whatsapp_status)).length;
  const totalPending = officialStudents.filter(s => !s.whatsapp_status || s.whatsapp_status === 'NOT_SENT').length;

  indexPage.drawText(safeText(`Total Candidates: ${totalRegistered} | Total Programmes: ${compNames.length} | Session: 2026-27 | Date: 26-Oct-2026`), {
    x: MARGIN_X + 15,
    y: currentY - 49,
    size: 8,
    font: fontRegular,
    color: rgb(241 / 255, 245 / 255, 249 / 255),
  });

  currentY -= 73;

  // Table header
  const idxColWidths = {
    sno: 25,
    compName: 165,
    group: 135,
    candidates: 60,
    sent: 45,
    pending: 45,
    file: 70.28,
  };

  indexPage.drawRectangle({
    x: MARGIN_X,
    y: currentY - 22,
    width: CONTENT_WIDTH,
    height: 22,
    color: DARK_SLATE,
  });

  let curX = MARGIN_X;
  const hdrY = currentY - 15;

  const drawIdxHdrCell = (text, w) => {
    indexPage.drawText(safeText(text), { x: curX + 4, y: hdrY, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    curX += w;
  };

  drawIdxHdrCell('#', idxColWidths.sno);
  drawIdxHdrCell('PROGRAMME / COMPETITION', idxColWidths.compName);
  drawIdxHdrCell('GROUP / ELIGIBLE CLASSES', idxColWidths.group);
  drawIdxHdrCell('CANDIDATES', idxColWidths.candidates);
  drawIdxHdrCell('SENT', idxColWidths.sent);
  drawIdxHdrCell('PENDING', idxColWidths.pending);
  drawIdxHdrCell('ROSTER FILE', idxColWidths.file);

  currentY -= 22;

  // Rows (Height: 20pt for Index)
  const ROW_H = 20;
  generatedFiles.forEach((f, idx) => {
    const rowBg = idx % 2 === 0 ? rgb(1, 1, 1) : LIGHT_ROW;

    indexPage.drawRectangle({
      x: MARGIN_X,
      y: currentY - ROW_H,
      width: CONTENT_WIDTH,
      height: ROW_H,
      color: rowBg,
      borderColor: BORDER_COLOR,
      borderWidth: 0.5,
    });

    let cellX = MARGIN_X;
    const yPos = currentY - 14;

    indexPage.drawText(safeText(String(idx + 1)), { x: cellX + 5, y: yPos, size: 8, font: fontRegular, color: TEXT_MUTED });
    cellX += idxColWidths.sno;

    indexPage.drawText(truncate(f.compName, 26), { x: cellX + 4, y: yPos, size: 8, font: fontBold, color: MAROON });
    cellX += idxColWidths.compName;

    indexPage.drawText(truncate(f.groupName, 22), { x: cellX + 4, y: yPos, size: 8, font: fontRegular, color: DARK_SLATE });
    cellX += idxColWidths.group;

    indexPage.drawText(safeText(String(f.count)), { x: cellX + 8, y: yPos, size: 8, font: fontBold, color: DARK_SLATE });
    cellX += idxColWidths.candidates;

    indexPage.drawText(safeText(String(f.sentCount)), { x: cellX + 8, y: yPos, size: 8, font: fontRegular, color: GREEN });
    cellX += idxColWidths.sent;

    indexPage.drawText(safeText(String(f.pendingCount)), { x: cellX + 8, y: yPos, size: 8, font: fontRegular, color: f.pendingCount > 0 ? AMBER : TEXT_MUTED });
    cellX += idxColWidths.pending;

    indexPage.drawText(truncate(f.fileName, 14), { x: cellX + 4, y: yPos, size: 7.5, font: fontRegular, color: TEXT_MUTED });

    currentY -= ROW_H;
  });

  // Total Summary Row
  indexPage.drawRectangle({
    x: MARGIN_X,
    y: currentY - 24,
    width: CONTENT_WIDTH,
    height: 24,
    color: rgb(241 / 255, 245 / 255, 249 / 255),
    borderColor: DARK_SLATE,
    borderWidth: 1,
  });

  indexPage.drawText(safeText('TOTAL OFFICIAL REGISTERED CANDIDATES'), {
    x: MARGIN_X + 10,
    y: currentY - 16,
    size: 8.5,
    font: fontBold,
    color: DARK_SLATE,
  });

  indexPage.drawText(safeText(String(totalRegistered)), {
    x: MARGIN_X + idxColWidths.sno + idxColWidths.compName + idxColWidths.group + 8,
    y: currentY - 16,
    size: 9,
    font: fontBold,
    color: MAROON,
  });

  indexPage.drawText(safeText(String(totalSent)), {
    x: MARGIN_X + idxColWidths.sno + idxColWidths.compName + idxColWidths.group + idxColWidths.candidates + 8,
    y: currentY - 16,
    size: 9,
    font: fontBold,
    color: GREEN,
  });

  indexPage.drawText(safeText(String(totalPending)), {
    x: MARGIN_X + idxColWidths.sno + idxColWidths.compName + idxColWidths.group + idxColWidths.candidates + idxColWidths.sent + 8,
    y: currentY - 16,
    size: 9,
    font: fontBold,
    color: AMBER,
  });

  currentY -= 35;

  indexPage.drawLine({
    start: { x: MARGIN_X, y: MARGIN_BOTTOM + 12 },
    end: { x: MARGIN_X + CONTENT_WIDTH, y: MARGIN_BOTTOM + 12 },
    thickness: 0.5,
    color: BORDER_COLOR,
  });

  indexPage.drawText(safeText('Meena Shah Public School - Mind Spark 2026 Operations | Directory Index | Updated: 26/10/2026'), {
    x: MARGIN_X,
    y: MARGIN_BOTTOM,
    size: 7.5,
    font: fontRegular,
    color: TEXT_MUTED,
  });

  const indexBytes = await indexDoc.save();
  fs.writeFileSync(path.join(outDir, '00_MASTER_PROGRAMME_INDEX.pdf'), indexBytes);
  console.log('✓ Generated: 00_MASTER_PROGRAMME_INDEX.pdf');

  // ==========================================
  // Generate Consolidated All-in-One Master PDF
  // ==========================================
  console.log('\nMerging into Consolidated Master Roster PDF (00_COMPLETE_ALL_STUDENTS_MASTER_ROSTER.pdf)...');
  const masterDoc = await PDFDocument.create();

  const [copiedIndexPage] = await masterDoc.copyPages(indexDoc, [0]);
  masterDoc.addPage(copiedIndexPage);

  for (const f of generatedFiles) {
    const filePath = path.join(outDir, f.fileName);
    const pdfBytes = fs.readFileSync(filePath);
    const subDoc = await PDFDocument.load(pdfBytes);
    const pageIndices = subDoc.getPageIndices();
    const copiedPages = await masterDoc.copyPages(subDoc, pageIndices);
    copiedPages.forEach(p => masterDoc.addPage(p));
  }

  const masterBytes = await masterDoc.save();
  const masterPath = path.join(outDir, '00_COMPLETE_ALL_STUDENTS_MASTER_ROSTER.pdf');
  fs.writeFileSync(masterPath, masterBytes);
  console.log(`✓ Generated: 00_COMPLETE_ALL_STUDENTS_MASTER_ROSTER.pdf (${masterDoc.getPageCount()} pages, ${(masterBytes.length / 1024 / 1024).toFixed(2)} MB)`);

  console.log('\n========================================================');
  console.log(`SUCCESS! All ${generatedFiles.length} Programme PDFs + Master Index + Master Combined PDF generated in:`);
  console.log(outDir);
  console.log(`Total Candidates Processed: ${totalRegistered}`);
  console.log('========================================================\n');
}

generateAllUpdatedRosters();
