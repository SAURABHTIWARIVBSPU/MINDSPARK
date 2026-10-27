import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { matchesDob } from '@/lib/excel/normalizer';
import { searchRateLimiter, failedDobGuard, getClientIp } from '@/lib/security/rate-limiter';
import { getAdmitCardReleaseStatus } from '@/lib/admit-card/release-gate';
import { getStudentEventSchedule } from '@/lib/pdf/event-schedule';

function formatDobToDmy(raw?: string): string {
  if (!raw) return 'N/A';
  const s = String(raw).trim();
  const mYmd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (mYmd) {
    return `${mYmd[3].padStart(2, '0')}-${mYmd[2].padStart(2, '0')}-${mYmd[1]}`;
  }
  const mDmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (mDmy) {
    return `${mDmy[1].padStart(2, '0')}-${mDmy[2].padStart(2, '0')}-${mDmy[3]}`;
  }
  return s;
}

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

    if (!registrationNumber) {
      return NextResponse.json(
        { error: 'Registration Number is required' },
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

    const cleanRegNo = registrationNumber.trim().toUpperCase().replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, '');

    // 2. Check if this IP is temporarily locked (prevents brute-force attacks)
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

    // Optional DOB validation: only if dateOfBirth is explicitly provided
    if (dateOfBirth && student.dateOfBirth && !matchesDob(student.dateOfBirth, dateOfBirth)) {
      const failStatus = failedDobGuard.recordFailure(compositeKey, 5, 900);
      failedDobGuard.recordFailure(ipFailKey, 15, 900);

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

    // Clear any previous failed attempts on successful verification
    failedDobGuard.recordSuccess(compositeKey);

    const settings = await db.getSettings();
    const releaseStatus = getAdmitCardReleaseStatus();

    const eventSchedule = getStudentEventSchedule(
      student.competitionName || '',
      student.className || '',
      student.registrationNumber
    );

    const isHold = eventSchedule.isHold;
    const canDownload = releaseStatus.canDownload && !isHold;

    // Return student details and download gating status for display
    return NextResponse.json(
      {
        success: true,
        canDownload,
        onHold: isHold,
        holdReason: isHold ? (eventSchedule.holdReason || 'Event schedule is currently on hold by the examination committee.') : null,
        releaseStatus,
        student: {
          studentId: student.studentId,
          registrationNumber: student.registrationNumber,
          name: student.name,
          fatherName: student.fatherName,
          dateOfBirth: formatDobToDmy(student.dateOfBirth),
          schoolOrCollege: student.schoolOrCollege,
          className: student.className,
          competitionName: student.competitionName,
          phone: student.phone,
        },
        schedule: {
          examDate: settings.examDate || '01-Nov-2026',
          reportingTime: eventSchedule.reportingTime || settings.reportingTime,
          examTime: eventSchedule.examTime || settings.examTime,
          batchInfo: eventSchedule.batchInfo,
          venue: `${eventSchedule.venueMain} - ${eventSchedule.venueDetail}`,
          venueMain: eventSchedule.venueMain,
          venueDetail: eventSchedule.venueDetail,
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
