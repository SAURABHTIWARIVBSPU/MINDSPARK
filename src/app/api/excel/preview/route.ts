import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { ExcelImporter } from '@/lib/excel/importer';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'imports.create');

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Limit to 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const preview = await ExcelImporter.preview(buffer, file.name, user!.uid);

    return NextResponse.json(preview);
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
