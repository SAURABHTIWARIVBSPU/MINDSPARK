import { describe, it, expect } from 'vitest';
import {
  renderMessageTemplate,
  generateWhatsAppLink,
  isValidIndianMobile,
  WHATSAPP_TEMPLATES,
  WHATSAPP_MERGE_TAGS,
  OFFICIAL_COMPETITION_TEMPLATES,
  OFFICIAL_WHATSAPP_GROUPS,
  getRecommendedTemplateForStudent,
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
    expect(msg).toContain('After 26th October, we will provide a link on your WhatsApp Group to download your admit card');
    expect(msg).toContain('Link: https://chat.whatsapp.com/OnlineQuiz2026');
    expect(msg).toContain('Team Meena Shah Public School, Gonda');
  });

  it('provides all 18 dedicated official competition templates with accurate group URLs and guidelines', () => {
    expect(OFFICIAL_COMPETITION_TEMPLATES).toHaveLength(18);
    expect(OFFICIAL_WHATSAPP_GROUPS).toHaveLength(18);

    for (const tpl of OFFICIAL_COMPETITION_TEMPLATES) {
      expect(tpl.id).toBeTruthy();
      expect(tpl.title).toBeTruthy();
      expect(tpl.categoryFilter).toBeTruthy();
      expect(tpl.classFilter).toBeTruthy();
      expect(tpl.groupUrl).toMatch(/^https:\/\/chat\.whatsapp\.com\//);
      expect(tpl.defaultText).toContain('Meena Shah Public School, Gonda');
      expect(tpl.defaultText).toContain('{name}');
      expect(tpl.defaultText).toContain('{reg_no}');
      expect(tpl.defaultText).toContain('{whatsapp_group_link}');
      expect(tpl.isOfficial).toBe(true);
    }
  });

  it('correctly recommends matching official competition template for each candidate', () => {
    // 1. Online Quiz (Graduation)
    const gradStudent: Student = { ...mockStudent, competitionName: 'ONLINE QUIZ', className: 'Graduation' };
    expect(getRecommendedTemplateForStudent(gradStudent).id).toBe('tpl_online_quiz_grad');

    // 2. Online Quiz (Class 9)
    const quiz9Student: Student = { ...mockStudent, competitionName: 'ONLINE QUIZ', className: '9' };
    expect(getRecommendedTemplateForStudent(quiz9Student).id).toBe('tpl_online_quiz_9_10');

    // 3. Online Quiz (Class 12)
    const quiz12Student: Student = { ...mockStudent, competitionName: 'ONLINE QUIZ', className: '12' };
    expect(getRecommendedTemplateForStudent(quiz12Student).id).toBe('tpl_online_quiz_11_12');

    // 4. Young Innovators (Class 10)
    const innovatorStudent: Student = { ...mockStudent, competitionName: 'YOUNG INNOVATORS', className: '10' };
    expect(getRecommendedTemplateForStudent(innovatorStudent).id).toBe('tpl_young_innovators_9_10');

    // 5. Clay Champs (Class 1)
    const clayStudent: Student = { ...mockStudent, competitionName: 'CLAY CHAMPS', className: '1' };
    expect(getRecommendedTemplateForStudent(clayStudent).id).toBe('tpl_clay_champs_1');

    // 6. Essay Writing (All Classes)
    const essayStudent: Student = { ...mockStudent, competitionName: 'ESSAY WRITING', className: '7' };
    expect(getRecommendedTemplateForStudent(essayStudent).id).toBe('tpl_essay_writing');

    // 7. Complete the picture (UKG)
    const ukgStudent: Student = { ...mockStudent, competitionName: 'COMPLETE THE PICTURE AND COLOUR', className: 'UKG' };
    expect(getRecommendedTemplateForStudent(ukgStudent).id).toBe('tpl_complete_the_picture_ukg');

    // 8. Handmade Fancy Dress (Play Group)
    const pgStudent: Student = { ...mockStudent, competitionName: 'UNIQUE AND CREATIVE HANDMADE FANCY DRESS', className: 'Play Group' };
    expect(getRecommendedTemplateForStudent(pgStudent).id).toBe('tpl_handmade_fancy_playgroup');
  });

  it('renders competition-specific template with student data and official group link', () => {
    const quizGradTpl = OFFICIAL_COMPETITION_TEMPLATES.find((t: any) => t.id === 'tpl_online_quiz_grad');
    expect(quizGradTpl).toBeDefined();

    const student: Student = {
      ...mockStudent,
      name: 'VIVEK VERMA',
      registrationNumber: 'MS269999',
      competitionName: 'ONLINE QUIZ',
      className: 'Graduation',
      schoolOrCollege: 'MSITM DEGREE COLLEGE',
    };

    const rendered = renderMessageTemplate(quizGradTpl!.defaultText, student, mockSettings);
    expect(rendered).toContain('VIVEK VERMA');
    expect(rendered).toContain('MS269999');
    expect(rendered).toContain('Your form has been successfully Registered for Mind Spark Competition 2026.');
    expect(rendered).toContain('After 26th October, we will provide a link on your WhatsApp Group to download your admit card.');
    expect(rendered).toContain('https://chat.whatsapp.com/FnBeq6O9TIyIGvbJiK6quw');
  });

  it('automatically auto-fills registration number and group link even if template is pasted without merge tags', () => {
    const rawPastedTemplate =
      `*Meena Shah Public School, Gonda*\n` +
      `*Mind Spark Competition- 2026*\n\n` +
      `Dear Participant,\n\n` +
      `Your form has been successfully Registered for Mind Spark Competition 2026.\n` +
      `This is your Registration Number:\n\n` +
      ` After 26th October, we will provide a link on your WhatsApp Group to download your admit card. \n\n` +
      `*नोट: आप सभी प्रतिभागियों के लिए नीचे दिए गए अपने Competition से संबंधित व्हाट्सएप ग्रुप लिंक पर क्लिक करके जॉइन करना अनिवार्य है।*\n` +
      `👇\n` +
      `Link:\n\n` +
      `*Thank you,*\n` +
      `*Team Meena Shah Public School, Gonda*`;

    const student: Student = {
      ...mockStudent,
      name: 'SUNIL YADAV',
      registrationNumber: 'MS265500',
      competitionName: 'ESSAY WRITING',
    };

    const rendered = renderMessageTemplate(rawPastedTemplate, student, mockSettings);
    expect(rendered).toContain('Dear Participant (SUNIL YADAV),');
    expect(rendered).toContain('This is your Registration Number: MS265500');
    expect(rendered).toContain('Link: https://chat.whatsapp.com/KoiQ7KE6j11HlstZw68WJ3?s=cl&p=a&mlu=4&ilr=4');
  });
});

