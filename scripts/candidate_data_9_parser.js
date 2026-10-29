const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// 1. Helpers for normalization
function normalizeDate(input) {
  if (input === null || input === undefined || input === '') return '';
  const num = typeof input === 'number' ? input : Number(String(input).trim());
  if (!isNaN(num) && num > 1000 && num < 100000) {
    const msSinceEpoch = Math.round((num - 25569) * 86400 * 1000);
    const d = new Date(msSinceEpoch);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  const str = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  return str;
}

function normalizePhone(input) {
  if (!input) return '';
  let str = String(input).trim().split('.')[0];
  let cleaned = str.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) cleaned = cleaned.slice(2);
  else if (cleaned.length === 11 && cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  return cleaned.slice(-10);
}

function normalizeText(input) {
  if (!input) return '';
  return String(input).replace(/\s+/g, ' ').trim();
}

function mapCanonicalEvent(rawEvent, sheetName, className) {
  const ev = String(rawEvent || '').trim().toUpperCase();
  const cls = String(className || '').trim().toUpperCase();

  if (!ev) {
    return { canonical: 'MISSING_EVENT', isHold: true, holdReason: 'HOLD (Missing or unconfirmed competition event in Candidate Data 9 - pending committee approval)' };
  }

  if (ev.includes('FANCY DRESS') || ev.includes('UNIQUE')) return { canonical: 'UNIQUE AND CREATIVE HANDMADE FANCY DRESS', isHold: false };
  if (ev.includes('COLOUR BY NUMBER') || ev.includes('COLOR BY NUMBER')) return { canonical: 'COLOUR BY NUMBER', isHold: false };
  if (ev.includes('JOIN THE DOTS') || ev.includes('JOINTS THE DOTS')) return { canonical: 'JOIN THE DOTS AND COLOUR', isHold: false };
  if (ev.includes('COMPLETE THE PICTURE') || ev.includes('COMPLETE THE DOTS')) return { canonical: 'COMPLETE THE PICTURE AND COLOUR', isHold: false };
  if (ev.includes('CLAY')) return { canonical: 'CLAY CHAMPS', isHold: false };
  if (ev.includes('DRESS TO IMPRESS') || ev.includes('DREES TO IMPRESS')) return { canonical: 'DRESS TO IMPRESS', isHold: false };
  if (ev.includes('PAINT') || ev.includes('PAIINT')) return { canonical: 'PAINT YOUR IMAGINATION', isHold: false };
  if (ev.includes('WRITING STAR') || ev.includes('WRITING  STAR')) return { canonical: 'WRITING STARS', isHold: false };
  if (ev.includes('BATTLE OF BRAIN') || ev.includes('BATTLLE') || ev.includes('BATTEL')) return { canonical: 'BATTLE OF BRAINS', isHold: false };
  if (ev.includes('POSTER ARTIST') || ev.includes('POST ARTIST')) return { canonical: 'POSTER ARTIST', isHold: false };
  if (ev.includes('FIRELESS')) return { canonical: 'FIRELESS COOKING', isHold: false };
  if (ev.includes('SCIENTIST') || ev.includes('SCEINTIST')) return { canonical: 'JUNIOR SCIENTIST', isHold: false };
  if (ev.includes('YOUNG INNOVATOR')) return { canonical: 'YOUNG INNOVATORS', isHold: false };
  if (ev.includes('WRITING QUEST')) return { canonical: 'WRITING QUEST', isHold: false };
  if (ev.includes('ESSAY')) return { canonical: 'ESSAY WRITING', isHold: false };
  if (ev.includes('QUIZ')) return { canonical: 'ONLINE QUIZ', isHold: false };

  return { canonical: ev, isHold: false };
}

function normalizeClass(rawClass, sheetName) {
  let cls = normalizeText(rawClass).toUpperCase();
  if (!cls) {
    if (sheetName.includes('NURSERY')) return 'NURSERY';
    if (sheetName.includes('LKG')) return 'LKG';
    if (sheetName.includes('UKG')) return 'UKG';
    if (sheetName.includes('Graduation')) return 'GRADUATION';
    const m = sheetName.match(/Class\s*(\d+)/i);
    if (m) return m[1];
  }
  if (cls.startsWith('CLASS ')) cls = cls.replace('CLASS ', '');
  if (cls.endsWith('TH') || cls.endsWith('ST') || cls.endsWith('ND') || cls.endsWith('RD')) {
    cls = cls.replace(/(TH|ST|ND|RD)$/, '');
  }
  return cls;
}

// Seating and Scheduling Engine Lookup for newly added students
function calculateStudentSchedule(comp, cls, candidateIndex) {
  const normComp = comp.toUpperCase();
  const normCls = cls.toUpperCase();

  if (normComp.includes('FANCY DRESS')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '10:30 AM',
      examTime: '11:00 AM ONWARDS',
      shiftBatch: 'ALL IN ONE',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS STAGE',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('COLOUR BY NUMBER')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '10:30 AM',
      examTime: '11:00 AM - 12:00 PM',
      shiftBatch: 'ALL IN ONE',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('JOIN THE DOTS')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '11:30 AM',
      examTime: '12:00 PM - 01:00 PM',
      shiftBatch: 'ALL IN ONE',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('COMPLETE THE PICTURE')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '12:30 PM',
      examTime: '01:00 PM - 02:00 PM',
      shiftBatch: 'ALL IN ONE',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('CLAY CHAMPS')) {
    const shiftNum = (candidateIndex % 4) + 1;
    const times = [
      { rep: '09:30 AM', exam: '10:00 AM - 11:00 AM (BATCH 1)' },
      { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM (BATCH 2)' },
      { rep: '11:30 AM', exam: '12:00 PM - 01:00 PM (BATCH 3)' },
      { rep: '12:30 PM', exam: '01:00 PM - 02:00 PM (BATCH 4)' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[shiftNum - 1].rep,
      examTime: times[shiftNum - 1].exam,
      shiftBatch: `BATCH ${shiftNum}`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS MUSIC ROOM',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('DRESS TO IMPRESS')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '11:30 AM',
      examTime: '12:00 PM ONWARDS',
      shiftBatch: 'ALL IN ONE',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS STAGE',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('PAINT YOUR IMAGINATION')) {
    const shiftNum = (candidateIndex % 4) + 1;
    const times = [
      { rep: '09:30 AM', exam: '10:00 AM - 11:00 AM (BATCH 1)' },
      { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM (BATCH 2)' },
      { rep: '11:30 AM', exam: '12:00 PM - 01:00 PM (BATCH 3)' },
      { rep: '12:30 PM', exam: '01:00 PM - 02:00 PM (BATCH 4)' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[shiftNum - 1].rep,
      examTime: times[shiftNum - 1].exam,
      shiftBatch: `BATCH ${shiftNum}`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS LIBRARY',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('WRITING STARS')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '12:30 PM',
      examTime: '01:00 PM - 02:00 PM',
      shiftBatch: 'ALL IN ONE',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('BATTLE OF BRAINS')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '10:30 AM',
      examTime: '11:00 AM - 12:00 PM',
      shiftBatch: 'ALL IN ONE',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('POSTER ARTIST')) {
    const shiftNum = (candidateIndex % 4) + 1;
    const times = [
      { rep: '09:30 AM', exam: '10:00 AM - 11:00 AM (BATCH 1)' },
      { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM (BATCH 2)' },
      { rep: '11:30 AM', exam: '12:00 PM - 01:00 PM (BATCH 3)' },
      { rep: '12:30 PM', exam: '01:00 PM - 02:00 PM (BATCH 4)' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[shiftNum - 1].rep,
      examTime: times[shiftNum - 1].exam,
      shiftBatch: `BATCH ${shiftNum}`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS LIBRARY',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('FIRELESS COOKING')) {
    const shiftNum = (candidateIndex % 5) + 1;
    const times = [
      { rep: '08:30 AM', exam: '09:00 AM - 10:00 AM (BATCH 1)' },
      { rep: '09:30 AM', exam: '10:00 AM - 11:00 AM (BATCH 2)' },
      { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM (BATCH 3)' },
      { rep: '11:30 AM', exam: '12:00 PM - 01:00 PM (BATCH 4)' },
      { rep: '01:30 PM', exam: '02:00 PM - 03:00 PM (BATCH 5)' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[shiftNum - 1].rep,
      examTime: times[shiftNum - 1].exam,
      shiftBatch: `BATCH ${shiftNum}`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'GROUND FLOOR (FRONT OF MUSIC ROOM)',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('JUNIOR SCIENTIST')) {
    const shiftNum = (candidateIndex % 9) + 1;
    const times = [
      { rep: '08:30 AM', exam: '09:00 AM - 10:00 AM (SHIFT 1)' },
      { rep: '09:30 AM', exam: '10:00 AM - 11:00 AM (SHIFT 2)' },
      { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM (SHIFT 3)' },
      { rep: '11:30 AM', exam: '12:00 PM - 01:00 PM (SHIFT 4)' },
      { rep: '01:30 PM', exam: '02:00 PM - 03:00 PM (SHIFT 5)' },
      { rep: '02:30 PM', exam: '03:00 PM - 04:00 PM (SHIFT 6)' },
      { rep: '03:30 PM', exam: '04:00 PM - 05:00 PM (SHIFT 7)' },
      { rep: '04:30 PM', exam: '05:00 PM - 06:00 PM (SHIFT 8)' },
      { rep: '05:30 PM', exam: '06:00 PM - 07:00 PM (SHIFT 9)' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[shiftNum - 1].rep,
      examTime: times[shiftNum - 1].exam,
      shiftBatch: `SHIFT ${shiftNum}`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS GROUND',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('YOUNG INNOVATORS')) {
    const shiftNum = (candidateIndex % 4) + 1;
    const times = [
      { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM (BATCH 1)' },
      { rep: '11:30 AM', exam: '12:00 PM - 01:00 PM (BATCH 2)' },
      { rep: '01:30 PM', exam: '02:00 PM - 03:00 PM (BATCH 3)' },
      { rep: '02:30 PM', exam: '03:00 PM - 04:00 PM (BATCH 4)' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[shiftNum - 1].rep,
      examTime: times[shiftNum - 1].exam,
      shiftBatch: `BATCH ${shiftNum}`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'VACANT ROOM 1st FLOOR',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('WRITING QUEST')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '03:30 PM',
      examTime: '04:00 PM - 05:00 PM',
      shiftBatch: 'ALL IN ONE',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS 1st FLOOR',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('ONLINE QUIZ')) {
    // Check if Graduation
    if (normCls.includes('GRAD') || normCls.includes('BBA') || normCls.includes('BCA') || normCls.includes('COLLEGE') || normCls.includes('DEGREE') || normCls.includes('BSC') || normCls.includes('BA') || normCls.includes('B COM')) {
      const batchNum = (candidateIndex % 4) + 1;
      const times = [
        { rep: '08:30 AM', exam: '09:00 AM - 10:00 AM (BATCH 1)' },
        { rep: '09:30 AM', exam: '10:00 AM - 11:00 AM (BATCH 2)' },
        { rep: '10:30 AM', exam: '11:00 AM - 12:00 PM (BATCH 3)' },
        { rep: '12:30 PM', exam: '01:00 PM - 02:00 PM (BATCH 4)' }
      ];
      return {
        examDate: '02 Nov 2026 (Monday)',
        reportingTime: times[batchNum - 1].rep,
        examTime: times[batchNum - 1].exam,
        shiftBatch: `BATCH ${batchNum}`,
        campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
        specificHall: 'MSITM LAB',
        admitStatus: 'ELIGIBLE & SCHEDULED',
        eligibilityNotes: 'Approved - Exam on 02 Nov | Compulsory Lucky Draw on 01 Nov 09:00 AM Sharp'
      };
    }
    // Check if 11-12
    if (['11', '12', '11TH', '12TH'].includes(normCls)) {
      const batchNum = (candidateIndex % 6) + 1;
      const times = [
        { rep: '08:00 AM', exam: '08:30 AM - 09:30 AM (BATCH 1)' },
        { rep: '09:00 AM', exam: '09:30 AM - 10:30 AM (BATCH 2)' },
        { rep: '10:00 AM', exam: '10:30 AM - 11:30 AM (BATCH 3)' },
        { rep: '11:00 AM', exam: '11:30 AM - 12:30 PM (BATCH 4)' },
        { rep: '01:30 PM', exam: '02:00 PM - 03:00 PM (BATCH 5)' },
        { rep: '02:30 PM', exam: '03:00 PM - 04:00 PM (BATCH 6)' }
      ];
      return {
        examDate: '01 Nov 2026 (Sunday)',
        reportingTime: times[batchNum - 1].rep,
        examTime: times[batchNum - 1].exam,
        shiftBatch: `BATCH ${batchNum}`,
        campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
        specificHall: 'MSITM LAB',
        admitStatus: 'ELIGIBLE & SCHEDULED',
        eligibilityNotes: 'Approved for official examination'
      };
    }
    // 9-10
    const batchNum = (candidateIndex % 5) + 1;
    const times = [
      { rep: '08:00 AM', exam: '08:30 AM - 09:30 AM (BATCH 1)' },
      { rep: '09:00 AM', exam: '09:30 AM - 10:30 AM (BATCH 2)' },
      { rep: '10:00 AM', exam: '10:30 AM - 11:30 AM (BATCH 3)' },
      { rep: '11:00 AM', exam: '11:30 AM - 12:30 PM (BATCH 4)' },
      { rep: '01:30 PM', exam: '02:00 PM - 03:00 PM (BATCH 5)' }
    ];
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: times[batchNum - 1].rep,
      examTime: times[batchNum - 1].exam,
      shiftBatch: `BATCH ${batchNum}`,
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSPS LAB',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved for official examination'
    };
  }
  if (normComp.includes('ESSAY')) {
    return {
      examDate: '01 Nov 2026 (Sunday)',
      reportingTime: '03:30 PM',
      examTime: '04:00 PM - 05:00 PM',
      shiftBatch: 'ALL BATCHES (LT-2, LT-3 & LT-4)',
      campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
      specificHall: 'MSITM LT-2, LT-3 & LT-4',
      admitStatus: 'ELIGIBLE & SCHEDULED',
      eligibilityNotes: 'Approved - Exam at 04:00 PM | Compulsory Lucky Draw on 01 Nov 09:00 AM Sharp'
    };
  }

  return {
    examDate: '01 Nov 2026 (Sunday)',
    reportingTime: '09:00 AM',
    examTime: 'SCHEDULE PENDING (ON HOLD)',
    shiftBatch: 'HOLD',
    campusVenue: 'MEENA SHAH PUBLIC SCHOOL',
    specificHall: 'ADMINISTRATION OFFICE',
    admitStatus: 'ON HOLD (SCHEDULE PENDING)',
    eligibilityNotes: 'HOLD (Missing or unconfirmed competition event - pending committee approval)'
  };
}

module.exports = {
  normalizeDate,
  normalizePhone,
  normalizeText,
  mapCanonicalEvent,
  normalizeClass,
  calculateStudentSchedule
};

