import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getStorageAdapter } from '@/lib/storage';
import { generateAdmitCardPdf } from '@/lib/pdf/template';
import { matchesDob } from '@/lib/excel/normalizer';
import { downloadRateLimiter, failedDobGuard, getClientIp } from '@/lib/security/rate-limiter';
import { getAdmitCardReleaseStatus } from '@/lib/admit-card/release-gate';

export async function GET(req: NextRequest) {
  try {
    // 1. Rate Limiting for Download endpoint
    const clientIp = getClientIp(req);
    // Allow up to 60 downloads per 60 seconds per IP (supports cyber cafes and school labs)
    const rateCheck = downloadRateLimiter.check(clientIp, 60, 60);

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
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
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
        { 
          status: 400,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }

    const sessionCookie = req.cookies.get('ms_auth_session')?.value;
    const bypassDateLock =
      searchParams.get('bypassDateLock') === 'true' ||
      searchParams.get('adminPreview') === 'true' ||
      Boolean(sessionCookie);

    // 2. Enforce 25 October download window
    const releaseStatus = getAdmitCardReleaseStatus();
    if (!releaseStatus.canDownload && !bypassDateLock) {
      return NextResponse.json(
        {
          error: `${releaseStatus.messageHindi} (${releaseStatus.messageEnglish})`,
          canDownload: false,
          releaseStatus,
        },
        { 
          status: 403,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }

    const cleanRegNo = regNo.trim().toUpperCase();

    // Check if this IP is temporarily locked for this Registration Number (prevents cross-IP DoS attacks)
    const compositeKey = `${clientIp}:${cleanRegNo}`;
    const ipFailKey = `ip:${clientIp}`;

    const lockCheck = failedDobGuard.isLocked(compositeKey);
    const ipLockCheck = failedDobGuard.isLocked(ipFailKey);

    if (lockCheck.locked || ipLockCheck.locked) {
      const retryAfter = Math.max(lockCheck.retryAfterSeconds, ipLockCheck.retryAfterSeconds);
      return NextResponse.json(
        {
          error: `Too many failed Date of Birth verification attempts. For security, access is temporarily locked from your network. Please wait ${retryAfter} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    const db = getDb();
    const student = await db.getStudentByRegNo(cleanRegNo);

    if (!student || student.status === 'VOID') {
      return NextResponse.json(
        { error: 'Student registration not found' },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }

    // Verify Date of Birth (supports DD-MM-YYYY, YYYY-MM-DD, or YYYY)
    if (!matchesDob(student.dateOfBirth, dob)) {
      const failStatus = failedDobGuard.recordFailure(compositeKey, 5, 900);
      failedDobGuard.recordFailure(ipFailKey, 15, 900);

      const remainingMsg = failStatus.locked
        ? 'Maximum attempts exceeded from your network. This download is temporarily locked for 15 minutes.'
        : `(${failStatus.remainingAttempts} attempts remaining before temporary lockout)`;

      return NextResponse.json(
        { error: `Date of Birth verification failed. ${remainingMsg}` },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }

    // Successful verification clears failure tracking for this composite key
    failedDobGuard.recordSuccess(compositeKey);

    const storage = getStorageAdapter();
    const cardRecord = await db.getAdmitCardByStudentId(student.studentId);

    let pdfBytes: Uint8Array | null = null;
    if (cardRecord?.fileId) {
      try {
        pdfBytes = await storage.getFile(cardRecord.fileId);
      } catch (storageErr) {
        console.warn('Storage fetch fallback to dynamic generation:', storageErr);
      }
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
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-RateLimit-Limit': String(rateCheck.limit),
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
