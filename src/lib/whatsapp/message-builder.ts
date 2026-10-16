import { Student, SystemSettings } from '@/types';
import { normalizePhone } from '@/lib/excel/normalizer';

export function buildStudentWhatsAppMessage(student: Student, settings: SystemSettings): string {
  return (
    `*MIND-SPARK COMPETITION CONFIRMATION*\n\n` +
    `Dear *${student.name}*,\n\n` +
    `Your registration for the *${student.competitionName}* is confirmed!\n\n` +
    `📋 *Registration No:* ${student.registrationNumber}\n` +
    `🏫 *School/College:* ${student.schoolOrCollege}\n` +
    `📅 *Exam Date:* ${settings.examDate}\n` +
    `⏰ *Reporting Time:* ${settings.reportingTime}\n` +
    `📍 *Venue:* ${settings.venue}\n\n` +
    `Please ensure you carry a printed copy of your Admit Card and your School ID card on the exam day.\n\n` +
    `For any assistance, contact ${settings.contactPhone} or email ${settings.contactEmail}.\n` +
    `Best wishes from Mind-Spark Organizing Committee!`
  );
}

export function generateWhatsAppLink(student: Student, settings: SystemSettings): string {
  const cleanPhone = normalizePhone(student.phone);
  const message = buildStudentWhatsAppMessage(student, settings);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/91${cleanPhone}?text=${encodedText}`;
}
