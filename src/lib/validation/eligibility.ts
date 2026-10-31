import { resolveEventKey, EVENT_SCHEDULE_RULES, EventScheduleDetail, getStudentEventSchedule } from '@/lib/pdf/event-schedule';
import { APPROVED_COMPETITIONS as CONSTANT_APPROVED_COMPETITIONS } from '@/lib/constants/competitions';

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

export const APPROVED_COMPETITIONS = CONSTANT_APPROVED_COMPETITIONS;

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
