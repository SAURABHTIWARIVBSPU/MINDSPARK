import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getStorageAdapter } from '@/lib/storage';
import {
  generateAdmitCardPdf,
  computeStudentDataHash,
  ADMIT_CARD_TEMPLATE_VERSION,
} from '@/lib/pdf/template';
import { matchesDob } from '@/lib/excel/normalizer';
import { downloadRateLimiter, failedDobGuard, getClientIp } from '@/lib/security/rate-limiter';
import { getAdmitCardReleaseStatus } from '@/lib/admit-card/release-gate';
import { getStudentEventSchedule } from '@/lib/pdf/event-schedule';

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

    if (!regNo) {
      return NextResponse.json(
        { error: 'Registration Number parameter is required' },
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

    const cleanRegNo = regNo.trim().toUpperCase().replace(/[\s\u200B-\u200D\uFEFF\u00A0]/g, '');

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

    // Check if competition is on hold as per Events Deatails.xlsx directives
    const eventSched = getStudentEventSchedule(
      student.competitionName || '',
      student.className || '',
      student.registrationNumber
    );

    if (eventSched.isHold && !bypassDateLock) {
      return NextResponse.json(
        {
          error: `${eventSched.holdReason || 'This competition schedule is currently on hold by the examination committee. Official Admit Card will be released once the revised schedule is confirmed.'}`,
          onHold: true,
          canDownload: false,
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

    // Verify Date of Birth only if explicitly provided
    if (dob && student.dateOfBirth && !matchesDob(student.dateOfBirth, dob)) {
      return NextResponse.json(
        { error: 'Date of Birth verification failed.' },
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

    const storage = getStorageAdapter();
    const cardRecord = await db.getAdmitCardByStudentId(student.studentId);
    const expectedHash = computeStudentDataHash(student, ADMIT_CARD_TEMPLATE_VERSION);

    let pdfBytes: Uint8Array | null = null;
    if (cardRecord?.fileId && cardRecord.sourceDataHash === expectedHash && cardRecord.status === 'READY') {
      try {
        pdfBytes = await storage.getFile(cardRecord.fileId);
      } catch (storageErr) {
        console.warn('Storage fetch fallback to dynamic generation:', storageErr);
      }
    }

    // Generate fresh on-the-fly if not in storage or template version updated
    if (!pdfBytes) {
      const settings = await db.getSettings();
      pdfBytes = await generateAdmitCardPdf(student, settings);

      try {
        const fileName = `AdmitCard_${student.registrationNumber}_${student.name.replace(/\s+/g, '_')}.pdf`;
        const { fileId, storageType } = await storage.saveFile(fileName, pdfBytes, 'application/pdf');
        const now = new Date().toISOString();
        await db.saveAdmitCard({
          studentId: student.studentId,
          registrationNumber: student.registrationNumber,
          fileId,
          storageType,
          templateVersion: ADMIT_CARD_TEMPLATE_VERSION,
          sourceDataHash: expectedHash,
          status: 'READY',
          generatedAt: now,
          updatedAt: now,
        });
      } catch (cacheErr) {
        console.warn('Admit card background cache save warning:', cacheErr);
      }
    }

    const safeFileName = `AdmitCard_${student.registrationNumber}_${student.name.replace(/\s+/g, '_')}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
        'Content-Length': String(pdfBytes.length),
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
