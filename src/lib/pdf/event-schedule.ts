
export interface EventScheduleDetail {
  eventName: string;
  className: string;
  examDate?: string;
  rawTiming: string;
  reportingTime: string;
  examTime: string;
  venueMain: string;
  venueDetail: string;
  batchInfo: string;
  incharges: string;
  isHold: boolean;
  holdReason?: string;
  candidateRank?: number;
  luckyDrawNotice?: string;
}

// Canonical schedule rules extracted directly from Events Deatails.xlsx
export const EVENT_SCHEDULE_RULES: Record<string, any> = {
  FANCY_DRESS: {
    eventTitle: 'Unique & Creative Handmade Fancy Dress',
    classMatch: 'PLAY GROUP',
    timing: '11:00 AM ONWARDS',
    reportingTime: '10:30 AM',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS STAGE',
    batchMode: 'ALL_IN_ONE',
    capacity: 100,
    isHold: false
  },
  COLOUR_BY_NUMBER: {
    eventTitle: 'Colour by Number',
    classMatch: 'NURSERY',
    timing: '11:00 AM - 12:00 PM',
    reportingTime: '10:30 AM',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS 1st FLOOR',
    batchMode: 'ALL_IN_ONE',
    capacity: 200,
    isHold: false
  },
  JOIN_THE_DOTS: {
    eventTitle: 'Join the Dots & Colour',
    classMatch: 'LKG',
    timing: '12:00 PM - 01:00 PM',
    reportingTime: '11:30 AM',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS 1st FLOOR',
    batchMode: 'ALL_IN_ONE',
    capacity: 250,
    isHold: false
  },
  COMPLETE_THE_PICTURE: {
    eventTitle: 'Complete the Picture & Colour',
    classMatch: 'UKG',
    timing: '01:00 PM - 02:00 PM',
    reportingTime: '12:30 PM',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS 1st FLOOR',
    batchMode: 'ALL_IN_ONE',
    capacity: 200,
    isHold: false
  },
  CLAY_CHAMPS: {
    eventTitle: 'Clay Champs',
    classMatch: 'CLASS 1',
    timing: '10:00 AM - 02:00 PM',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS MUSIC ROOM',
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '09:30 AM', exam: '10:00 AM - 11:00 AM (BATCH 1)' },
      { shiftNum: 2, reporting: '10:30 AM', exam: '11:00 AM - 12:00 PM (BATCH 2)' },
      { shiftNum: 3, reporting: '11:30 AM', exam: '12:00 PM - 01:00 PM (BATCH 3)' },
      { shiftNum: 4, reporting: '12:30 PM', exam: '01:00 PM - 02:00 PM (BATCH 4)' }
    ],
    shiftCapacity: 50,
    isHold: false
  },
  DRESS_TO_IMPRESS: {
    eventTitle: 'Dress to Impress',
    classMatch: 'CLASS 1',
    timing: '12:00 PM ONWARDS',
    reportingTime: '11:30 AM',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS STAGE',
    batchMode: 'ALL_IN_ONE',
    capacity: 100,
    isHold: false
  },
  PAINT_YOUR_IMAGINATION: {
    eventTitle: 'Paint Your Imagination',
    classMatch: 'CLASSES 2 & 3',
    timing: '10:00 AM ONWARDS',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS LIBRARY',
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '09:30 AM', exam: '10:00 AM - 11:00 AM (BATCH 1)' },
      { shiftNum: 2, reporting: '11:00 AM', exam: '11:30 AM - 12:30 PM (BATCH 2)' }
    ],
    shiftCapacity: 200,
    isHold: false
  },
  WRITING_STARS: {
    eventTitle: 'Writing Stars',
    classMatch: 'CLASSES 2 & 3',
    timing: '03:00 PM - 04:00 PM',
    reportingTime: '02:30 PM',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS 1st FLOOR',
    batchMode: 'ALL_IN_ONE',
    capacity: 250,
    isHold: false
  },
  BATTLE_OF_BRAINS: {
    eventTitle: 'Battle of Brains',
    classMatch: 'CLASSES 4 & 5',
    timing: '02:00 PM - 03:00 PM',
    reportingTime: '01:30 PM',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS 1st FLOOR',
    batchMode: 'ALL_IN_ONE',
    capacity: 300,
    isHold: false
  },
  POSTER_ARTIST: {
    eventTitle: 'Poster Artist',
    classMatch: 'CLASSES 4 & 5',
    timing: '02:30 PM ONWARDS',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS LIBRARY',
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '02:00 PM', exam: '02:30 PM - 03:30 PM (BATCH 1)' },
      { shiftNum: 2, reporting: '03:30 PM', exam: '04:00 PM - 05:00 PM (BATCH 2)' }
    ],
    shiftCapacity: 200,
    isHold: false
  },
  JUNIOR_SCIENTIST: {
    eventTitle: 'Junior Scientist',
    classMatch: 'CLASSES 6 & 8',
    timing: '09:00 AM ONWARDS',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS GROUND',
    examDate: '01 Nov 2026 (Sunday)',
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '08:30 AM', exam: '09:00 AM - 10:00 AM (SHIFT 1)' },
      { shiftNum: 2, reporting: '09:30 AM', exam: '10:00 AM - 11:00 AM (SHIFT 2)' },
      { shiftNum: 3, reporting: '10:30 AM', exam: '11:00 AM - 12:00 PM (SHIFT 3)' },
      { shiftNum: 4, reporting: '11:30 AM', exam: '12:00 PM - 01:00 PM (SHIFT 4)' },
      // Strict 1:00 PM - 2:00 PM Lunch Break
      { shiftNum: 5, reporting: '01:30 PM', exam: '02:00 PM - 03:00 PM (SHIFT 5)' },
      { shiftNum: 6, reporting: '02:30 PM', exam: '03:00 PM - 04:00 PM (SHIFT 6)' },
      { shiftNum: 7, reporting: '03:30 PM', exam: '04:00 PM - 05:00 PM (SHIFT 7)' },
      { shiftNum: 8, reporting: '04:30 PM', exam: '05:00 PM - 06:00 PM (SHIFT 8)' },
      { shiftNum: 9, reporting: '05:30 PM', exam: '06:00 PM - 07:00 PM (SHIFT 9)' },
    ],
    shiftCapacity: 50,
    isHold: false
  },
  FIRELESS_COOKING: {
    eventTitle: 'Fireless Cooking',
    classMatch: 'CLASSES 6 & 8',
    timing: '09:00 AM ONWARDS (FULL DAY)',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'GROUND FLOOR (FRONT OF MUSIC ROOM)',
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '08:30 AM', exam: '09:00 AM - 10:00 AM (BATCH 1)' },
      { shiftNum: 2, reporting: '09:30 AM', exam: '10:00 AM - 11:00 AM (BATCH 2)' },
      { shiftNum: 3, reporting: '10:30 AM', exam: '11:00 AM - 12:00 PM (BATCH 3)' },
      { shiftNum: 4, reporting: '11:30 AM', exam: '12:00 PM - 01:00 PM (BATCH 4)' },
      // Strict 1:00 PM - 2:00 PM Lunch Break
      { shiftNum: 5, reporting: '01:30 PM', exam: '02:00 PM - 03:00 PM (BATCH 5)' }
    ],
    shiftCapacity: 120,
    isHold: false
  },
  YOUNG_INNOVATORS: {
    eventTitle: 'Young Innovators',
    classMatch: 'CLASSES 9 & 10',
    timing: '11:00 AM ONWARDS',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'VACANT ROOM 1st FLOOR',
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '10:30 AM', exam: '11:00 AM - 12:00 PM (BATCH 1)' },
      { shiftNum: 2, reporting: '11:30 AM', exam: '12:00 PM - 01:00 PM (BATCH 2)' },
      // Strict 1:00 PM - 2:00 PM Lunch Break
      { shiftNum: 3, reporting: '01:30 PM', exam: '02:00 PM - 03:00 PM (BATCH 3)' },
      { shiftNum: 4, reporting: '02:30 PM', exam: '03:00 PM - 04:00 PM (BATCH 4)' }
    ],
    shiftCapacity: 40,
    isHold: false
  },
  ONLINE_QUIZ_9_10: {
    eventTitle: 'Online Quiz',
    classMatch: 'CLASSES 9 & 10',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS LAB',
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '08:00 AM', exam: '08:30 AM - 09:30 AM (BATCH 1)' },
      { shiftNum: 2, reporting: '09:00 AM', exam: '09:30 AM - 10:30 AM (BATCH 2)' },
      { shiftNum: 3, reporting: '10:00 AM', exam: '10:30 AM - 11:30 AM (BATCH 3)' },
      { shiftNum: 4, reporting: '11:00 AM', exam: '11:30 AM - 12:30 PM (BATCH 4)' },
      // Strict 1:00 PM - 2:00 PM Lunch Break as per Excel remarks
      { shiftNum: 5, reporting: '01:30 PM', exam: '02:00 PM - 03:00 PM (BATCH 5)' }
    ],
    shiftCapacity: 90,
    isHold: false
  },
  WRITING_QUEST: {
    eventTitle: 'Writing Quest',
    classMatch: 'CLASSES 11 & 12',
    timing: '04:00 PM - 05:00 PM',
    reportingTime: '03:30 PM',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS 1st FLOOR',
    batchMode: 'ALL_IN_ONE',
    capacity: 150,
    isHold: false
  },
  ONLINE_QUIZ_11_12: {
    eventTitle: 'Online Quiz',
    classMatch: 'CLASSES 11 & 12',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSITM LAB',
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '08:00 AM', exam: '08:30 AM - 09:30 AM (BATCH 1)' },
      { shiftNum: 2, reporting: '09:00 AM', exam: '09:30 AM - 10:30 AM (BATCH 2)' },
      { shiftNum: 3, reporting: '10:00 AM', exam: '10:30 AM - 11:30 AM (BATCH 3)' },
      { shiftNum: 4, reporting: '11:00 AM', exam: '11:30 AM - 12:30 PM (BATCH 4)' },
      // Strict 1:00 PM - 2:00 PM Lunch Break
      { shiftNum: 5, reporting: '01:30 PM', exam: '02:00 PM - 03:00 PM (BATCH 5)' },
      { shiftNum: 6, reporting: '02:30 PM', exam: '03:00 PM - 04:00 PM (BATCH 6)' }
    ],
    shiftCapacity: 180,
    isHold: false
  },
  ESSAY_WRITING_GRADUATION: {
    eventTitle: 'Essay Writing',
    classMatch: 'GRADUATION',
    timing: '04:00 PM - 05:00 PM',
    reportingTime: '03:30 PM',
    examTime: '04:00 PM - 05:00 PM',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSITM LT-2, LT-3 & LT-4',
    examDate: '01 Nov 2026 (Sunday)',
    batchMode: 'ALL_IN_ONE',
    capacity: 200,
    isHold: false,
    luckyDrawNotice: 'COMPULSORY EVENT: Graduation Lucky Draw on Sunday, 01 November 2026 at 09:00 AM Sharp at MSITM Campus.'
  },
  ONLINE_QUIZ_GRADUATION: {
    eventTitle: 'Online Quiz',
    classMatch: 'GRADUATION',
    timing: '09:00 AM ONWARDS',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSITM LAB',
    examDate: '02 Nov 2026 (Monday)',
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '08:30 AM', exam: '09:00 AM - 10:00 AM (BATCH 1)' },
      { shiftNum: 2, reporting: '09:30 AM', exam: '10:00 AM - 11:00 AM (BATCH 2)' },
      { shiftNum: 3, reporting: '10:30 AM', exam: '11:00 AM - 12:00 PM (BATCH 3)' },
      { shiftNum: 4, reporting: '12:30 PM', exam: '01:00 PM - 02:00 PM (BATCH 4)' },
    ],
    shiftCapacity: 180,
    isHold: false,
    luckyDrawNotice: 'COMPULSORY EVENT: Graduation Lucky Draw on Sunday, 01 November 2026 at 09:00 AM Sharp at MSITM Campus.'
  },
  PENDING_REVIEW: {
    eventTitle: 'Event Allocation Pending',
    classMatch: 'Under Administrative Verification',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'ADMINISTRATION OFFICE',
    isHold: true,
    holdReason: 'HOLD (Missing or unconfirmed competition event - pending committee approval)'
  }
};

