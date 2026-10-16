import { NextResponse } from 'next/server';
import { destroySession, getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      const db = getDb();
      await db.addAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        action: 'USER_LOGOUT',
        targetType: 'USER',
        targetId: user.uid,
      });
    }

    await destroySession();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
