import { describe, it, expect } from 'vitest';
import {
  getCategoryGroupLink,
  resolveStudentWhatsAppGroup,
  normalizeClassCategory,
  normalizeCompetitionCategory,
  renderMessageTemplate,
  OFFICIAL_WHATSAPP_GROUPS,
  WHATSAPP_TEMPLATES,
} from '@/lib/whatsapp/message-builder';
import { Student, SystemSettings } from '@/types';

describe('Official WhatsApp Groups & Class-Wise Mapping (Mind Spark 2026)', () => {
  const baseStudent: Student = {
    studentId: 'std_test',
    registrationNumber: 'MS261100001',
    name: 'MOHAMMAD AAYAN',
    fatherName: 'ARMAN ULLAH',
    dateOfBirth: '2014-01-01',
    phone: '6387278566',
    schoolOrCollege: 'MEENA SHAH PUBLIC SCHOOL',
    className: '3',
    competitionName: 'PAINT YOUR IMAGINATION',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    createdBy: 'test_admin',
    updatedAt: new Date().toISOString(),
    updatedBy: 'test_admin',
    dataVersion: 1,
  };

  const emptySettings: SystemSettings = {
    schoolName: 'Meena Shah Public School, Gonda',
    competitionTitle: 'Mind Spark Competition- 2026',
    venue: 'MSITM DEGREE COLLEGE GONDA',
    examDate: '01 Nov 2026',
    reportingTime: '09:00 AM',
    contactPhone: '8707744749',
    contactEmail: 'tabrezaalam92@gmail.com',
    regNoPrefix: 'MS',
    regNoYear: '26',
    regNoSeqCurrent: 1000,
  };

  it('contains exactly 18 official WhatsApp groups with correct URLs', () => {
    expect(OFFICIAL_WHATSAPP_GROUPS).toHaveLength(18);

    const essay = OFFICIAL_WHATSAPP_GROUPS.find((g) => g.groupName.includes('Essay Writing'));
    expect(essay?.url).toBe('https://chat.whatsapp.com/KoiQ7KE6j11HlstZw68WJ3?s=cl&p=a&mlu=4&ilr=4');

    const quizGrad = OFFICIAL_WHATSAPP_GROUPS.find((g) => g.groupName.includes('Online Quiz (Graduation)'));
    expect(quizGrad?.url).toBe('https://chat.whatsapp.com/FnBeq6O9TIyIGvbJiK6quw');

    const quiz910 = OFFICIAL_WHATSAPP_GROUPS.find((g) => g.groupName.includes('Online Quiz (9–10)'));
    expect(quiz910?.url).toBe('https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe');

    const quiz1112 = OFFICIAL_WHATSAPP_GROUPS.find((g) => g.groupName.includes('Online Quiz (11–12)'));
    expect(quiz1112?.url).toBe('https://chat.whatsapp.com/HChYAjAXd2q9i9xnXbZwme');

    const fireless = OFFICIAL_WHATSAPP_GROUPS.find((g) => g.groupName.includes('Fireless Cooking'));
    expect(fireless?.url).toBe('https://chat.whatsapp.com/CoSFm1OKCzI9dQvNPgoqr0?s=cl&p=a&mlu=4&ilr=4');

    const playgroup = OFFICIAL_WHATSAPP_GROUPS.find((g) => g.groupName.includes('play group'));
    expect(playgroup?.url).toBe('https://chat.whatsapp.com/IRuKPAsQwsD3JOKvfoRlNe?s=cl&p=a&mlu=4&ilr=4');
  });

  it('correctly maps Online Quiz by student Class (9-10 vs 11-12 vs Graduation)', () => {
    // Class 9 or 10
    expect(getCategoryGroupLink('ONLINE QUIZ', emptySettings, '9')).toBe(
      'https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe'
    );
    expect(getCategoryGroupLink('ONLINE QUIZ', emptySettings, '10')).toBe(
      'https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe'
    );

    // Class 11 or 12
    expect(getCategoryGroupLink('ONLINE QUIZ', emptySettings, '11')).toBe(
      'https://chat.whatsapp.com/HChYAjAXd2q9i9xnXbZwme'
    );
    expect(getCategoryGroupLink('ONLINE QUIZ', emptySettings, '12')).toBe(
      'https://chat.whatsapp.com/HChYAjAXd2q9i9xnXbZwme'
    );

    // Graduation, BBA, BCA, Gradution
    expect(getCategoryGroupLink('ONLINE QUIZ', emptySettings, 'GRADUATION')).toBe(
      'https://chat.whatsapp.com/FnBeq6O9TIyIGvbJiK6quw'
    );
    expect(getCategoryGroupLink('ONLINE QUIZ', emptySettings, 'BCA')).toBe(
      'https://chat.whatsapp.com/FnBeq6O9TIyIGvbJiK6quw'
    );
    expect(getCategoryGroupLink('ONLINE QUIZ', emptySettings, 'BBA')).toBe(
      'https://chat.whatsapp.com/FnBeq6O9TIyIGvbJiK6quw'
    );
  });

  it('correctly maps primary and junior competition categories', () => {
    // Battle of Brains (4-5)
    expect(getCategoryGroupLink('BATTLE OF BRAINS', emptySettings, '4')).toBe(
      'https://chat.whatsapp.com/LQ4cJOtKOu2GyZp1QLh1ul?s=cl&p=a&mlu=4&ilr=4'
    );

    // Junior Scientist (6-8)
    expect(getCategoryGroupLink('JUNIOR SCIENTIST', emptySettings, '7')).toBe(
      'https://chat.whatsapp.com/DtdXSmSL9xw9iclQ8Bt3IS?s=cl&p=a&mlu=4&ilr=4'
    );

    // Clay Champs (class 1)
    expect(getCategoryGroupLink('CLAY CHAMPS', emptySettings, '1')).toBe(
      'https://chat.whatsapp.com/Civ78EDwE9w3tx3QHTfF36?s=cl&p=a&mlu=4&ilr=4'
    );

    // Join The Dots Colour (LKG)
    expect(getCategoryGroupLink('JOIN THE DOTS AND COLOUR', emptySettings, 'LKG')).toBe(
      'https://chat.whatsapp.com/CfTovkUjPoh1mtKJHKTzQw?s=cl&p=a&mlu=4&ilr=4'
    );

    // Complete The Picture & Colour (UKG)
    expect(getCategoryGroupLink('COMPLETE THE PICTURE AND COLOUR', emptySettings, 'UKG')).toBe(
      'https://chat.whatsapp.com/HK4oXdNxng7Kilg5GIkAdh?s=cl&p=a&mlu=4&ilr=4'
    );

    // Colour by Number (Nursery / Nursary)
    expect(getCategoryGroupLink('COLOUR BY NUMBER', emptySettings, 'NURSARY')).toBe(
      'https://chat.whatsapp.com/LCkLkIPQjxoLYq83H1PL7B?s=cl&p=a&mlu=4&ilr=4'
    );

    // Handmade Fancy Design (Play Group)
    expect(getCategoryGroupLink('UNIQUE AND CREATIVE HANDMADE FANCY DRESS', emptySettings, 'PLAY GROUP')).toBe(
      'https://chat.whatsapp.com/IRuKPAsQwsD3JOKvfoRlNe?s=cl&p=a&mlu=4&ilr=4'
    );
  });

  it('resolves student WhatsApp group with full metadata', () => {
    const student: Student = {
      ...baseStudent,
      name: 'ARJUN PATEL',
      className: '10',
      competitionName: 'YOUNG INNOVATORS',
    };

    const res = resolveStudentWhatsAppGroup(student, emptySettings);
    expect(res.groupLink).toBe('https://chat.whatsapp.com/LVZkMALJ7t13QS1OQeWRAp?s=cl&p=a&mlu=4&ilr=4');
    expect(res.groupName).toBe('Mind Spark Young Innovators (9–10)');
    expect(res.competitionCategory).toBe('YOUNG INNOVATORS');
    expect(res.classCategory).toBe('9-10');
    expect(res.isExactMatch).toBe(true);
  });

  it('renders official prompt template with [DYNAMIC_COMPETITION_GROUP_LINK] and [REGISTRATION_NUMBER]', () => {
    const promptTemplate =
      `Meena Shah Public School, Gonda\n\n` +
      `Mind Spark Competition- 2026\n\n` +
      `Dear Participant,\n\n` +
      `Your form has been successfully enrolled for Mind Spark Competition 2026.\n\n` +
      `This is your Registration Number: [REGISTRATION_NUMBER]\n\n` +
      `After 26th October, we will provide a link on your WhatsApp to download your admit card. You can enter your Registration Number and Date of Birth to download your admit card.\n\n` +
      `नोट: आप सभी प्रतिभागियों के लिए नीचे दिए गए अपने Competition से संबंधित व्हाट्सएप ग्रुप लिंक पर क्लिक करके जॉइन करना अनिवार्य है।\n\n` +
      `👇\n\n` +
      `Link: [DYNAMIC_COMPETITION_GROUP_LINK]\n\n` +
      `Thank you,\n\n` +
      `Team Meena Shah Public School, Gonda`;

    const student: Student = {
      ...baseStudent,
      registrationNumber: 'MS261100099',
      name: 'ANANYA VERMA',
      className: '11',
      competitionName: 'ONLINE QUIZ',
    };

    const rendered = renderMessageTemplate(promptTemplate, student, emptySettings);

    expect(rendered).toContain('This is your Registration Number: MS261100099');
    expect(rendered).toContain('Link: https://chat.whatsapp.com/HChYAjAXd2q9i9xnXbZwme');
    expect(rendered).toContain('Meena Shah Public School, Gonda');
    expect(rendered).toContain('Mind Spark Competition- 2026');
  });

  it('allows administrator to dynamically override a group link without code changes', () => {
    const adminCustomSettings: SystemSettings = {
      ...emptySettings,
      whatsappGroupLinks: [
        {
          id: 'grp_custom_quiz_9_10',
          groupName: 'Mind Spark Online Quiz (9–10) - New Link',
          competition: 'ONLINE QUIZ',
          classRange: '9-10',
          url: 'https://chat.whatsapp.com/UpdatedOnlineQuizLink910',
          isOfficial: true,
        },
      ],
    };

    const student: Student = {
      ...baseStudent,
      className: '9',
      competitionName: 'ONLINE QUIZ',
    };

    const link = getCategoryGroupLink(student.competitionName, adminCustomSettings, student.className);
    expect(link).toBe('https://chat.whatsapp.com/UpdatedOnlineQuizLink910');
  });
});