export function resolveEventKey(competitionName?: string, className?: string): string {
  const comp = String(competitionName || '').trim().toUpperCase();
  const cls = String(className || '').trim().toUpperCase();

  if (!comp || comp === 'MISSING_EVENT' || comp === 'GENERAL COMPETITION') {
    return 'PENDING_REVIEW';
  }

  if (comp.includes('FANCY DRESS') || comp.includes('UNIQUE')) return 'FANCY_DRESS';
  if (comp.includes('COLOUR BY NUMBER') || comp.includes('COLOR BY NUMBER')) return 'COLOUR_BY_NUMBER';
  if (comp.includes('JOIN THE DOTS') || comp.includes('JOINT THE DOTS')) return 'JOIN_THE_DOTS';
  if (comp.includes('COMPLETE THE PICTURE') || comp.includes('COMPLETE THE DOTS')) return 'COMPLETE_THE_PICTURE';
  if (comp.includes('CLAY')) return 'CLAY_CHAMPS';
  if (comp.includes('DRESS TO IMPRESS')) return 'DRESS_TO_IMPRESS';
  if (comp.includes('PAINT') || comp.includes('PAIINT')) return 'PAINT_YOUR_IMAGINATION';
  if (comp.includes('WRITING STAR')) return 'WRITING_STARS';
  if (comp.includes('BATTLE OF BRAIN') || comp.includes('BATTLLE') || comp.includes('BATTEL')) return 'BATTLE_OF_BRAINS';
  if (comp.includes('POSTER') || comp.includes('POATER') || comp.includes('POST ARTIST')) return 'POSTER_ARTIST';
  if (comp.includes('JUNIOR SCIENTIST') || comp.includes('JUNOIR')) return 'JUNIOR_SCIENTIST';
  if (comp.includes('FIRELESS')) return 'FIRELESS_COOKING';
  if (comp.includes('YOUNG INNOVATOR')) return 'YOUNG_INNOVATORS';
  if (comp.includes('WRITING QUEST')) return 'WRITING_QUEST';

  if (comp.includes('ESSAY')) {
    return 'ESSAY_WRITING_GRADUATION';
  }

  if (comp.includes('QUIZ')) {
    if (cls.includes('GRAD') || cls.includes('BBA') || cls.includes('BCA') || cls.includes('COLLEGE')) {
      return 'ONLINE_QUIZ_GRADUATION';
    }
    if (['11', '12', '11TH', '12TH', 'CLASS 11', 'CLASS 12'].includes(cls)) {
      return 'ONLINE_QUIZ_11_12';
    }
    return 'ONLINE_QUIZ_9_10';
  }

  if (comp.includes('JUNIOR ARTIST')) {
    return 'POSTER_ARTIST';
  }

  return 'PENDING_REVIEW';
}

