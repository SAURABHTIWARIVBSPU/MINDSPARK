import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { matchesDob } from '@/lib/excel/normalizer';
import { searchRateLimiter, failedDobGuard, getClientIp } from '@/lib/security/rate-limiter';
import { getAdmitCardReleaseStatus } from '@/lib/admit-card/release-gate';

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Rate Limiting (Brute-Force Guard)
    const clientIp = getClientIp(req);
    // Allow up to 60 searches per 60 seconds per IP (supports cyber cafes and school labs)
    const rateCheck = searchRateLimiter.check(clientIp, 60, 60);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many verification attempts from this network. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfterSeconds),
            'X-RateLimit-Limit': String(rateCheck.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetAt / 1000)),
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    const body = await req.json();
    const { registrationNumber, dateOfBirth } = body;

    if (!registrationNumber || !dateOfBirth) {
      return NextResponse.json(
        { error: 'Registration Number and Date of Birth are required' },
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

    const cleanRegNo = registrationNumber.trim().toUpperCase();

    // 2. Check if this IP is temporarily locked for this Registration Number (prevents cross-IP DoS attacks)
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
        { error: `No student record found with Registration Number '${cleanRegNo}'. Please verify your credentials or contact the examination committee.` },
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
    if (!matchesDob(student.dateOfBirth, dateOfBirth)) {
      const failStatus = failedDobGuard.recordFailure(compositeKey, 5, 900);
      failedDobGuard.recordFailure(ipFailKey, 15, 900); // Also protects against distributed scanning from a single IP

      const remainingMsg = failStatus.locked
        ? 'Maximum attempts exceeded from your network. This lookup is temporarily locked for 15 minutes.'
        : `(${failStatus.remainingAttempts} attempts remaining before temporary lockout)`;

      return NextResponse.json(
        { error: `Date of Birth does not match our records for this Registration Number. ${remainingMsg}` },
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

    // Verification successful: Clear any previous failed attempts for this composite key
    failedDobGuard.recordSuccess(compositeKey);

    const settings = await db.getSettings();
    const releaseStatus = getAdmitCardReleaseStatus();

    // Return student details and download gating status for display
    return NextResponse.json(
      {
        success: true,
        canDownload: releaseStatus.canDownload,
        releaseStatus,
        student: {
          studentId: student.studentId,
          registrationNumber: student.registrationNumber,
          name: student.name,
          fatherName: student.fatherName,
          dateOfBirth: student.dateOfBirth,
          schoolOrCollege: student.schoolOrCollege,
          className: student.className,
          competitionName: student.competitionName,
        },
        schedule: {
          examDate: settings.examDate,
          reportingTime: settings.reportingTime,
          venue: settings.venue,
          schoolName: settings.schoolName,
          competitionTitle: settings.competitionTitle,
          contactPhone: settings.contactPhone,
          contactEmail: settings.contactEmail,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-RateLimit-Limit': String(rateCheck.limit),
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
