/**
 * Admit Card Release Date Guard
 * 
 * Business Rule: Candidates can verify their registration, but can only download
 * their official Admit Card starting from 25 October 2026 (IST).
 */

export const ADMIT_CARD_DOWNLOAD_START_DATE_ISO =
  process.env.NEXT_PUBLIC_ADMIT_CARD_DOWNLOAD_START_DATE || '2026-10-25T00:00:00+05:30';

export interface AdmitCardReleaseStatus {
  canDownload: boolean;
  releaseDateIso: string;
  releaseDateFormatted: string;
  messageHindi: string;
  messageEnglish: string;
  fullNoticeHindi: string;
  fullNoticeEnglish: string;
}

export function getAdmitCardReleaseStatus(currentDate: Date = new Date()): AdmitCardReleaseStatus {
  const releaseDate = new Date(ADMIT_CARD_DOWNLOAD_START_DATE_ISO);
  const canDownload = currentDate.getTime() >= releaseDate.getTime();

  return {
    canDownload,
    releaseDateIso: releaseDate.toISOString(),
    releaseDateFormatted: '25 October 2026',
    messageHindi: 'आप 25 अक्टूबर 2026 के बाद एडमिट कार्ड डाउनलोड कर पाएंगे।',
    messageEnglish: 'Admit Card download will be active from 25th October 2026.',
    fullNoticeHindi:
      'आपका रजिस्ट्रेशन सफलतापूर्वक मिल गया है और सत्यापित हो चुका है। एग्जामिनेशन एडमिट कार्ड 25 अक्टूबर 2026 से डाउनलोड करने के लिए उपलब्ध होगा।',
    fullNoticeEnglish:
      'Your registration has been successfully verified. Official Examination Admit Card download will begin on 25th October 2026.',
  };
}
