import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/permissions';
import { isValidIndianMobile } from '@/lib/whatsapp/message-builder';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (!hasPermission(user, 'students.read') && !hasPermission(user, 'messages.prepare'))) {
      return NextResponse.json({ error: 'Unauthorized: insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
    const search = searchParams.get('search') || '';
    const competition = searchParams.get('competition') || '';
    const schoolOrCollege = searchParams.get('schoolOrCollege') || '';
    const whatsappStatus = searchParams.get('whatsappStatus') || '';
    const all = searchParams.get('all') === 'true';

    const db = getDb();
    const allActive = await db.getAllActiveStudents();

    // Unique competitions and schools for filter options
    const competitions = Array.from(new Set(allActive.map((s) => s.competitionName).filter(Boolean))).sort();
    const schools = Array.from(new Set(allActive.map((s) => s.schoolOrCollege).filter(Boolean))).sort();

    // Stats across all active students
    const totalActive = allActive.length;
    let sentCount = 0;
    let pendingCount = 0;
    let invalidPhoneCount = 0;

    for (const s of allActive) {
      if (s.whatsappStatus === 'SENT' || s.whatsappStatus === 'OPENED') {
        sentCount++;
      } else {
        pendingCount++;
      }
      if (!isValidIndianMobile(s.phone)) {
        invalidPhoneCount++;
      }
    }

    if (all) {
      // Filter list according to criteria without pagination
      let filtered = [...allActive];
      if (competition) {
        filtered = filtered.filter((s) => s.competitionName.toLowerCase() === competition.toLowerCase());
      }
      if (schoolOrCollege) {
        filtered = filtered.filter((s) => s.schoolOrCollege.toLowerCase().includes(schoolOrCollege.toLowerCase()));
      }
      if (whatsappStatus && whatsappStatus !== 'ALL') {
        filtered = filtered.filter((s) => (s.whatsappStatus || 'NOT_SENT') === whatsappStatus);
      }
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(
          (s) =>
            s.registrationNumber.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.fatherName.toLowerCase().includes(q) ||
            s.phone.includes(q) ||
            s.schoolOrCollege.toLowerCase().includes(q)
        );
      }

      return NextResponse.json({
        students: filtered,
        total: filtered.length,
        stats: {
          totalActive,
          sentCount,
          pendingCount,
          invalidPhoneCount,
        },
        competitions,
        schools,
      });
    }

    // Paginated query
    const result = await db.getStudents({
      page,
      pageSize,
      search,
      competition: competition || undefined,
      schoolOrCollege: schoolOrCollege || undefined,
      whatsappStatus: whatsappStatus || undefined,
      status: 'ACTIVE',
    });

    return NextResponse.json({
      ...result,
      stats: {
        totalActive,
        sentCount,
        pendingCount,
        invalidPhoneCount,
      },
      competitions,
      schools,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to query WhatsApp candidates' }, { status: 500 });
  }
}
