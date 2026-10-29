import { PROGRAM_SEATING_RULES, ProgramSeatingRule, BatchDefinition } from './seating-rules';
import { resolveEventKey } from '@/lib/pdf/event-schedule';

export interface BatchAllocationResult {
  isHold: boolean;
  status: 'CONFIRMED' | 'ON_HOLD' | 'OVER_CAPACITY_BLOCKED';
  holdReason?: string;
  examDate?: string;
  luckyDrawNotice?: string;
  batchNumber: number;
  batchName: string;
  reportingTime: string;
  examTime: string;
  venueMain: string;
  venueDetail: string;
  seatNumber: number;
  batchSeatIndex?: number;
  canIssueAdmitCard: boolean;
  warning?: string;
}

export interface ShiftWiseSummary {
  eventKey: string;
  title: string;
  classGroup: string;
  venue: string;
  isHold: boolean;
  holdReason?: string;
  roomMaxCapacity: number;
  totalProgramCapacity: number;
  allocatedCount: number;
  availableSeats: number;
  status: 'SEATS_AVAILABLE' | 'FULL' | 'ON_HOLD' | 'OVER_CAPACITY';
  batches: Array<{
    batchNumber: number;
    batchName: string;
    reportingTime: string;
    examTime: string;
    capacity: number;
    allocated: number;
    freeSeats: number;
    isFull: boolean;
  }>;
}

/**
 * Deterministically allocates a student to their eligible batch based strictly
 * on current enrolled count, shift timetable, room capacity, and seating plan.
 *
 * Enforces:
 * 1. Batch-wise allocation (sequential filling of Batch 1, then Batch 2...).
 * 2. Full-batch prevention: Once a batch reaches capacity, shifts to next batch.
 * 3. Overbooking prevention: Blocks allocation if all batches of a program reach capacity.
 * 4. HOLD isolation: Flags candidates on HOLD and blocks confirmed admit card issuance.
 */
export function allocateStudentToBatch(
  competitionName: string,
  className: string,
  candidateZeroIndex: number
): BatchAllocationResult {
  const eventKey = resolveEventKey(competitionName, className);
  const rule = PROGRAM_SEATING_RULES[eventKey];

  if (!rule || eventKey === 'PENDING_REVIEW') {
    return {
      isHold: true,
      status: 'ON_HOLD',
      holdReason: 'Unknown or unallocated competition name. Pending administrative review.',
      batchNumber: 0,
      batchName: 'PENDING_REVIEW',
      reportingTime: 'PENDING',
      examTime: 'SCHEDULE PENDING (ON HOLD)',
      venueMain: 'MEENA SHAH PUBLIC SCHOOL',
      venueDetail: 'ADMINISTRATION OFFICE',
      seatNumber: candidateZeroIndex + 1,
      canIssueAdmitCard: false,
    };
  }

  if (rule.isHold) {
    return {
      isHold: true,
      status: 'ON_HOLD',
      holdReason: rule.holdReason || 'Event schedule pending committee directive.',
      batchNumber: 0,
      batchName: 'HOLD',
      reportingTime: 'PENDING',
      examTime: 'SCHEDULE PENDING (ON HOLD)',
      venueMain: rule.venueMain,
      venueDetail: rule.venueDetail,
      seatNumber: candidateZeroIndex + 1,
      canIssueAdmitCard: false,
    };
  }

  // Calculate cumulative capacity across batches
  let cumulative = 0;
  for (const batch of rule.batches) {
    const prevCumulative = cumulative;
    cumulative += batch.maxCapacity;

    if (candidateZeroIndex < cumulative) {
      return {
        isHold: false,
        status: 'CONFIRMED',
        examDate: rule.examDate || '01-Nov-2026',
        luckyDrawNotice: rule.luckyDrawNotice,
        batchNumber: batch.batchNumber,
        batchName: batch.batchName,
        reportingTime: batch.reportingTime,
        examTime: batch.examTime,
        venueMain: rule.venueMain,
        venueDetail: rule.venueDetail,
        seatNumber: candidateZeroIndex + 1,
        batchSeatIndex: candidateZeroIndex - prevCumulative + 1,
        canIssueAdmitCard: true,
      };
    }
  }

  // If candidate index exceeds total capacity of all batches
  const totalCap = rule.batches.reduce((acc, b) => acc + b.maxCapacity, 0);
  return {
    isHold: true,
    status: 'OVER_CAPACITY_BLOCKED',
    holdReason: `Program '${rule.canonicalTitle}' has reached maximum venue capacity (${totalCap} seats across ${rule.batches.length} batches). No additional seats available in ${rule.venueDetail}.`,
    batchNumber: 0,
    batchName: 'CAPACITY_REACHED',
    reportingTime: 'N/A',
    examTime: 'CAPACITY REACHED - ON WAITLIST',
    venueMain: rule.venueMain,
    venueDetail: rule.venueDetail,
    seatNumber: candidateZeroIndex + 1,
    canIssueAdmitCard: false,
    warning: 'VENUE_FULL',
  };
}

