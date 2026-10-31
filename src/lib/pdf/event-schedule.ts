
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
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '02:30 PM', exam: '03:00 PM - 04:00 PM (BATCH 1)' },
      { shiftNum: 2, reporting: '03:30 PM', exam: '04:00 PM - 05:00 PM (BATCH 2)' }
    ],
    capacity: 300,
    isHold: false
  },
  BATTLE_OF_BRAINS: {
    eventTitle: 'Battle of Brains',
    classMatch: 'CLASSES 4 & 5',
    timing: '02:00 PM - 03:00 PM',
    reportingTime: '01:30 PM',
    venueMain: 'MEENA SHAH PUBLIC SCHOOL',
    venueDetail: 'MSPS 1st FLOOR',
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '01:30 PM', exam: '02:00 PM - 03:00 PM (BATCH 1)' },
      { shiftNum: 2, reporting: '02:30 PM', exam: '03:00 PM - 04:00 PM (BATCH 2)' },
      { shiftNum: 3, reporting: '03:30 PM', exam: '04:00 PM - 05:00 PM (BATCH 3)' }
    ],
    capacity: 380,
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
      { shiftNum: 10, reporting: '06:30 PM', exam: '07:00 PM - 08:00 PM (SHIFT 10)' },
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
    batchMode: 'SHIFTS',
    shifts: [
      { shiftNum: 1, reporting: '03:30 PM', exam: '04:00 PM - 05:00 PM (BATCH 1)' },
      { shiftNum: 2, reporting: '04:30 PM', exam: '05:00 PM - 06:00 PM (BATCH 2)' }
    ],
    capacity: 200,
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
      { shiftNum: 3, reporting: '10:00 AM', exam: '10:30 AM - 11:30 AM (BATCH 3)' }
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
    venueMain: 'MSITM CAMPUS',
    venueDetail: 'MSITM LT-2, LT-3 & LT-4',
    examDate: '01 Nov 2026 (Sunday)',
    batchMode: 'SINGLE',
    shifts: [
      { shiftNum: 1, reporting: '03:30 PM', exam: '04:00 PM - 05:00 PM' }
    ],
    capacity: 300,
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
      { shiftNum: 4, reporting: '12:30 PM', exam: '01:00 PM - 02:00 PM (BATCH 4)' }
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

  // Exact rule key match
  if (EVENT_SCHEDULE_RULES[comp]) {
    return comp;
  }

  if (comp.includes('FANCY DRESS') || comp.includes('UNIQUE')) return 'FANCY_DRESS';
  if (comp.includes('COLOUR BY NUMBER') || comp.includes('COLOR BY NUMBER')) return 'COLOUR_BY_NUMBER';
  if (comp.includes('JOIN') && comp.includes('DOT')) return 'JOIN_THE_DOTS';
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
    const cleanCls = cls.replace(/[^A-Z0-9]/g, '');
    const isGrad =
      cls.includes('GRAD') ||
      cleanCls === 'BA' ||
      cleanCls === 'BSC' ||
      cleanCls === 'BCOM' ||
      cleanCls === 'BBA' ||
      cleanCls === 'BCA' ||
      cleanCls === 'BTECH' ||
      cleanCls === 'MA' ||
      cleanCls === 'MSC' ||
      cleanCls === 'MCOM' ||
      cleanCls.startsWith('BA') ||
      cleanCls.startsWith('BSC') ||
      cleanCls.startsWith('BCOM') ||
      cleanCls.startsWith('BBA') ||
      cleanCls.startsWith('BCA') ||
      cleanCls.startsWith('BTECH') ||
      cls.includes('COLLEGE') ||
      cls.includes('DEGREE') ||
      comp.includes('GRAD') ||
      comp.includes('COLLEGE');

    if (isGrad) {
      return 'ONLINE_QUIZ_GRADUATION';
    }
    if (
      ['11', '12', '11TH', '12TH', 'CLASS 11', 'CLASS 12'].includes(cls) ||
      cleanCls === '11' ||
      cleanCls === '12' ||
      comp.includes('11') ||
      comp.includes('12')
    ) {
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
import authoritativeDispatchedData from '@/lib/allocation/authoritative-dispatched-schedules.json';
import masterBaselineRankCache from '@/lib/allocation/master-baseline-rank-cache.json';

// In-memory cache for deterministic rank of candidates in their respective competitions
let candidateRankCache: Map<string, number> | null = null;
let eventCandidateCountCache: Map<string, number> | null = null;
let authoritativeDispatchedMap: Record<string, any> | null = null;

export function persistAuthoritativeDispatchedMap(): void {
  try {
    if (typeof window === 'undefined' && authoritativeDispatchedMap) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.resolve(process.cwd(), 'src/lib/allocation/authoritative-dispatched-schedules.json');
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(authoritativeDispatchedMap, null, 2), 'utf8');
      }
    }
  } catch (err) {
    // Non-fatal if running on serverless
  }
}

