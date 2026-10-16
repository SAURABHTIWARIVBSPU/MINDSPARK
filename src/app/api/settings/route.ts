import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const settings = await db.getSettings();
    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'settings.manage');

    const body = await req.json();
    const db = getDb();
    const updated = await db.updateSettings(body);

    await db.addAuditLog({
      actorUid: user!.uid,
      actorEmail: user!.email,
      action: 'SETTINGS_UPDATED',
      targetType: 'SETTINGS',
      targetId: 'system_settings',
      details: body,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
