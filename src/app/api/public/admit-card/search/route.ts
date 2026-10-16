import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { matchesDob } from '@/lib/excel/normalizer';
import { searchRateLimiter, getClientIp } from '@/lib/security/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Rate Limiting (Brute-Force Guard)
    const clientIp = getClientIp(req);
    // Allow up to 10 searches per 60 seconds per IP
    const rateCheck = searchRateLimiter.check(clientIp, 10, 60);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many verification attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfterSeconds),
            'X-RateLimit-Limit': String(rateCheck.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetAt / 1000)),
          },
        }
      );
    }

    const body = await req.json();
    const { registrationNumber, dateOfBirth } = body;

    if (!registrationNumber || !dateOfBirth) {
      return NextResponse.json(
        { error: 'Registration Number and Date of Birth are required' },
        { status: 400 }
      );
    }

    const cleanRegNo = registrationNumber.trim().toUpperCase();

    const db = getDb();
    const student = await db.getStudentByRegNo(cleanRegNo);

    if (!student || student.status === 'VOID') {
      return NextResponse.json(
        { error: `No student record found with Registration Number '${cleanRegNo}'. Please verify your credentials or contact the examination committee.` },
        { status: 404 }
      );
    }

    // Verify Date of Birth (supports DD-MM-YYYY, YYYY-MM-DD, or YYYY)
    if (!matchesDob(student.dateOfBirth, dateOfBirth)) {
      return NextResponse.json(
        { error: 'Date of Birth does not match our records for this Registration Number.' },
        { status: 401 }
      );
    }

    const settings = await db.getSettings();

    // Return student details for display
    return NextResponse.json(
      {
        success: true,
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
          'X-RateLimit-Limit': String(rateCheck.limit),
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
