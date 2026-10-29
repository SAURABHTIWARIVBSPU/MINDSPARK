import { resolveEventKey, EVENT_SCHEDULE_RULES, EventScheduleDetail, getStudentEventSchedule } from '@/lib/pdf/event-schedule';

export interface EligibilityResult {
  valid: boolean;
  canonicalCompetition: string;
  canonicalClass: string;
  eventKey: string;
  isHold: boolean;
  holdReason?: string;
  error?: string;
  schedule: EventScheduleDetail;
}

export const APPROVED_COMPETITIONS = [
  { key: 'COLOUR_BY_NUMBER', title: 'Colour by Number', eligibleClasses: ['NURSERY'], defaultClass: 'NURSERY' },
  { key: 'JOIN_THE_DOTS', title: 'Join the Dots & Colour', eligibleClasses: ['LKG', 'L.K.G'], defaultClass: 'LKG' },
  { key: 'COMPLETE_THE_PICTURE', title: 'Complete the Picture & Colour', eligibleClasses: ['UKG', 'U.K.G', 'KG'], defaultClass: 'UKG' },
  { key: 'FANCY_DRESS', title: 'Unique & Creative Handmade Fancy Dress', eligibleClasses: ['PLAY GROUP', 'PLAYGROUP', 'PG'], defaultClass: 'PLAY GROUP' },
  { key: 'CLAY_CHAMPS', title: 'Clay Champs', eligibleClasses: ['1', 'CLASS 1', '1ST'], defaultClass: '1' },
  { key: 'DRESS_TO_IMPRESS', title: 'Dress to Impress', eligibleClasses: ['1', 'CLASS 1', '1ST'], defaultClass: '1' },
  { key: 'PAINT_YOUR_IMAGINATION', title: 'Paint Your Imagination', eligibleClasses: ['2', '3', 'CLASS 2', 'CLASS 3', '2ND', '3RD'], defaultClass: '2' },
  { key: 'WRITING_STARS', title: 'Writing Stars', eligibleClasses: ['2', '3', 'CLASS 2', 'CLASS 3', '2ND', '3RD'], defaultClass: '3' },
  { key: 'BATTLE_OF_BRAINS', title: 'Battle of Brains', eligibleClasses: ['4', '5', 'CLASS 4', 'CLASS 5', '4TH', '5TH'], defaultClass: '4' },
  { key: 'POSTER_ARTIST', title: 'Poster Artist', eligibleClasses: ['4', '5', 'CLASS 4', 'CLASS 5', '4TH', '5TH'], defaultClass: '4' },
  { key: 'SUDOKU', title: 'Sudoku', eligibleClasses: ['6', '7', '8', 'CLASS 6', 'CLASS 7', 'CLASS 8', '6TH', '7TH', '8TH'], defaultClass: '6' },
  { key: 'FIRELESS_COOKING', title: 'Fireless Cooking', eligibleClasses: ['6', '7', '8', 'CLASS 6', 'CLASS 7', 'CLASS 8', '6TH', '7TH', '8TH'], defaultClass: '6' },
  { key: 'JUNIOR_SCIENTIST', title: 'Junior Scientist', eligibleClasses: ['6', '7', '8', 'CLASS 6', 'CLASS 7', 'CLASS 8', '6TH', '7TH', '8TH'], defaultClass: '6' },
  { key: 'YOUNG_INNOVATORS', title: 'Young Innovators', eligibleClasses: ['9', '10', 'CLASS 9', 'CLASS 10', '9TH', '10TH'], defaultClass: '9' },
  { key: 'ONLINE_QUIZ_9_10', title: 'Online Quiz (Class 9-10)', eligibleClasses: ['9', '10', 'CLASS 9', 'CLASS 10', '9TH', '10TH'], defaultClass: '9' },
  { key: 'WRITING_QUEST', title: 'Writing Quest', eligibleClasses: ['11', '12', 'CLASS 11', 'CLASS 12', '11TH', '12TH'], defaultClass: '11' },
  { key: 'ONLINE_QUIZ_11_12', title: 'Online Quiz (Class 11-12)', eligibleClasses: ['11', '12', 'CLASS 11', 'CLASS 12', '11TH', '12TH'], defaultClass: '11' },
  { key: 'ONLINE_QUIZ_GRADUATION', title: 'Online Quiz (Graduation)', eligibleClasses: ['GRADUATION', 'B.SC', 'B.A', 'B.COM', 'BBA', 'BCA', 'B.TECH', 'COLLEGE'], defaultClass: 'GRADUATION' },
  { key: 'ESSAY_WRITING_GRADUATION', title: 'Essay Writing (Graduation)', eligibleClasses: ['GRADUATION', 'B.SC', 'B.A', 'B.COM', 'BBA', 'BCA', 'B.TECH', 'COLLEGE'], defaultClass: 'GRADUATION' }
];

export function validateStudentEligibility(competitionName: string, className: string): EligibilityResult {
  const normComp = String(competitionName || '').trim().toUpperCase();
  const normClass = String(className || '').trim().toUpperCase();

  const eventKey = resolveEventKey(normComp, normClass);
  const rule = EVENT_SCHEDULE_RULES[eventKey];
  const schedule = getStudentEventSchedule(normComp, normClass, 'PREVIEW');

  if (eventKey === 'PENDING_REVIEW') {
    return {
      valid: false,
      canonicalCompetition: normComp || 'UNASSIGNED',
      canonicalClass: normClass || 'UNASSIGNED',
      eventKey,
      isHold: true,
      holdReason: 'Unknown or unallocated competition name. Please select an approved competition.',
      error: `Competition '${competitionName}' is not recognized in official timetable.`,
      schedule
    };
  }

  return {
    valid: true,
    canonicalCompetition: rule.eventTitle || normComp,
    canonicalClass: normClass,
    eventKey,
    isHold: Boolean(rule.isHold),
    holdReason: rule.holdReason,
    schedule
  };
}
