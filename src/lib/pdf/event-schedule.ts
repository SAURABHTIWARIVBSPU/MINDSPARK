import fs from 'fs';
import path from 'path';

export interface EventScheduleDetail {
  eventName: string;
  className: string;
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
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'VACANT ROOM 1st FLOOR',
    isHold: true,
    holdReason: 'HOLD (DO NOT GENERATE ADMIT CARD FOR THIS - SCHEDULE PENDING)'
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
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSITM LT2, LT3, LT4',
    isHold: true,
    holdReason: 'HOLD (DO NOT GENERATE ADMIT CARD FOR THIS - SCHEDULE PENDING)'
  },
  ONLINE_QUIZ_GRADUATION: {
    eventTitle: 'Online Quiz',
    classMatch: 'GRADUATION',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSITM 1st FLOOR',
    isHold: true,
    holdReason: 'HOLD (DO NOT GENERATE ADMIT CARD FOR THIS - SCHEDULE PENDING)'
  }
};

export function resolveEventKey(competitionName?: string, className?: string): string {
  const comp = String(competitionName || '').trim().toUpperCase();
  const cls = String(className || '').trim().toUpperCase();

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

  return 'COLOUR_BY_NUMBER';
}

// In-memory cache for deterministic rank of candidates in their respective competitions
let candidateRankCache: Map<string, number> | null = null;

function getCandidateRankMap(): Map<string, number> {
  if (candidateRankCache) return candidateRankCache;
  candidateRankCache = new Map();

  try {
    const snapPath = path.resolve('.data', 'master_students_4887_snapshot.json');
    if (fs.existsSync(snapPath)) {
      const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
      const groups = new Map<string, any[]>();
      
      for (const s of snap.students) {
        const cat = String(s['Event Category'] || s.competitionName || '').trim().toUpperCase();
        const cls = String(s['Class'] || s.className || '').trim().toUpperCase();
        const key = resolveEventKey(cat, cls);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(s);
      }

      for (const [, students] of groups.entries()) {
        students.forEach((s, idx) => {
          const reg = String(s['Registration No'] || s.registrationNumber || '').trim().toUpperCase();
          if (reg && candidateRankCache) {
            candidateRankCache.set(reg, idx + 1); // 1-based rank
          }
        });
      }
    }
  } catch (err) {
    console.warn('Rank cache build fallback:', err);
  }

  return candidateRankCache;
}

/**
 * Calculates candidate's exact Reporting Time, Exam Time, Shift, and Allocated Venue
 * taking into account event timing, multi-shift batches, and venue locations.
 */
export function getStudentEventSchedule(
  competitionName: string,
  className: string,
  candidateIndexOrRegNo?: number | string
): EventScheduleDetail {
  const key = resolveEventKey(competitionName, className);
  const rule = EVENT_SCHEDULE_RULES[key];

  let candidateIndex = 0;
  if (typeof candidateIndexOrRegNo === 'string') {
    const cleanReg = candidateIndexOrRegNo.trim().toUpperCase();
    const rankMap = getCandidateRankMap();
    if (rankMap.has(cleanReg)) {
      candidateIndex = Math.max(0, rankMap.get(cleanReg)! - 1);
    } else {
      const digits = cleanReg.replace(/\D/g, '');
      candidateIndex = digits ? parseInt(digits.slice(-3), 10) : 0;
    }
  } else if (typeof candidateIndexOrRegNo === 'number') {
    candidateIndex = Math.max(0, candidateIndexOrRegNo);
  }

  if (!rule) {
    return {
      eventName: competitionName || 'Mindspark Competition',
      className: className || 'General',
      rawTiming: '10:00 AM',
      reportingTime: '09:30 AM',
      examTime: '10:00 AM ONWARDS',
      venueMain: 'MEENA SHAH PUBLIC SCHOOL',
      venueDetail: 'MSPS CAMPUS',
      batchInfo: 'BATCH 1',
      incharges: '',
      isHold: false,
      candidateRank: candidateIndex + 1
    };
  }

  if (rule.isHold) {
    return {
      eventName: rule.eventTitle,
      className: rule.classMatch,
      rawTiming: 'HOLD',
      reportingTime: 'PENDING',
      examTime: 'SCHEDULE PENDING (ON HOLD)',
      venueMain: rule.venueMain,
      venueDetail: rule.venueDetail,
      batchInfo: 'HOLD',
      incharges: '',
      isHold: true,
      holdReason: rule.holdReason,
      candidateRank: candidateIndex + 1
    };
  }

  if (rule.batchMode === 'SHIFTS' && rule.shifts && rule.shifts.length > 0) {
    const shiftCap = rule.shiftCapacity || 90;
    const shiftIndex = Math.min(
      Math.floor(candidateIndex / shiftCap),
      rule.shifts.length - 1
    );
    const assignedShift = rule.shifts[shiftIndex];

    return {
      eventName: rule.eventTitle,
      className: rule.classMatch,
      rawTiming: rule.timing || assignedShift.exam,
      reportingTime: assignedShift.reporting,
      examTime: assignedShift.exam,
      venueMain: rule.venueMain,
      venueDetail: rule.venueDetail,
      batchInfo: `BATCH ${assignedShift.shiftNum}`,
      incharges: '',
      isHold: false,
      candidateRank: candidateIndex + 1
    };
  }

  // Single Batch
  return {
    eventName: rule.eventTitle,
    className: rule.classMatch,
    rawTiming: rule.timing,
    reportingTime: rule.reportingTime,
    examTime: rule.timing,
    venueMain: rule.venueMain,
    venueDetail: rule.venueDetail,
    batchInfo: 'ALL IN ONE BATCH',
    incharges: '',
    isHold: false,
    candidateRank: candidateIndex + 1
  };
}
