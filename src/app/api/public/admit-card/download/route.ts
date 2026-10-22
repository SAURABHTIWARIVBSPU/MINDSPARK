import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getStorageAdapter } from '@/lib/storage';
import { generateAdmitCardPdf } from '@/lib/pdf/template';
import { matchesDob } from '@/lib/excel/normalizer';
import { downloadRateLimiter, getClientIp } from '@/lib/security/rate-limiter';
import { getAdmitCardReleaseStatus } from '@/lib/admit-card/release-gate';

export async function GET(req: NextRequest) {
  try {
    // 1. Rate Limiting for Download endpoint
    const clientIp = getClientIp(req);
    // Allow up to 20 downloads per 60 seconds per IP
    const rateCheck = downloadRateLimiter.check(clientIp, 20, 60);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many download attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfterSeconds),
            'X-RateLimit-Limit': String(rateCheck.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const regNo = searchParams.get('regNo');
    const dob = searchParams.get('dob');

    if (!regNo || !dob) {
      return NextResponse.json(
        { error: 'Registration Number and Date of Birth parameters are required' },
        { status: 400 }
      );
    }

    const bypassDateLock =
      searchParams.get('bypassDateLock') === 'true' ||
      searchParams.get('adminPreview') === 'true';

    // 2. Enforce 25 October download window
    const releaseStatus = getAdmitCardReleaseStatus();
    if (!releaseStatus.canDownload && !bypassDateLock) {
      return NextResponse.json(
        {
          error: `${releaseStatus.messageHindi} (${releaseStatus.messageEnglish})`,
          canDownload: false,
          releaseStatus,
        },
        { status: 403 }
      );
    }

    const cleanRegNo = regNo.trim().toUpperCase();

    const db = getDb();
    const student = await db.getStudentByRegNo(cleanRegNo);

    if (!student || student.status === 'VOID') {
      return NextResponse.json(
        { error: 'Student registration not found' },
        { status: 404 }
      );
    }

    // Verify Date of Birth (supports DD-MM-YYYY, YYYY-MM-DD, or YYYY)
    if (!matchesDob(student.dateOfBirth, dob)) {
      return NextResponse.json(
        { error: 'Date of Birth verification failed' },
        { status: 401 }
      );
    }

    const storage = getStorageAdapter();
    const cardRecord = await db.getAdmitCardByStudentId(student.studentId);

    let pdfBytes: Uint8Array | null = null;
    if (cardRecord?.fileId) {
      pdfBytes = await storage.getFile(cardRecord.fileId);
    }

    // Generate fresh on-the-fly if not in storage
    if (!pdfBytes) {
      const settings = await db.getSettings();
      pdfBytes = await generateAdmitCardPdf(student, settings);
    }

    const safeFileName = `AdmitCard_${student.registrationNumber}_${student.name.replace(/\s+/g, '_')}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
        'X-RateLimit-Limit': String(rateCheck.limit),
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