function getAuthoritativeDispatchedMap(): Record<string, any> {
  if (authoritativeDispatchedMap) return authoritativeDispatchedMap;
  authoritativeDispatchedMap = (authoritativeDispatchedData as Record<string, any>) || {};
  return authoritativeDispatchedMap;
}

function loadCandidateCaches(): { rankMap: Map<string, number>; countMap: Map<string, number> } {
  if (candidateRankCache && eventCandidateCountCache) {
    return { rankMap: candidateRankCache, countMap: eventCandidateCountCache };
  }

  candidateRankCache = new Map();
  eventCandidateCountCache = new Map();

  // 1. Authoritative seed from statically bundled master baseline cache (guaranteed on Vercel & serverless)
  if (masterBaselineRankCache) {
    if (masterBaselineRankCache.counts) {
      for (const [key, count] of Object.entries(masterBaselineRankCache.counts)) {
        eventCandidateCountCache.set(key, Number(count));
      }
    }
    if (masterBaselineRankCache.rankMap) {
      for (const [regOrKey, rank] of Object.entries(masterBaselineRankCache.rankMap)) {
        candidateRankCache.set(regOrKey, Number(rank));
      }
    }
  }

  if (typeof window !== 'undefined') {
    return { rankMap: candidateRankCache, countMap: eventCandidateCountCache };
  }

  try {
    const fs = require('fs');
    const path = require('path');

    // 2. Incorporate any newly created candidates from local DB if running locally
    try {
      const dbPath = path.resolve('.data', 'mind_spark_db.json');
      if (fs.existsSync(dbPath)) {
        const dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (Array.isArray(dbContent.students)) {
          for (const s of dbContent.students) {
            if (s.status === 'ARCHIVED' || s.status === 'INACTIVE') continue;
            const reg = String(s.registrationNumber || '').trim().toUpperCase();
            const cat = String(s.competitionName || '').trim().toUpperCase();
            const cls = String(s.className || '').trim().toUpperCase();
            const key = resolveEventKey(cat, cls);
            if (reg && !candidateRankCache.has(reg)) {
              const currentCount = eventCandidateCountCache.get(key) || 0;
              const newRank = currentCount + 1;
              eventCandidateCountCache.set(key, newRank);
              candidateRankCache.set(reg, newRank);
              candidateRankCache.set(`${key}:${reg}`, newRank);
            }
          }
        }
      }
    } catch {
      // silent fallback
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

  // If candidate already has an allocated rank for THIS specific event, PRESERVE it permanently!
  if (rankMap.has(`${key}:${cleanReg}`)) {
    return rankMap.get(`${key}:${cleanReg}`)!;
  }

  // Newly enrolled candidate in this event: rank sequentially after existing enrolled count in this event
  const currentCount = countMap.get(key) || 0;
  const newRank = currentCount + 1;

  countMap.set(key, newRank);
  rankMap.set(`${key}:${cleanReg}`, newRank);
  rankMap.set(cleanReg, newRank);

  return newRank;
}

export function reallocateCandidateEvent(
  registrationNumber: string,
  oldCompetitionName: string,
  oldClassName: string,
  newCompetitionName: string,
  newClassName: string
): EventScheduleDetail {
  const cleanReg = registrationNumber.trim().toUpperCase();
  const oldKey = resolveEventKey(oldCompetitionName, oldClassName);
  const newKey = resolveEventKey(newCompetitionName, newClassName);
  const { rankMap, countMap } = loadCandidateCaches();

  // 1. Clean up old event bindings and cached dispatched schedule
  if (oldKey) {
    rankMap.delete(`${oldKey}:${cleanReg}`);
  }
  const authMap = getAuthoritativeDispatchedMap();
  delete authMap[cleanReg];

  // 2. Allocate into new event sequentially (if not already allocated in new event)
  let newRank: number;
  if (rankMap.has(`${newKey}:${cleanReg}`)) {
    newRank = rankMap.get(`${newKey}:${cleanReg}`)!;
  } else {
    const currentCount = countMap.get(newKey) || 0;
    newRank = currentCount + 1;
    countMap.set(newKey, newRank);
    rankMap.set(`${newKey}:${cleanReg}`, newRank);
    rankMap.set(cleanReg, newRank);
  }

  // 3. Compute and cache authoritative schedule for new event
  const schedule = getStudentEventSchedule(newCompetitionName, newClassName, cleanReg);
  persistAuthoritativeDispatchedMap();
  return schedule;
}

export function transferCandidateRank(
  oldRegNo: string,
  newRegNo: string,
  competitionName?: string,
  className?: string
): void {
  const { rankMap } = loadCandidateCaches();
  const cleanOld = oldRegNo.trim().toUpperCase();
  const cleanNew = newRegNo.trim().toUpperCase();
  if (cleanOld === cleanNew) return;

  const key = competitionName && className ? resolveEventKey(competitionName, className) : '';
  const existingRank = (key ? rankMap.get(`${key}:${cleanOld}`) : null) || rankMap.get(cleanOld);
  if (existingRank) {
    rankMap.set(cleanNew, existingRank);
    if (key) {
      rankMap.set(`${key}:${cleanNew}`, existingRank);
    }
  }

  const authMap = getAuthoritativeDispatchedMap();
  if (authMap[cleanOld]) {
    authMap[cleanNew] = { ...authMap[cleanOld], regNo: cleanNew, reg: cleanNew };
    persistAuthoritativeDispatchedMap();
  }
}

export function invalidateCandidateRankCache(): void {
  candidateRankCache = null;
  eventCandidateCountCache = null;
  authoritativeDispatchedMap = null;
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

  const isOnlineQuizGraduation = key === 'ONLINE_QUIZ_GRADUATION';
  const officialExamDate = isOnlineQuizGraduation ? '02 Nov 2026 (Monday)' : '01 Nov 2026 (Sunday)';

  let candidateIndex = 0;
  if (typeof candidateIndexOrRegNo === 'string') {
    const cleanReg = candidateIndexOrRegNo.trim().toUpperCase();
    const authMap = getAuthoritativeDispatchedMap();
    if (authMap[cleanReg]) {
      const auth = authMap[cleanReg];
      const authKey = auth.eventKey || resolveEventKey(auth.competitionName || auth.eventCategory || '', auth.className || auth.classGrade || '');
      // If student was switched to another competition, immediately purge stale cache
      if (authKey && authKey !== 'PENDING_REVIEW' && authKey !== key) {
        delete authMap[cleanReg];
      } else if (!key || key === 'PENDING_REVIEW' || !authKey || authKey === key || authKey === 'PENDING_REVIEW') {
        return {
          eventName: rule ? rule.eventTitle : (competitionName || 'Mindspark Competition'),
          className: rule ? rule.classMatch : (className || 'General'),
          examDate: auth.examDate || officialExamDate,
          rawTiming: auth.examTime,
          reportingTime: auth.reportingTime,
          examTime: auth.examTime,
          venueMain: auth.venueMain || 'MEENA SHAH PUBLIC SCHOOL',
          venueDetail: auth.venueDetail || (rule ? rule.venueDetail : 'MSPS CAMPUS'),
          batchInfo: auth.batchInfo,
          incharges: '',
          isHold: false,
          candidateRank: 1,
          luckyDrawNotice: rule ? rule.luckyDrawNotice : undefined,
        };
      }
    }

    if (rankMap.has(`${key}:${cleanReg}`)) {
      candidateIndex = Math.max(0, rankMap.get(`${key}:${cleanReg}`)! - 1);
    } else {
      // Newly created or transferred candidate not in snapshot for this event: rank sequentially
      const existingCount = countMap.get(key) || 0;
      candidateIndex = existingCount;

      // Auto-cache this registration so subsequent calls for this student in this session get the exact same rank
      if (cleanReg && cleanReg !== 'PREVIEW') {
        const newRank = existingCount + 1;
        countMap.set(key, newRank);
        rankMap.set(`${key}:${cleanReg}`, newRank);
        rankMap.set(cleanReg, newRank);
      }
    }
  } else if (typeof candidateIndexOrRegNo === 'number') {
    candidateIndex = Math.max(0, candidateIndexOrRegNo);
  }

  // Use the authoritative deterministic seating engine
  const alloc = allocateStudentToBatch(competitionName, className, candidateIndex);

  // Permanently lock newly allocated candidate schedule into memory map so it never drifts or reverts
  if (typeof candidateIndexOrRegNo === 'string') {
    const cleanReg = candidateIndexOrRegNo.trim().toUpperCase();
    if (cleanReg && cleanReg !== 'PREVIEW') {
      const authMap = getAuthoritativeDispatchedMap();
      if (!authMap[cleanReg] || (authMap[cleanReg] && authMap[cleanReg].eventKey !== key)) {
        authMap[cleanReg] = {
          regNo: cleanReg,
          eventKey: key,
          eventCategory: rule ? rule.eventTitle : competitionName,
          classGrade: rule ? rule.classMatch : className,
          examDate: officialExamDate,
          reportingTime: alloc.reportingTime,
          examTime: alloc.examTime,
          batchInfo: alloc.batchName,
          venueMain: alloc.venueMain,
          venueDetail: alloc.venueDetail,
        };
      }
    }
  }

  if (!rule) {
    return {
      eventName: competitionName || 'Mindspark Competition',
      className: className || 'General',
      examDate: officialExamDate,
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
    examDate: officialExamDate,
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