import { allocateStudentToBatch } from '@/lib/allocation/seating-engine';

// In-memory cache for deterministic rank of candidates in their respective competitions
let candidateRankCache: Map<string, number> | null = null;
let eventCandidateCountCache: Map<string, number> | null = null;

function loadCandidateCaches(): { rankMap: Map<string, number>; countMap: Map<string, number> } {
  if (candidateRankCache && eventCandidateCountCache) {
    return { rankMap: candidateRankCache, countMap: eventCandidateCountCache };
  }

  candidateRankCache = new Map();
  eventCandidateCountCache = new Map();

  if (typeof window !== 'undefined') {
    return { rankMap: candidateRankCache, countMap: eventCandidateCountCache };
  }

  try {
    const fs = require('fs');
    const path = require('path');

    // Try 1: Authoritative Master Excel Registry (6,046 verified candidates)
    try {
      const masterExcelPath = path.resolve('Master_All_Students_Registry.xlsx');
      if (fs.existsSync(masterExcelPath)) {
        const XLSX = require('xlsx');
        const wb = XLSX.readFile(masterExcelPath, { sheetRows: 10000 });
        const ws = wb.Sheets['Master All Students'] || wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        const groups = new Map<string, any[]>();
        for (const s of rows) {
          const cat = String(s['Event Category'] || s.competitionName || '').trim().toUpperCase();
          const cls = String(s['Class'] || s.className || '').trim().toUpperCase();
          const key = resolveEventKey(cat, cls);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(s);
        }

        for (const [key, students] of groups.entries()) {
          eventCandidateCountCache.set(key, students.length);
          students.forEach((s, idx) => {
            const reg = String(s['Registration No'] || s.registrationNumber || '').trim().toUpperCase();
            if (reg && candidateRankCache) {
              candidateRankCache.set(reg, idx + 1); // 1-based rank
              candidateRankCache.set(`${key}:${reg}`, idx + 1);
            }
          });
        }

        return { rankMap: candidateRankCache, countMap: eventCandidateCountCache };
      }
    } catch (excelErr) {
      console.warn('Master Excel cache load fallback:', excelErr);
    }

    // Try 2: JSON Snapshots (.data/master_students_5752_snapshot.json or .data/master_students_4887_snapshot.json)
    try {
      const snap5752 = path.resolve('.data', 'master_students_5752_snapshot.json');
      const snap4887 = path.resolve('.data', 'master_students_4887_snapshot.json');
      const activePath = fs.existsSync(snap5752) ? snap5752 : snap4887;

      if (fs.existsSync(activePath)) {
        const snap = JSON.parse(fs.readFileSync(activePath, 'utf8'));
        const groups = new Map<string, any[]>();

        for (const s of snap.students) {
          const cat = String(s['Event Category'] || s.competitionName || '').trim().toUpperCase();
          const cls = String(s['Class'] || s.className || '').trim().toUpperCase();
          const key = resolveEventKey(cat, cls);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(s);
        }

        for (const [key, students] of groups.entries()) {
          eventCandidateCountCache.set(key, students.length);
          students.forEach((s, idx) => {
            const reg = String(s['Registration No'] || s.registrationNumber || '').trim().toUpperCase();
            if (reg && candidateRankCache) {
              candidateRankCache.set(reg, idx + 1); // 1-based rank
              candidateRankCache.set(`${key}:${reg}`, idx + 1);
            }
          });
        }
      }
    } catch (err) {
      console.warn('Rank cache build fallback:', err);
    }
  } catch (outerErr) {
    console.warn('Node environment check fallback:', outerErr);
  }

  return { rankMap: candidateRankCache, countMap: eventCandidateCountCache };
}

