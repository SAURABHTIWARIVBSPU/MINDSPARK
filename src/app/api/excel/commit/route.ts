import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { ExcelImporter } from '@/lib/excel/importer';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'imports.review');

    const body = await req.json();
    const { importId, evaluatedRows, options } = body;

    if (!importId || !Array.isArray(evaluatedRows)) {
      return NextResponse.json({ error: 'Invalid commit payload' }, { status: 400 });
    }

    const result = await ExcelImporter.commit(importId, evaluatedRows, user!.uid, options);

    return NextResponse.json({
      success: true,
      committedCount: result.committedCount,
      studentIds: result.studentIds,
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
