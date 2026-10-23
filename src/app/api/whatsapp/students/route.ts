import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/permissions';
import {
  isValidIndianMobile,
  resolveStudentWhatsAppGroup,
  normalizeClassCategory,
  normalizeCompetitionCategory,
  OFFICIAL_WHATSAPP_GROUPS,
} from '@/lib/whatsapp/message-builder';
import { CLASS_CATEGORIES } from '../groups/route';

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
    const classCategory = searchParams.get('classCategory') || searchParams.get('class') || '';
    const schoolOrCollege = searchParams.get('schoolOrCollege') || '';
    const whatsappStatus = searchParams.get('whatsappStatus') || '';
    const campaignId = searchParams.get('campaignId') || '';
    const templateId = searchParams.get('templateId') || '';
    const groupId = searchParams.get('groupId') || '';
    const all = searchParams.get('all') === 'true';

    const db = getDb();
    const settings = await db.getSettings();
    const allActive = await db.getAllActiveStudents();

    // Unique competitions and schools for filter options
    const competitions = Array.from(new Set(allActive.map((s) => s.competitionName).filter(Boolean))).sort();
    const schools = Array.from(new Set(allActive.map((s) => s.schoolOrCollege).filter(Boolean))).sort();

    // Stats across all active students
    const totalActive = allActive.length;
    let sentCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let invalidPhoneCount = 0;

    for (const s of allActive) {
      if (s.whatsappStatus === 'SENT' || s.whatsappStatus === 'DELIVERED' || s.whatsappStatus === 'READ' || s.whatsappStatus === 'OPENED') {
        sentCount++;
      } else if (s.whatsappStatus === 'FAILED') {
        failedCount++;
      } else {
        pendingCount++;
      }
      if (!isValidIndianMobile(s.phone)) {
        invalidPhoneCount++;
      }
    }

    // Competition-wise breakdown
    const competitionStats: Record<string, { total: number; sent: number; pending: number; failed: number }> = {};
    for (const comp of competitions) {
      competitionStats[comp] = { total: 0, sent: 0, pending: 0, failed: 0 };
    }

    // Class category breakdown
    const classCategoryStats: Record<string, { total: number; sent: number; pending: number; failed: number }> = {};
    for (const cCat of CLASS_CATEGORIES) {
      classCategoryStats[cCat] = { total: 0, sent: 0, pending: 0, failed: 0 };
    }

    // Group breakdown
    const configuredGroups = Array.isArray(settings.whatsappGroupLinks) && settings.whatsappGroupLinks.length > 0
      ? settings.whatsappGroupLinks
      : OFFICIAL_WHATSAPP_GROUPS;

    const groupStats: Record<string, { total: number; sent: number; pending: number; failed: number; groupName: string; url: string }> = {};
    for (const g of configuredGroups) {
      groupStats[g.id] = { total: 0, sent: 0, pending: 0, failed: 0, groupName: g.groupName, url: g.url };
    }

    // Pre-calculate per-student resolved groups and statistics
    const studentGroupMap = new Map<string, ReturnType<typeof resolveStudentWhatsAppGroup>>();
    for (const s of allActive) {
      const resGroup = resolveStudentWhatsAppGroup(s, settings);
      studentGroupMap.set(s.studentId, resGroup);

      const comp = s.competitionName || 'OTHER';
      if (!competitionStats[comp]) {
        competitionStats[comp] = { total: 0, sent: 0, pending: 0, failed: 0 };
      }
      competitionStats[comp].total++;

      const cNorm = normalizeClassCategory(s.className);
      if (!classCategoryStats[cNorm]) {
        classCategoryStats[cNorm] = { total: 0, sent: 0, pending: 0, failed: 0 };
      }
      classCategoryStats[cNorm].total++;

      const matchedGroup = configuredGroups.find((g) => g.url.trim() === resGroup.groupLink.trim());
      if (matchedGroup && groupStats[matchedGroup.id]) {
        groupStats[matchedGroup.id].total++;
      }

      const isSent = s.whatsappStatus === 'SENT' || s.whatsappStatus === 'DELIVERED' || s.whatsappStatus === 'READ' || s.whatsappStatus === 'OPENED';
      const isFailed = s.whatsappStatus === 'FAILED';

      if (isSent) {
        competitionStats[comp].sent++;
        classCategoryStats[cNorm].sent++;
        if (matchedGroup && groupStats[matchedGroup.id]) groupStats[matchedGroup.id].sent++;
      } else if (isFailed) {
        competitionStats[comp].failed++;
        classCategoryStats[cNorm].failed++;
        if (matchedGroup && groupStats[matchedGroup.id]) groupStats[matchedGroup.id].failed++;
      } else {
        competitionStats[comp].pending++;
        classCategoryStats[cNorm].pending++;
        if (matchedGroup && groupStats[matchedGroup.id]) groupStats[matchedGroup.id].pending++;
      }
    }

    // Filter pipeline
    let filtered = [...allActive];

    if (competition && competition !== 'ALL') {
      const nCompFilter = normalizeCompetitionCategory(competition);
      filtered = filtered.filter((s) => normalizeCompetitionCategory(s.competitionName) === nCompFilter);
    }

    if (classCategory && classCategory !== 'ALL') {
      const nClsFilter = normalizeClassCategory(classCategory);
      filtered = filtered.filter((s) => normalizeClassCategory(s.className) === nClsFilter);
    }

    if (schoolOrCollege) {
      filtered = filtered.filter((s) => s.schoolOrCollege.toLowerCase().includes(schoolOrCollege.toLowerCase()));
    }

    if (whatsappStatus && whatsappStatus !== 'ALL') {
      if (whatsappStatus === 'SENT') {
        filtered = filtered.filter((s) => s.whatsappStatus === 'SENT' || s.whatsappStatus === 'DELIVERED' || s.whatsappStatus === 'READ' || s.whatsappStatus === 'OPENED');
      } else if (whatsappStatus === 'NOT_SENT') {
        filtered = filtered.filter((s) => !s.whatsappStatus || s.whatsappStatus === 'NOT_SENT');
      } else {
        filtered = filtered.filter((s) => (s.whatsappStatus || 'NOT_SENT') === whatsappStatus);
      }
    }

    if (campaignId && campaignId !== 'ALL') {
      filtered = filtered.filter((s) => {
        return Array.isArray(s.messageHistory) && s.messageHistory.some((m) => m.campaignId === campaignId);
      });
    }

    if (templateId && templateId !== 'ALL') {
      filtered = filtered.filter((s) => {
        return s.lastTemplateId === templateId || (Array.isArray(s.messageHistory) && s.messageHistory.some((m) => m.templateId === templateId));
      });
    }

    if (groupId && groupId !== 'ALL') {
      const targetGroup = configuredGroups.find((g) => g.id === groupId);
      if (targetGroup) {
        filtered = filtered.filter((s) => {
          const res = studentGroupMap.get(s.studentId);
          return res && res.groupLink.trim() === targetGroup.url.trim();
        });
      }
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.registrationNumber.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.fatherName.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.schoolOrCollege.toLowerCase().includes(q) ||
          (s.className && s.className.toLowerCase().includes(q))
      );
    }

    // Attach resolved group info to each returned student
    const enrichStudent = (s: typeof allActive[0]) => {
      const res = studentGroupMap.get(s.studentId) || resolveStudentWhatsAppGroup(s, settings);
      return {
        ...s,
        resolvedGroupLink: res.groupLink,
        resolvedGroupName: res.groupName,
        classCategory: res.classCategory,
        competitionCategory: res.competitionCategory,
      };
    };

    if (all) {
      return NextResponse.json({
        students: filtered.map(enrichStudent),
        total: filtered.length,
        stats: {
          totalActive,
          sentCount,
          pendingCount,
          failedCount,
          invalidPhoneCount,
        },
        competitions,
        competitionStats,
        classCategories: CLASS_CATEGORIES,
        classCategoryStats,
        groupStats,
        schools,
      });
    }

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedStudents = filtered.slice(startIndex, startIndex + pageSize).map(enrichStudent);

    return NextResponse.json({
      students: paginatedStudents,
      total,
      page,
      pageSize,
      totalPages,
      stats: {
        totalActive,
        sentCount,
        pendingCount,
        failedCount,
        invalidPhoneCount,
      },
      competitions,
      competitionStats,
      classCategories: CLASS_CATEGORIES,
      classCategoryStats,
      groupStats,
      schools,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to query WhatsApp candidates' }, { status: 500 });
  }
}