/**
 * Computes shift-wise student counts, available seats, and remaining capacity
 * across all programs based on actual registered student records.
 */
export function calculateShiftWiseMetrics(
  students: Array<{ competition_name?: string; competitionName?: string; class_name?: string; className?: string }>
): ShiftWiseSummary[] {
  // Group students by eventKey
  const counts = new Map<string, number>();

  for (const s of students) {
    const comp = s.competition_name || s.competitionName || '';
    const cls = s.class_name || s.className || '';
    const key = resolveEventKey(comp, cls);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const summaries: ShiftWiseSummary[] = [];

  for (const [key, rule] of Object.entries(PROGRAM_SEATING_RULES)) {
    const allocatedCount = counts.get(key) || 0;

    if (rule.isHold) {
      summaries.push({
        eventKey: key,
        title: rule.canonicalTitle,
        classGroup: rule.classGroup,
        venue: `${rule.venueMain} - ${rule.venueDetail}`,
        isHold: true,
        holdReason: rule.holdReason,
        roomMaxCapacity: rule.roomMaxCapacity,
        totalProgramCapacity: 0,
        allocatedCount,
        availableSeats: 0,
        status: 'ON_HOLD',
        batches: [],
      });
      continue;
    }

    const totalProgramCapacity = rule.batches.reduce((sum, b) => sum + b.maxCapacity, 0);
    const availableSeats = Math.max(0, totalProgramCapacity - allocatedCount);

    let runningOffset = 0;
    const batchSummaries = rule.batches.map((batch) => {
      const batchStart = runningOffset;
      const batchEnd = runningOffset + batch.maxCapacity;
      runningOffset = batchEnd;

      const batchAllocated = Math.max(0, Math.min(allocatedCount - batchStart, batch.maxCapacity));
      const freeSeats = Math.max(0, batch.maxCapacity - batchAllocated);

      return {
        batchNumber: batch.batchNumber,
        batchName: batch.batchName,
        reportingTime: batch.reportingTime,
        examTime: batch.examTime,
        capacity: batch.maxCapacity,
        allocated: batchAllocated,
        freeSeats,
        isFull: freeSeats === 0,
      };
    });

    summaries.push({
      eventKey: key,
      title: rule.canonicalTitle,
      classGroup: rule.classGroup,
      venue: `${rule.venueMain} - ${rule.venueDetail}`,
      isHold: false,
      roomMaxCapacity: rule.roomMaxCapacity,
      totalProgramCapacity,
      allocatedCount,
      availableSeats,
      status: allocatedCount > totalProgramCapacity ? 'OVER_CAPACITY' : (availableSeats === 0 ? 'FULL' : 'SEATS_AVAILABLE'),
      batches: batchSummaries,
    });
  }

  return summaries;
}
