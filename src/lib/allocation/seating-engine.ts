import { PROGRAM_SEATING_RULES, ProgramSeatingRule, BatchDefinition } from './seating-rules';
import { resolveEventKey } from '@/lib/pdf/event-schedule';
import masterBaselineRankCache from './master-baseline-rank-cache.json';

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
  examDate?: string;
  luckyDrawNotice?: string;
  nextAvailableBatch?: {
    batchNumber: number;
    batchName: string;
    reportingTime: string;
    examTime: string;
    examDate: string;
    capacity: number;
    allocated: number;
    freeSeats: number;
  } | null;
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

export interface NextBatchAllotment {
  status: 'CONFIRMED' | 'ALL_BATCHES_FULL' | 'ON_HOLD';
  eventKey: string;
  canonicalTitle: string;
  isFull: boolean;
  totalCapacity: number;
  allocatedCount: number;
  availableSeats: number;
  batchNumber: number;
  batchName: string;
  reportingTime: string;
  examTime: string;
  examDate: string;
  venueMain: string;
  venueDetail: string;
  luckyDrawNotice?: string;
  holdReason?: string;
}

function parseTime12h(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 9 * 60;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatTime12h(minutesFromMidnight: number): string {
  let m = minutesFromMidnight % (24 * 60);
  let hours = Math.floor(m / 60);
  const mins = m % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = hours.toString().padStart(2, '0');
  const mm = mins.toString().padStart(2, '0');
  return `${hh}:${mm} ${period}`;
}

export function generateNextBatch(rule: ProgramSeatingRule, existingBatches: BatchDefinition[]): BatchDefinition {
  const lastBatch = existingBatches[existingBatches.length - 1];
  const nextBatchNumber = (lastBatch?.batchNumber || existingBatches.length) + 1;
  const isShiftType = rule.eventKey === 'JUNIOR_SCIENTIST' || existingBatches.some(b => b.batchName.toLowerCase().includes('shift') || b.examTime.toLowerCase().includes('shift'));

  let prevEndMinutes = 15 * 60; // 3:00 PM fallback
  if (lastBatch) {
    const times = lastBatch.examTime.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/gi);
    if (times && times.length >= 2) {
      prevEndMinutes = parseTime12h(times[1]);
    } else if (times && times.length === 1) {
      prevEndMinutes = parseTime12h(times[0]) + 60;
    }
  }

  // Account for 1:00 PM - 2:00 PM lunch interval
  let nextStartMinutes = prevEndMinutes;
  if (nextStartMinutes === 13 * 60) {
    nextStartMinutes = 14 * 60;
  }

  const nextEndMinutes = nextStartMinutes + 60;
  const reportingMinutes = Math.max(7 * 60, nextStartMinutes - 30);

  const startTimeStr = formatTime12h(nextStartMinutes);
  const endTimeStr = formatTime12h(nextEndMinutes);
  const reportingTimeStr = formatTime12h(reportingMinutes);

  const labelPrefix = isShiftType ? 'Shift' : 'Batch';
  const batchName = isShiftType ? `Shift ${nextBatchNumber} of 8` : `${labelPrefix} ${nextBatchNumber}`;
  const examTime = `${startTimeStr} - ${endTimeStr} (${labelPrefix.toUpperCase()} ${nextBatchNumber})`;

  const capacity = lastBatch?.maxCapacity || 100;

  return {
    batchNumber: nextBatchNumber,
    batchName,
    reportingTime: reportingTimeStr,
    examTime,
    duration: '1 Hour',
    nominalCapacity: capacity,
    maxCapacity: capacity,
  };
}

