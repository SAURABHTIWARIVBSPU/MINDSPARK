import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { initTestStaffRegistry } from '@/lib/excel/test-staff-manager';

export async function GET(req: NextRequest) {
  try {
    initTestStaffRegistry();
    const filePath = path.join(process.cwd(), 'Test_Teachers_And_Staff_Registry.xlsx');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Test Staff Registry file not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Test_Teachers_And_Staff_Registry.xlsx"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
