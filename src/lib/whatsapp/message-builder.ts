import { Student, SystemSettings } from '@/types';
import { normalizePhone } from '@/lib/excel/normalizer';

export type WhatsAppTemplateId =
  | 'REGISTRATION_CONFIRMATION'
  | 'ADMIT_CARD_READY'
  | 'EXAM_REMINDER'
  | 'CUSTOM';

export interface WhatsAppTemplateDef {
  id: WhatsAppTemplateId;
  title: string;
  description: string;
  defaultText: string;
}

export const WHATSAPP_MERGE_TAGS = [
  { tag: '{name}', label: 'Candidate Name', example: 'RAHUL SHARMA' },
  { tag: '{reg_no}', label: 'Registration No', example: 'MS261001' },
  { tag: '{father_name}', label: "Father's Name", example: 'SURESH SHARMA' },
  { tag: '{school}', label: 'School/College', example: 'DAV PUBLIC SCHOOL' },
  { tag: '{class}', label: 'Class', example: '10' },
  { tag: '{competition}', label: 'Competition Category', example: 'MATH OLYMPIAD' },
  { tag: '{exam_date}', label: 'Exam Date', example: '01 Nov 2026' },
  { tag: '{reporting_time}', label: 'Reporting Time', example: '09:00 AM' },
  { tag: '{venue}', label: 'Exam Venue', example: 'MSITM DEGREE COLLEGE' },
  { tag: '{contact_phone}', label: 'Helpdesk Phone', example: '9876543210' },
  { tag: '{admit_card_url}', label: 'Admit Card Link', example: 'https://mindspark.edu.in/admit-card' },
] as const;

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateId, WhatsAppTemplateDef> = {
  REGISTRATION_CONFIRMATION: {
    id: 'REGISTRATION_CONFIRMATION',
    title: 'Registration Confirmation',
    description: 'Welcome greeting and official registration details',
    defaultText:
      `*MIND-SPARK COMPETITION CONFIRMATION*\n\n` +
      `Dear *{name}*,\n\n` +
      `Your registration for *{competition}* is officially confirmed!\n\n` +
      `📋 *Registration No:* {reg_no}\n` +
      `🏫 *School/College:* {school}\n` +
      `📅 *Exam Date:* {exam_date}\n` +
      `⏰ *Reporting Time:* {reporting_time}\n` +
      `📍 *Venue:* {venue}\n\n` +
      `Please ensure you carry a printed copy of your Admit Card and School ID on the exam day.\n\n` +
      `For any query, contact Helpdesk: {contact_phone}.\n` +
      `Best wishes from Mind-Spark Organizing Team!`,
  },
  ADMIT_CARD_READY: {
    id: 'ADMIT_CARD_READY',
    title: 'Admit Card Released',
    description: 'Notify candidate that admit card is ready for download',
    defaultText:
      `*MIND-SPARK ADMIT CARD RELEASED*\n\n` +
      `Dear *{name}*,\n\n` +
      `Your Admit Card for *{competition}* is now available for download!\n\n` +
      `📋 *Registration No:* {reg_no}\n` +
      `📅 *Exam Date:* {exam_date}\n` +
      `⏰ *Reporting Time:* {reporting_time}\n` +
      `📍 *Venue:* {venue}\n\n` +
      `📥 *Download your Admit Card:* {admit_card_url}\n\n` +
      `Please print in A4 format and bring your original School ID.\n` +
      `Helpdesk: {contact_phone}`,
  },
  EXAM_REMINDER: {
    id: 'EXAM_REMINDER',
    title: 'Exam Day Reminder',
    description: 'Urgent reminder sent 24-48 hours prior to exam',
    defaultText:
      `*IMPORTANT REMINDER: MIND-SPARK EXAM*\n\n` +
      `Dear *{name}*,\n\n` +
      `This is a gentle reminder that your *{competition}* examination will be conducted on:\n\n` +
      `📅 *Date:* {exam_date}\n` +
      `⏰ *Reporting Time:* {reporting_time}\n` +
      `📍 *Venue:* {venue}\n` +
      `📋 *Registration No:* {reg_no}\n\n` +
      `⚠️ Mandatory Checklist:\n` +
      `1. Printed Admit Card\n` +
      `2. School Identity Card\n` +
      `3. Blue/Black Ballpoint pen\n\n` +
      `In case of any difficulty, call {contact_phone}. Good luck!`,
  },
  CUSTOM: {
    id: 'CUSTOM',
    title: 'Custom Announcement',
    description: 'Custom composed announcement with merge tags',
    defaultText:
      `*IMPORTANT ANNOUNCEMENT - MIND-SPARK*\n\n` +
      `Dear *{name}* ({reg_no}),\n\n` +
      `Please be informed regarding *{competition}*:\n\n` +
      `📅 Exam Date: {exam_date}\n` +
      `📍 Venue: {venue}\n\n` +
      `For assistance: {contact_phone}`,
  },
};

/**
 * Validates whether an Indian mobile phone number has 10 clean digits starting with 6-9.
 */
export function isValidIndianMobile(phone: any): boolean {
  const cleaned = normalizePhone(phone);
  return /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Replace dynamic merge tags with candidate and settings values.
 */
export function renderMessageTemplate(
  templateText: string,
  student: Student,
  settings: SystemSettings,
  baseUrl: string = ''
): string {
  if (!templateText) return '';

  const cleanBaseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  const admitCardUrl = cleanBaseUrl
    ? `${cleanBaseUrl}/admit-card?regNo=${encodeURIComponent(student.registrationNumber)}`
    : `https://mindspark.edu.in/admit-card?regNo=${encodeURIComponent(student.registrationNumber)}`;

  const replacements: Record<string, string> = {
    '{name}': student.name || 'Candidate',
    '{student_name}': student.name || 'Candidate',
    '{reg_no}': student.registrationNumber || '',
    '{registration_number}': student.registrationNumber || '',
    '{father_name}': student.fatherName || '',
    '{school}': student.schoolOrCollege || '',
    '{school_name}': student.schoolOrCollege || '',
    '{class}': student.className || '',
    '{class_name}': student.className || '',
    '{competition}': student.competitionName || settings.competitionTitle || 'Olympiad',
    '{competition_name}': student.competitionName || settings.competitionTitle || 'Olympiad',
    '{exam_date}': settings.examDate || '',
    '{reporting_time}': settings.reportingTime || '',
    '{venue}': settings.venue || '',
    '{contact_phone}': settings.contactPhone || '',
    '{contact_email}': settings.contactEmail || '',
    '{admit_card_url}': admitCardUrl,
  };

  let rendered = templateText;
  for (const [tag, value] of Object.entries(replacements)) {
    rendered = rendered.split(tag).join(value);
  }

  return rendered;
}

/**
 * Backwards compatible helper for single candidate registration confirmation.
 */
export function buildStudentWhatsAppMessage(
  student: Student,
  settings: SystemSettings,
  customText?: string
): string {
  if (customText && customText.trim()) {
    return renderMessageTemplate(customText, student, settings);
  }
  return renderMessageTemplate(WHATSAPP_TEMPLATES.REGISTRATION_CONFIRMATION.defaultText, student, settings);
}

/**
 * Generates official click-to-chat `wa.me` URL with pre-composed message text.
 */
export function generateWhatsAppLink(
  student: Student,
  settings: SystemSettings,
  customText?: string
): string {
  const cleanPhone = normalizePhone(student.phone);
  const message = buildStudentWhatsAppMessage(student, settings, customText);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/91${cleanPhone}?text=${encodedText}`;
}
