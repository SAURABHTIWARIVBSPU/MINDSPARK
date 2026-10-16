import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { ROLE_PERMISSIONS } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null, permissions: [] });
    }

    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return NextResponse.json({ user, permissions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
