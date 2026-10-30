import { getDb } from '../src/lib/db';
import { getEventCandidateCountMap, resolveEventKey } from '../src/lib/pdf/event-schedule';
import { PROGRAM_SEATING_RULES } from '../src/lib/allocation/seating-rules';

async function main() {
  const db = getDb();
  const dbStudents = await db.getAllActiveStudents();
  const eventCountsFromSchedule = getEventCandidateCountMap();

  console.log('Comparing counts for all event keys:');
  const dbCounts = new Map<string, number>();
  for (const s of dbStudents) {
    const key = resolveEventKey(s.competitionName, s.className);
    dbCounts.set(key, (dbCounts.get(key) || 0) + 1);
  }

  for (const key of Object.keys(PROGRAM_SEATING_RULES)) {
    const dbC = dbCounts.get(key) || 0;
    const schedC = eventCountsFromSchedule.get(key) || 0;
    console.log(`${key.padEnd(25)} DB: ${dbC.toString().padEnd(5)} Master/Schedule: ${schedC.toString().padEnd(5)} Diff: ${schedC - dbC}`);
  }
}

main().catch(console.error);

