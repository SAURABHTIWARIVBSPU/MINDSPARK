import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { generateMasterExcel } from '@/lib/excel/exporter';

export async function GET() {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'exports.master');

    const db = getDb();
    const students = await db.getAllActiveStudents();
    const settings = await db.getSettings();

    const excelBytes = generateMasterExcel(students, settings.schoolName);

    await db.addAuditLog({
      actorUid: user!.uid,
      actorEmail: user!.email,
      action: 'MASTER_EXCEL_EXPORTED',
      targetType: 'EXPORT',
      targetId: 'master_export',
      details: {
        recordCount: students.length,
      },
    });

    return new NextResponse(Buffer.from(excelBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="MindSpark_Master_Export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
