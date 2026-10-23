import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { getAllAvailableTemplates, WHATSAPP_TEMPLATES } from '@/lib/whatsapp/message-builder';
import { CustomWhatsAppTemplate } from '@/types';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
    }

    const db = getDb();
    const settings = await db.getSettings();
    const templates = getAllAvailableTemplates(settings);

    // Official base templates with metadata
    const officialBase = Object.values(WHATSAPP_TEMPLATES).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      content: t.defaultText,
      categoryFilter: t.categoryFilter || 'ALL',
      classFilter: 'ALL',
      version: 1,
      active: true,
      language: 'bilingual' as const,
      isOfficial: true,
      updatedAt: '2026-10-23T00:00:00.000Z',
    }));

    return NextResponse.json({
      templates,
      customTemplates: settings.customTemplates || [],
      officialTemplates: officialBase,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    const {
      id,
      title,
      description,
      content,
      categoryFilter = 'ALL',
      classFilter = 'ALL',
      language = 'bilingual',
      active = true,
      metaTemplateName,
      metaLanguage,
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Template title and content are required' }, { status: 400 });
    }

    const db = getDb();
    const settings = await db.getSettings();
    const customList = Array.isArray(settings.customTemplates) ? [...settings.customTemplates] : [];

    const now = new Date().toISOString();
    const templateId = id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const existingIdx = customList.findIndex((t) => t.id === templateId);
    const existing = existingIdx >= 0 ? customList[existingIdx] : null;

    let newVersion = 1;
    const history = existing && Array.isArray(existing.versionsHistory) ? [...existing.versionsHistory] : [];

    if (existing) {
      // If content was modified, bump version and archive current version
      const contentChanged = existing.content.trim() !== content.trim();
      newVersion = contentChanged ? (existing.version || 1) + 1 : (existing.version || 1);
      if (contentChanged) {
        history.unshift({
          version: existing.version || 1,
          content: existing.content,
          updatedAt: existing.updatedAt || now,
          updatedBy: existing.createdBy || 'Admin',
        });
      }
    }

    const newTemplate: CustomWhatsAppTemplate = {
      id: templateId,
      title: title.trim(),
      description: description?.trim() || '',
      content: content.trim(),
      categoryFilter: categoryFilter || 'ALL',
      classFilter: classFilter || 'ALL',
      version: newVersion,
      versionsHistory: history.slice(0, 20), // retain up to 20 past versions
      active: active !== false,
      language: language || 'bilingual',
      metaTemplateName: metaTemplateName?.trim() || 'admit_card_new',
      metaLanguage: metaLanguage?.trim() || 'en',
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      createdBy: user.email || user.displayName || 'Admin',
    };

    if (existingIdx >= 0) {
      customList[existingIdx] = newTemplate;
    } else {
      customList.push(newTemplate);
    }

    await db.updateSettings({ customTemplates: customList });

    await db.addAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: existing ? 'WHATSAPP_TEMPLATE_UPDATED' : 'WHATSAPP_TEMPLATE_CREATED',
      targetType: 'WHATSAPP',
      targetId: templateId,
      details: {
        title: newTemplate.title,
        categoryFilter: newTemplate.categoryFilter,
        classFilter: newTemplate.classFilter,
        version: newTemplate.version,
      },
    });

    return NextResponse.json({
      success: true,
      template: newTemplate,
      customTemplates: customList,
      message: `Template '${newTemplate.title}' (v${newTemplate.version}) saved successfully!`,
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
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

    if (!id) {
      return NextResponse.json({ error: 'Template ID required for deletion' }, { status: 400 });
    }

    const db = getDb();
    const settings = await db.getSettings();
    const customList = Array.isArray(settings.customTemplates) ? [...settings.customTemplates] : [];

    const filtered = customList.filter((t) => t.id !== id);
    if (filtered.length === customList.length) {
      return NextResponse.json({ error: 'Custom template not found or built-in templates cannot be deleted' }, { status: 404 });
    }

    await db.updateSettings({ customTemplates: filtered });

    await db.addAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'WHATSAPP_TEMPLATE_DELETED',
      targetType: 'WHATSAPP',
      targetId: id,
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
      customTemplates: filtered,
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