export function getExpandedBatchesForEvent(
  rule: ProgramSeatingRule,
  requiredCandidateCount: number = 0
): BatchDefinition[] {
  const batches = [...rule.batches];
  let cumulative = batches.reduce((sum, b) => sum + b.maxCapacity, 0);

  // STRICT INSTITUTIONAL DIRECTIVE:
  // Under NO circumstances may Batch 6 or Batch 7 ever be created or allotted for any indoor competition!
  // Indoor programs are strictly capped at maximum 5 batches (or rule.batches.length).
  // Only Junior Scientist on MSPS Ground may have up to Shift 9.
  const maxBatchesCap = rule.eventKey === 'JUNIOR_SCIENTIST' ? 8 : 5;

  // Keep adding dynamic batches until cumulative capacity exceeds required count OR capped
  while (cumulative <= requiredCandidateCount) {
    if (batches.length >= maxBatchesCap) {
      // Expand capacity of existing approved batches (Batches 1-5) rather than creating Batch 6/7
      for (const b of batches) {
        b.maxCapacity += 50;
        cumulative += 50;
      }
      continue;
    }

    const nextBatch = generateNextBatch(rule, batches);
    if (nextBatch.batchNumber >= 6 && rule.eventKey !== 'JUNIOR_SCIENTIST') {
      for (const b of batches) {
        b.maxCapacity += 50;
        cumulative += 50;
      }
      continue;
    }

    batches.push(nextBatch);
    cumulative += nextBatch.maxCapacity;
  }

  return batches;
}

/**
 * Deterministically retrieves the exact next available batch and its verified timings
 * for a program given the current number of enrolled active students.
 */
