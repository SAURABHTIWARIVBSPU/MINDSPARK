import { describe, it, expect } from 'vitest';
import {
  renderMessageTemplate,
  generateWhatsAppLink,
  isValidIndianMobile,
  WHATSAPP_TEMPLATES,
  WHATSAPP_MERGE_TAGS,
} from '@/lib/whatsapp/message-builder';
import { Student, SystemSettings } from '@/types';

describe('WhatsApp Message Builder & Template Engine', () => {
  const mockStudent: Student = {
    studentId: 'std_test_1',
    registrationNumber: 'MS261001',
    name: 'AMIT KUMAR',
    fatherName: 'RAMESH KUMAR',
    dateOfBirth: '2008-05-15',
    phone: '9876543210',
    schoolOrCollege: 'ST XAVIERS INTER COLLEGE',
    className: '10',
    competitionName: 'MATH OLYMPIAD 2026',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    createdBy: 'test_user',
    updatedAt: new Date().toISOString(),
    updatedBy: 'test_user',
    dataVersion: 1,
  };

  const mockSettings: SystemSettings = {
    schoolName: 'Mind-Spark Inter-School Competition',
    competitionTitle: 'Annual Academic Olympiad',
    venue: 'MSITM DEGREE COLLEGE GONDA',
    examDate: '01 Nov 2026',
    reportingTime: '09:00 AM',
    contactPhone: '9876543210',
    contactEmail: 'help@mindspark.edu.in',
    regNoPrefix: 'MS',
    regNoYear: '26',
    regNoSeqCurrent: 1000,
  };

  it('validates 10-digit Indian mobile numbers correctly', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true);
    expect(isValidIndianMobile('8765432109')).toBe(true);
    expect(isValidIndianMobile('7654321098')).toBe(true);
    expect(isValidIndianMobile('6543210987')).toBe(true);
    expect(isValidIndianMobile('+91 9876543210')).toBe(true);
    expect(isValidIndianMobile('09876543210')).toBe(true);

    // Invalid numbers
    expect(isValidIndianMobile('1234567890')).toBe(false); // starts with 1
    expect(isValidIndianMobile('987654321')).toBe(false); // only 9 digits
    expect(isValidIndianMobile('98765432100')).toBe(false); // 11 digits
    expect(isValidIndianMobile('abcdefghij')).toBe(false);
    expect(isValidIndianMobile('')).toBe(false);
  });

  it('interpolates all dynamic candidate tags into template', () => {
    const template = 'Hello {name}, Reg: {reg_no}, Father: {father_name}, School: {school}, Date: {exam_date}, Venue: {venue}';
    const result = renderMessageTemplate(template, mockStudent, mockSettings);

    expect(result).toContain('Hello AMIT KUMAR');
    expect(result).toContain('Reg: MS261001');
    expect(result).toContain('Father: RAMESH KUMAR');
    expect(result).toContain('School: ST XAVIERS INTER COLLEGE');
    expect(result).toContain('Date: 01 Nov 2026');
    expect(result).toContain('Venue: MSITM DEGREE COLLEGE GONDA');
  });

  it('handles Admit Card Ready template with dynamic link', () => {
    const tpl = WHATSAPP_TEMPLATES.ADMIT_CARD_READY.defaultText;
    const result = renderMessageTemplate(tpl, mockStudent, mockSettings, 'https://mindspark.edu.in');

    expect(result).toContain('AMIT KUMAR');
    expect(result).toContain('MS261001');
    expect(result).toContain('https://mindspark.edu.in/admit-card?regNo=MS261001');
  });

  it('generates encoded wa.me click-to-chat URL', () => {
    const link = generateWhatsAppLink(mockStudent, mockSettings);
    expect(link).toContain('https://wa.me/919876543210?text=');
    expect(link).toContain(encodeURIComponent('AMIT KUMAR'));
    expect(link).toContain(encodeURIComponent('MS261001'));
  });

  it('supports custom text message override in generateWhatsAppLink', () => {
    const customText = 'Urgent Notice: Dear {name}, please report at {venue}';
    const link = generateWhatsAppLink(mockStudent, mockSettings, customText);

    expect(link).toContain('https://wa.me/919876543210?text=');
    expect(decodeURIComponent(link)).toContain('Urgent Notice: Dear AMIT KUMAR, please report at MSITM DEGREE COLLEGE GONDA');
  });

  it('provides all expected merge tags metadata', () => {
    expect(WHATSAPP_MERGE_TAGS.length).toBeGreaterThanOrEqual(10);
    const tags = WHATSAPP_MERGE_TAGS.map((t) => t.tag);
    expect(tags).toContain('{name}');
    expect(tags).toContain('{reg_no}');
    expect(tags).toContain('{venue}');
    expect(tags).toContain('{exam_date}');
    expect(tags).toContain('{whatsapp_group_link}');
    expect(tags).toContain('{dob}');
  });

  it('dynamically resolves category-specific WhatsApp group links', () => {
    const customSettings: SystemSettings = {
      ...mockSettings,
      categoryWhatsAppLinks: {
        'ONLINE QUIZ': 'https://chat.whatsapp.com/OnlineQuiz2026',
        'PAINT YOUR IMAGINATION': 'https://chat.whatsapp.com/ArtPainting2026',
      },
      defaultWhatsAppGroupLink: 'https://chat.whatsapp.com/MindSparkGeneral',
    };

    const quizStudent: Student = { ...mockStudent, competitionName: 'ONLINE QUIZ' };
    const artStudent: Student = { ...mockStudent, competitionName: 'PAINT YOUR IMAGINATION' };
    const unlistedStudent: Student = { ...mockStudent, competitionName: 'OTHER EVENT' };

    const tpl = 'Join group: {whatsapp_group_link}';
    expect(renderMessageTemplate(tpl, quizStudent, customSettings)).toContain('https://chat.whatsapp.com/OnlineQuiz2026');
    expect(renderMessageTemplate(tpl, artStudent, customSettings)).toContain('https://chat.whatsapp.com/ArtPainting2026');
    expect(renderMessageTemplate(tpl, unlistedStudent, customSettings)).toContain('https://chat.whatsapp.com/MindSparkGeneral');
  });

  it('renders official Mind Spark 2026 Enrollment Confirmation with registration number and category group link', () => {
    const customSettings: SystemSettings = {
      ...mockSettings,
      categoryWhatsAppLinks: {
        'ONLINE QUIZ': 'https://chat.whatsapp.com/OnlineQuiz2026',
      },
    };
    const student: Student = {
      ...mockStudent,
      name: 'PRIYA SINGH',
      registrationNumber: 'MS261044',
      competitionName: 'ONLINE QUIZ',
    };

    const tpl = WHATSAPP_TEMPLATES.REGISTRATION_CONFIRMATION.defaultText;
    const msg = renderMessageTemplate(tpl, student, customSettings);

    expect(msg).toContain('Meena Shah Public School, Gonda');
    expect(msg).toContain('Mind Spark Competition- 2026');
    expect(msg).toContain('Dear Participant (PRIYA SINGH),');
    expect(msg).toContain('This is your Registration Number: MS261044');
    expect(msg).toContain('After 26th October, we will provide a link on your WhatsApp to download your admit card');
    expect(msg).toContain('Link: https://chat.whatsapp.com/OnlineQuiz2026');
    expect(msg).toContain('Team Meena Shah Public School, Gonda');
  });
});