export function registerCandidateInRankCache(
  competitionName: string,
  className: string,
  registrationNumber: string
): number {
  const { rankMap, countMap } = loadCandidateCaches();
  const key = resolveEventKey(competitionName, className);
  const cleanReg = registrationNumber.trim().toUpperCase();

  const currentCount = countMap.get(key) || 0;
  const newRank = currentCount + 1;

  countMap.set(key, newRank);
  rankMap.set(cleanReg, newRank);
  rankMap.set(`${key}:${cleanReg}`, newRank);

  return newRank;
}

export function invalidateCandidateRankCache(): void {
  candidateRankCache = null;
  eventCandidateCountCache = null;
}

export function getCandidateRankMap(): Map<string, number> {
  return loadCandidateCaches().rankMap;
}

export function getEventCandidateCountMap(): Map<string, number> {
  return loadCandidateCaches().countMap;
}

/**
 * Calculates candidate's exact Reporting Time, Exam Time, Shift, and Allocated Venue
 * taking into account event timing, multi-shift batches, room capacity limits, and seating rules.
 */
export function getStudentEventSchedule(
  competitionName: string,
  className: string,
  candidateIndexOrRegNo?: number | string
): EventScheduleDetail {
  const key = resolveEventKey(competitionName, className);
  const rule = EVENT_SCHEDULE_RULES[key];
  const { rankMap, countMap } = loadCandidateCaches();

  let candidateIndex = 0;
  if (typeof candidateIndexOrRegNo === 'string') {
    const cleanReg = candidateIndexOrRegNo.trim().toUpperCase();
    if (rankMap.has(`${key}:${cleanReg}`)) {
      candidateIndex = Math.max(0, rankMap.get(`${key}:${cleanReg}`)! - 1);
    } else if (rankMap.has(cleanReg)) {
      candidateIndex = Math.max(0, rankMap.get(cleanReg)! - 1);
    } else {
      // Newly created candidate not in snapshot: rank sequentially after existing enrolled count
      const existingCount = countMap.get(key) || 0;
      candidateIndex = existingCount;

      // Auto-cache this registration so subsequent calls for this student in this session get the exact same rank
      if (cleanReg && cleanReg !== 'PREVIEW') {
        const newRank = existingCount + 1;
        countMap.set(key, newRank);
        rankMap.set(cleanReg, newRank);
        rankMap.set(`${key}:${cleanReg}`, newRank);
      }
    }
  } else if (typeof candidateIndexOrRegNo === 'number') {
    candidateIndex = Math.max(0, candidateIndexOrRegNo);
  }

  // Use the authoritative deterministic seating engine
  const alloc = allocateStudentToBatch(competitionName, className, candidateIndex);

  if (!rule) {
    return {
      eventName: competitionName || 'Mindspark Competition',
      className: className || 'General',
      examDate: alloc.examDate || '01-Nov-2026',
      rawTiming: alloc.examTime,
      reportingTime: alloc.reportingTime,
      examTime: alloc.examTime,
      venueMain: alloc.venueMain,
      venueDetail: alloc.venueDetail,
      batchInfo: alloc.batchName,
      incharges: '',
      isHold: alloc.isHold,
      holdReason: alloc.holdReason,
      candidateRank: alloc.seatNumber,
      luckyDrawNotice: alloc.luckyDrawNotice,
    };
  }

  return {
    eventName: rule.eventTitle,
    className: rule.classMatch,
    examDate: alloc.examDate || rule.examDate || '01-Nov-2026',
    rawTiming: alloc.examTime,
    reportingTime: alloc.reportingTime,
    examTime: alloc.examTime,
    venueMain: alloc.venueMain,
    venueDetail: alloc.venueDetail,
    batchInfo: alloc.batchName,
    incharges: '',
    isHold: alloc.isHold,
    holdReason: alloc.holdReason || rule.holdReason,
    candidateRank: alloc.seatNumber,
    luckyDrawNotice: alloc.luckyDrawNotice || rule.luckyDrawNotice,
  };
}
