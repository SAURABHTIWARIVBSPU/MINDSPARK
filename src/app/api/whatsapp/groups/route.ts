import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import {
  OFFICIAL_WHATSAPP_GROUPS,
  resolveStudentWhatsAppGroup,
  normalizeCompetitionCategory,
  normalizeClassCategory,
  OFFICIAL_COMPETITION_CATEGORIES,
  CLASS_CATEGORIES,
} from '@/lib/whatsapp/message-builder';
import { WhatsAppGroupLinkItem } from '@/types';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
    }

    const db = getDb();
    const settings = await db.getSettings();
    const students = await db.getAllActiveStudents();

    // Use admin-configured groups if present, otherwise default to official 18 groups
    const configuredGroups: WhatsAppGroupLinkItem[] =
      Array.isArray(settings?.whatsappGroupLinks) && settings.whatsappGroupLinks.length > 0
        ? settings.whatsappGroupLinks
        : OFFICIAL_WHATSAPP_GROUPS;

    // Calculate dynamic student count per group based on verified Master database records
    const countsMap = new Map<string, number>();
    for (const g of configuredGroups) {
      countsMap.set(g.id, 0);
    }

    let unassignedCount = 0;
    for (const student of students) {
      const res = resolveStudentWhatsAppGroup(student, settings);
      const matchedGroup = configuredGroups.find((g) => g.url.trim() === res.groupLink.trim());
      if (matchedGroup) {
        countsMap.set(matchedGroup.id, (countsMap.get(matchedGroup.id) || 0) + 1);
      } else {
        unassignedCount++;
      }
    }

    const groupsWithCounts = configuredGroups.map((g) => ({
      ...g,
      studentCount: countsMap.get(g.id) || 0,
    }));

    // Extract unique competitions from students and official list
    const registeredCompetitions = Array.from(
      new Set([
        ...OFFICIAL_COMPETITION_CATEGORIES,
        ...students.map((s) => s.competitionName).filter(Boolean),
      ])
    ).sort();

    return NextResponse.json({
      success: true,
      groups: groupsWithCounts,
      totalStudents: students.length,
      unassignedCount,
      competitions: registeredCompetitions,
      classCategories: CLASS_CATEGORIES,
      defaultWhatsAppGroupLink: settings.defaultWhatsAppGroupLink || 'https://chat.whatsapp.com/DTuxN2SADVdCm714xkPB3L?s=cl&p=a&mlu=4&ilr=4',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch WhatsApp groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
    }
    assertPermission(user, 'settings.manage');

    const body = await req.json();
    const { id, groupName, competition, classRange, url, description } = body;

    if (!groupName || !url) {
      return NextResponse.json({ error: 'Group Name and WhatsApp Invite URL are required' }, { status: 400 });
    }

    // Validate WhatsApp invite link structure
    const trimmedUrl = url.trim();
    if (!trimmedUrl.includes('chat.whatsapp.com/')) {
      return NextResponse.json(
        { error: 'Invalid WhatsApp Group Link. Must be an official invite link (e.g. https://chat.whatsapp.com/...)' },
        { status: 400 }
      );
    }

    const db = getDb();
    const settings = await db.getSettings();

    const currentGroups: WhatsAppGroupLinkItem[] =
      Array.isArray(settings.whatsappGroupLinks) && settings.whatsappGroupLinks.length > 0
        ? [...settings.whatsappGroupLinks]
        : [...OFFICIAL_WHATSAPP_GROUPS];

    const groupId = id || `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const existingIndex = currentGroups.findIndex((g) => g.id === groupId);

    const now = new Date().toISOString();
    const updatedItem: WhatsAppGroupLinkItem = {
      id: groupId,
      groupName: groupName.trim(),
      competition: (competition || 'GENERAL').trim(),
      classRange: (classRange || 'All').trim(),
      url: trimmedUrl,
      description: description?.trim() || '',
      isOfficial: existingIndex >= 0 ? currentGroups[existingIndex].isOfficial : false,
      updatedAt: now,
      updatedBy: user.email || user.displayName || 'Admin',
    };

    if (existingIndex >= 0) {
      currentGroups[existingIndex] = updatedItem;
    } else {
      currentGroups.push(updatedItem);
    }

    // Also sync to legacy categoryWhatsAppLinks for backwards compatibility
    const catMap = { ...(settings.categoryWhatsAppLinks || {}) };
    catMap[updatedItem.competition] = trimmedUrl;

    await db.updateSettings({
      whatsappGroupLinks: currentGroups,
      categoryWhatsAppLinks: catMap,
    });

    await db.addAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: existingIndex >= 0 ? 'WHATSAPP_GROUP_LINK_UPDATED' : 'WHATSAPP_GROUP_LINK_CREATED',
      targetType: 'WHATSAPP',
      targetId: groupId,
      details: {
        groupName: updatedItem.groupName,
        competition: updatedItem.competition,
        classRange: updatedItem.classRange,
        url: updatedItem.url,
      },
    });

    return NextResponse.json({
      success: true,
      group: updatedItem,
      groups: currentGroups,
      message: `WhatsApp Group '${updatedItem.groupName}' saved successfully!`,
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Failed to save WhatsApp group link' }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
    }
    assertPermission(user, 'settings.manage');

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const resetToOfficial = searchParams.get('reset') === 'true';

    const db = getDb();

    if (resetToOfficial) {
      await db.updateSettings({ whatsappGroupLinks: OFFICIAL_WHATSAPP_GROUPS });
      await db.addAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'WHATSAPP_GROUPS_RESET_OFFICIAL',
        targetType: 'WHATSAPP',
        targetId: 'all',
      });
      return NextResponse.json({
        success: true,
        message: 'Successfully reset to the 18 official Mind Spark 2026 WhatsApp groups',
        groups: OFFICIAL_WHATSAPP_GROUPS,
      });
    }

    if (!id) {
      return NextResponse.json({ error: 'Group ID is required for deletion' }, { status: 400 });
    }

    const settings = await db.getSettings();
    const currentGroups: WhatsAppGroupLinkItem[] =
      Array.isArray(settings.whatsappGroupLinks) && settings.whatsappGroupLinks.length > 0
        ? [...settings.whatsappGroupLinks]
        : [...OFFICIAL_WHATSAPP_GROUPS];

    const filtered = currentGroups.filter((g) => g.id !== id);

    await db.updateSettings({ whatsappGroupLinks: filtered });

    await db.addAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'WHATSAPP_GROUP_LINK_DELETED',
      targetType: 'WHATSAPP',
      targetId: id,
    });

    return NextResponse.json({
      success: true,
      message: 'Group link removed successfully',
      groups: filtered,
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Failed to delete WhatsApp group link' }, { status });
  }
}
