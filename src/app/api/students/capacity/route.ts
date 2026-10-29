import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { calculateShiftWiseMetrics } from '@/lib/allocation/seating-engine';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'students.read');

    const db = getDb();
    const students = await db.getAllActiveStudents();

    const metrics = calculateShiftWiseMetrics(students);

    // Compute campus-wide totals
    const totalEnrolled = students.length;
    let totalActiveCapacity = 0;
    let totalAllocatedActive = 0;
    let totalHold = 0;

    for (const m of metrics) {
      if (m.isHold) {
        totalHold += m.allocatedCount;
      } else {
        totalActiveCapacity += m.totalProgramCapacity;
        totalAllocatedActive += m.allocatedCount;
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        totalEnrolled,
        totalActiveCapacity,
        totalAllocatedActive,
        totalAvailableSeats: Math.max(0, totalActiveCapacity - totalAllocatedActive),
        totalHold,
      },
      metrics,
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