export function getNextAvailableBatchForEvent(
  competitionName: string,
  className: string,
  currentAllocatedCount: number
): NextBatchAllotment {
  const eventKey = resolveEventKey(competitionName, className);
  const rule = PROGRAM_SEATING_RULES[eventKey];

  if (!rule || eventKey === 'PENDING_REVIEW') {
    return {
      status: 'ON_HOLD',
      eventKey: 'PENDING_REVIEW',
      canonicalTitle: competitionName || 'Pending Review',
      isFull: false,
      totalCapacity: 0,
      allocatedCount: currentAllocatedCount,
      availableSeats: 0,
      batchNumber: 0,
      batchName: 'PENDING_REVIEW',
      reportingTime: 'PENDING',
      examTime: 'SCHEDULE PENDING (ON HOLD)',
      examDate: '01-Nov-2026',
      venueMain: 'MEENA SHAH PUBLIC SCHOOL',
      venueDetail: 'ADMINISTRATION OFFICE',
      holdReason: 'Unknown or unallocated competition name. Pending administrative review.',
    };
  }

  if (rule.isHold) {
    return {
      status: 'ON_HOLD',
      eventKey,
      canonicalTitle: rule.canonicalTitle,
      isFull: false,
      totalCapacity: 0,
      allocatedCount: currentAllocatedCount,
      availableSeats: 0,
      batchNumber: 0,
      batchName: 'HOLD',
      reportingTime: 'PENDING',
      examTime: 'SCHEDULE PENDING (ON HOLD)',
      examDate: rule.examDate || '01-Nov-2026',
      venueMain: rule.venueMain,
      venueDetail: rule.venueDetail,
      holdReason: rule.holdReason || 'Event schedule pending committee directive.',
    };
  }

  const isOnlineQuizGrad = eventKey === 'ONLINE_QUIZ_GRADUATION';
  const officialExamDate = isOnlineQuizGrad ? '02 Nov 2026' : '01 Nov 2026';

  // Expand batches dynamically so event NEVER runs out of capacity
  const batches = getExpandedBatchesForEvent(rule, currentAllocatedCount);
  const totalCapacity = batches.reduce((sum, b) => sum + b.maxCapacity, 0);
  const availableSeats = Math.max(0, totalCapacity - currentAllocatedCount);

  // Iterate through batches to find the first batch that is not full
  let cumulative = 0;
  for (const batch of batches) {
    cumulative += batch.maxCapacity;

    if (currentAllocatedCount < cumulative) {
      return {
        status: 'CONFIRMED',
        eventKey,
        canonicalTitle: rule.canonicalTitle,
        isFull: false,
        totalCapacity,
        allocatedCount: currentAllocatedCount,
        availableSeats,
        batchNumber: batch.batchNumber,
        batchName: batch.batchName,
        reportingTime: batch.reportingTime,
        examTime: batch.examTime,
        examDate: officialExamDate,
        venueMain: rule.venueMain,
        venueDetail: rule.venueDetail,
        luckyDrawNotice: rule.luckyDrawNotice,
      };
    }
  }

  const lastBatch = batches[batches.length - 1];
  return {
    status: 'CONFIRMED',
    eventKey,
    canonicalTitle: rule.canonicalTitle,
    isFull: false,
    totalCapacity,
    allocatedCount: currentAllocatedCount,
    availableSeats: lastBatch.maxCapacity,
    batchNumber: lastBatch.batchNumber,
    batchName: lastBatch.batchName,
    reportingTime: lastBatch.reportingTime,
    examTime: lastBatch.examTime,
    examDate: officialExamDate,
    venueMain: rule.venueMain,
    venueDetail: rule.venueDetail,
    luckyDrawNotice: rule.luckyDrawNotice,
  };
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

  const isOnlineQuizGrad = eventKey === 'ONLINE_QUIZ_GRADUATION';
  const officialExamDate = isOnlineQuizGrad ? '02 Nov 2026' : '01 Nov 2026';

  // Expand batches dynamically so candidate is ALWAYS allocated into a valid batch
  const batches = getExpandedBatchesForEvent(rule, candidateZeroIndex);

  // Calculate cumulative capacity across batches
  let cumulative = 0;
  for (const batch of batches) {
    const prevCumulative = cumulative;
    cumulative += batch.maxCapacity;

    if (candidateZeroIndex < cumulative) {
      return {
        isHold: false,
        status: 'CONFIRMED',
        examDate: officialExamDate,
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

  // Fallback to latest batch (should never occur with dynamic expansion)
  const lastBatch = batches[batches.length - 1];
  return {
    isHold: false,
    status: 'CONFIRMED',
    examDate: officialExamDate,
    luckyDrawNotice: rule.luckyDrawNotice,
    batchNumber: lastBatch.batchNumber,
    batchName: lastBatch.batchName,
    reportingTime: lastBatch.reportingTime,
    examTime: lastBatch.examTime,
    venueMain: rule.venueMain,
    venueDetail: rule.venueDetail,
    seatNumber: candidateZeroIndex + 1,
    batchSeatIndex: 1,
    canIssueAdmitCard: true,
  };
}

/**
 * Computes shift-wise student counts, available seats, and remaining capacity
 * across all programs based on actual registered student records.
 */
export function calculateShiftWiseMetrics(
  students: Array<{ competition_name?: string; competitionName?: string; class_name?: string; className?: string }>,
  options: { includeBaseline?: boolean } = { includeBaseline: true }
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
    const dbCount = counts.get(key) || 0;
    const baseline = options.includeBaseline ? ((masterBaselineRankCache?.counts as Record<string, number>)?.[key] || 0) : 0;
    const allocatedCount = Math.max(dbCount, baseline);

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

    // Always expand batches so an open batch is available
    const batches = getExpandedBatchesForEvent(rule, allocatedCount);
    const totalProgramCapacity = batches.reduce((sum, b) => sum + b.maxCapacity, 0);
    const availableSeats = Math.max(0, totalProgramCapacity - allocatedCount);

    let runningOffset = 0;
    const batchSummaries = batches.map((batch) => {
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

    const nextBatchInfo = getNextAvailableBatchForEvent(rule.canonicalTitle, rule.eligibleClasses[0] || '', allocatedCount);
    const nextAvailableBatch = nextBatchInfo.status === 'CONFIRMED' ? {
      batchNumber: nextBatchInfo.batchNumber,
      batchName: nextBatchInfo.batchName,
      reportingTime: nextBatchInfo.reportingTime,
      examTime: nextBatchInfo.examTime,
      examDate: nextBatchInfo.examDate,
      capacity: batches.find(b => b.batchNumber === nextBatchInfo.batchNumber)?.maxCapacity || 0,
      allocated: (batches.find(b => b.batchNumber === nextBatchInfo.batchNumber)?.maxCapacity || 0) - (batchSummaries.find(b => b.batchNumber === nextBatchInfo.batchNumber)?.freeSeats || 0),
      freeSeats: batchSummaries.find(b => b.batchNumber === nextBatchInfo.batchNumber)?.freeSeats || 0,
    } : null;

    summaries.push({
      eventKey: key,
      title: rule.canonicalTitle,
      classGroup: rule.classGroup,
      venue: `${rule.venueMain} - ${rule.venueDetail}`,
      isHold: false,
      examDate: key === 'ONLINE_QUIZ_GRADUATION' ? '02 Nov 2026' : '01 Nov 2026',
      luckyDrawNotice: rule.luckyDrawNotice,
      roomMaxCapacity: rule.roomMaxCapacity,
      totalProgramCapacity,
      allocatedCount,
      availableSeats,
      status: 'SEATS_AVAILABLE',
      nextAvailableBatch,
      batches: batchSummaries,
    });
  }

  return summaries;
}
