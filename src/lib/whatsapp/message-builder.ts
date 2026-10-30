import { Student, SystemSettings, WhatsAppGroupLinkItem } from '@/types';
import { normalizePhone } from '@/lib/excel/normalizer';
import { getStudentEventSchedule } from '@/lib/pdf/event-schedule';

export type WhatsAppTemplateId =
  | 'REGISTRATION_CONFIRMATION'
  | 'ADMIT_CARD_READY'
  | 'EXAM_REMINDER'
  | 'CUSTOM'
  | (string & {});

export interface WhatsAppTemplateDef {
  id: string;
  title: string;
  description: string;
  defaultText: string;
  categoryFilter?: string;
  classFilter?: string;
  version?: number;
  isCustom?: boolean;
  isOfficial?: boolean;
  groupLinkId?: string;
  groupUrl?: string;
  metaTemplateName?: string;
}

/**
 * All 18 Official WhatsApp Group Communities for Mind Spark Competition 2026
 * Provided directly by Meena Shah Public School, Gonda.
 */
export const OFFICIAL_WHATSAPP_GROUPS: WhatsAppGroupLinkItem[] = [
  {
    id: 'grp_essay_writing',
    groupName: 'Mind Spark Essay Writing',
    competition: 'ESSAY WRITING',
    classRange: 'All',
    url: 'https://chat.whatsapp.com/KoiQ7KE6j11HlstZw68WJ3?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Mind Spark Essay Writing candidates',
    isOfficial: true,
  },
  {
    id: 'grp_online_quiz_grad',
    groupName: 'Mind Spark Online Quiz (Graduation)',
    competition: 'ONLINE QUIZ',
    classRange: 'Graduation',
    url: 'https://chat.whatsapp.com/FnBeq6O9TIyIGvbJiK6quw',
    description: 'Official WhatsApp group for Online Quiz (Graduation, BBA, BCA & College candidates)',
    isOfficial: true,
  },
  {
    id: 'grp_writing_quest_11_12',
    groupName: 'Mind Spark Writing Quest (11–12)',
    competition: 'WRITING QUEST',
    classRange: '11-12',
    url: 'https://chat.whatsapp.com/BKaf16sFinG6uj6JzfK5MI?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Writing Quest (Classes 11–12)',
    isOfficial: true,
  },
  {
    id: 'grp_online_quiz_11_12',
    groupName: 'Mind Spark Online Quiz (11–12)',
    competition: 'ONLINE QUIZ',
    classRange: '11-12',
    url: 'https://chat.whatsapp.com/HChYAjAXd2q9i9xnXbZwme',
    description: 'Official WhatsApp group for Online Quiz (Classes 11–12)',
    isOfficial: true,
  },
  {
    id: 'grp_online_quiz_9_10',
    groupName: 'Mind Spark Online Quiz (9–10)',
    competition: 'ONLINE QUIZ',
    classRange: '9-10',
    url: 'https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe',
    description: 'Official WhatsApp group for Online Quiz (Classes 9–10)',
    isOfficial: true,
  },
  {
    id: 'grp_young_innovators_9_10',
    groupName: 'Mind Spark Young Innovators (9–10)',
    competition: 'YOUNG INNOVATORS',
    classRange: '9-10',
    url: 'https://chat.whatsapp.com/LVZkMALJ7t13QS1OQeWRAp?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Young Innovators (Classes 9–10)',
    isOfficial: true,
  },
  {
    id: 'grp_fireless_cooking_6_8',
    groupName: 'Mind Spark Fireless Cooking (6–8)',
    competition: 'FIRELESS COOKING',
    classRange: '6-8',
    url: 'https://chat.whatsapp.com/CoSFm1OKCzI9dQvNPgoqr0?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Fireless Cooking (Classes 6–8)',
    isOfficial: true,
  },
  {
    id: 'grp_junior_scientist_6_8',
    groupName: 'Mind Spark Junior Scientist (6–8)',
    competition: 'JUNIOR SCIENTIST',
    classRange: '6-8',
    url: 'https://chat.whatsapp.com/DtdXSmSL9xw9iclQ8Bt3IS?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Junior Scientist (Classes 6–8)',
    isOfficial: true,
  },
  {
    id: 'grp_battle_of_brains_4_5',
    groupName: 'Mind Spark Battle of Brains(4-5)',
    competition: 'BATTLE OF BRAINS',
    classRange: '4-5',
    url: 'https://chat.whatsapp.com/LQ4cJOtKOu2GyZp1QLh1ul?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Battle of Brains (Classes 4–5)',
    isOfficial: true,
  },
  {
    id: 'grp_poster_artist_4_5',
    groupName: 'Mind Spark Poster Artist (4-5)',
    competition: 'POSTER ARTIST',
    classRange: '4-5',
    url: 'https://chat.whatsapp.com/IXFH8stCsxQFBOn4RRCziG?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Poster Artist (Classes 4–5)',
    isOfficial: true,
  },
  {
    id: 'grp_paint_your_imagination_2_3',
    groupName: 'Mind Spark Paint Your Imagination (2-3)',
    competition: 'PAINT YOUR IMAGINATION',
    classRange: '2-3',
    url: 'https://chat.whatsapp.com/LN0NdN4Ov5Z0CenxbXhc2B?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Paint Your Imagination (Classes 2–3)',
    isOfficial: true,
  },
  {
    id: 'grp_writing_stars_2_3',
    groupName: 'Mind Spark Writing Stars (2-3)',
    competition: 'WRITING STARS',
    classRange: '2-3',
    url: 'https://chat.whatsapp.com/EZdzL8T1ADm51STsu7uv6F?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Writing Stars (Classes 2–3)',
    isOfficial: true,
  },
  {
    id: 'grp_dress_to_impress_1',
    groupName: 'Mind Spark Dress To Impress (class 1)',
    competition: 'DRESS TO IMPRESS',
    classRange: '1',
    url: 'https://chat.whatsapp.com/BC3BkmIFFGM2NHR6sKJeAq?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Dress To Impress (Class 1)',
    isOfficial: true,
  },
  {
    id: 'grp_clay_champs_1',
    groupName: 'Mind Spark Clay Champs (class 1)',
    competition: 'CLAY CHAMPS',
    classRange: '1',
    url: 'https://chat.whatsapp.com/Civ78EDwE9w3tx3QHTfF36?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Clay Champs (Class 1)',
    isOfficial: true,
  },
  {
    id: 'grp_complete_the_picture_ukg',
    groupName: 'Mind Spark Complete The Picture & Colour (ukg)',
    competition: 'COMPLETE THE PICTURE AND COLOUR',
    classRange: 'UKG',
    url: 'https://chat.whatsapp.com/HK4oXdNxng7Kilg5GIkAdh?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Complete The Picture & Colour (UKG)',
    isOfficial: true,
  },
  {
    id: 'grp_join_the_dots_lkg',
    groupName: 'Mind Spark Join The Dots Colour(lkg)',
    competition: 'JOIN THE DOTS AND COLOUR',
    classRange: 'LKG',
    url: 'https://chat.whatsapp.com/CfTovkUjPoh1mtKJHKTzQw?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Join The Dots Colour (LKG)',
    isOfficial: true,
  },
  {
    id: 'grp_colour_by_number_nursery',
    groupName: 'Mind Spark Colour by Number(nursery)',
    competition: 'COLOUR BY NUMBER',
    classRange: 'Nursery',
    url: 'https://chat.whatsapp.com/LCkLkIPQjxoLYq83H1PL7B?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Colour by Number (Nursery)',
    isOfficial: true,
  },
  {
    id: 'grp_handmade_fancy_playgroup',
    groupName: 'Mind Spark Unique & Creative Handmade Fancy Design (play group)',
    competition: 'UNIQUE AND CREATIVE HANDMADE FANCY DRESS',
    classRange: 'Play Group',
    url: 'https://chat.whatsapp.com/IRuKPAsQwsD3JOKvfoRlNe?s=cl&p=a&mlu=4&ilr=4',
    description: 'Official WhatsApp group for Unique & Creative Handmade Fancy Design (Play Group)',
    isOfficial: true,
  },
];

export const CLASS_CATEGORIES = [
  'Play Group',
  'Nursery',
  'LKG',
  'UKG',
  '1',
  '2-3',
  '4-5',
  '6-8',
  '9-10',
  '11-12',
  'Graduation',
  'All',
] as const;

/**
 * Normalizes class representation into canonical categories:
 * 'Play Group' | 'Nursery' | 'LKG' | 'UKG' | '1' | '2-3' | '4-5' | '6-8' | '9-10' | '11-12' | 'Graduation'
 */
export function normalizeClassCategory(className?: string): string {
  if (!className) return 'All';
  const c = String(className).trim().toUpperCase();
  if (['PLAY GROUP', 'PLAY', 'PLAYGROUP', 'PG'].includes(c)) return 'Play Group';
  if (['NURSERY', 'NURSARY', 'NUR', 'PRE-NURSERY'].includes(c)) return 'Nursery';
  if (['LKG', 'L.K.G', 'L.K.G.'].includes(c)) return 'LKG';
  if (['UKG', 'U.K.G', 'U.K.G.'].includes(c)) return 'UKG';
  if (['1', '1ST', 'CLASS 1', 'CLASS-1', 'GRADE 1'].includes(c)) return '1';
  if (['2', '3', '2ND', '3RD', '2-3', 'CLASS 2', 'CLASS 3', '2 TO 3'].includes(c)) return '2-3';
  if (['4', '5', '4TH', '5TH', '4-5', 'CLASS 4', 'CLASS 5', '4 TO 5'].includes(c)) return '4-5';
  if (['6', '7', '8', '6TH', '7TH', '8TH', '6-8', 'CLASS 6', 'CLASS 7', 'CLASS 8', '6 TO 8'].includes(c)) return '6-8';
  if (['9', '10', '9TH', '10TH', '9-10', 'CLASS 9', 'CLASS 10', '9 TO 10'].includes(c)) return '9-10';
  if (['11', '12', '11TH', '12TH', '11-12', 'CLASS 11', 'CLASS 12', '11 TO 12'].includes(c)) return '11-12';
  if (['GRADUATION', 'GRADUTION', 'GRAD', 'BBA', 'BCA', 'BA', 'BSC', 'B.COM', 'COLLEGE'].includes(c)) return 'Graduation';
  return String(className).trim();
}

/**
 * Normalizes competition names to official canonical categories.
 */
export function normalizeCompetitionCategory(compName?: string): string {
  if (!compName) return 'GENERAL';
  const c = String(compName)
    .trim()
    .toUpperCase()
    .replace(/[&]/g, 'AND')
    .replace(/\s+/g, ' ');
  if (c.includes('ESSAY')) return 'ESSAY WRITING';
  if (c.includes('QUIZ')) return 'ONLINE QUIZ';
  if (c.includes('WRITING QUEST')) return 'WRITING QUEST';
  if (c.includes('YOUNG INNOVATOR')) return 'YOUNG INNOVATORS';
  if (c.includes('FIRELESS COOK')) return 'FIRELESS COOKING';
  if (c.includes('JUNIOR SCIENTIST')) return 'JUNIOR SCIENTIST';
  if (c.includes('BATTLE OF BRAIN')) return 'BATTLE OF BRAINS';
  if (c.includes('POSTER ARTIST')) return 'POSTER ARTIST';
  if (c.includes('PAINT YOUR IMAGINATION')) return 'PAINT YOUR IMAGINATION';
  if (c.includes('WRITING STAR')) return 'WRITING STARS';
  if (c.includes('DRESS TO IMPRESS')) return 'DRESS TO IMPRESS';
  if (c.includes('CLAY CHAMP')) return 'CLAY CHAMPS';
  if (c.includes('COMPLETE THE PICTURE')) return 'COMPLETE THE PICTURE AND COLOUR';
  if (c.includes('JOIN THE DOT')) return 'JOIN THE DOTS AND COLOUR';
  if (c.includes('COLOUR BY NUMBER') || c.includes('COLOR BY NUMBER')) return 'COLOUR BY NUMBER';
  if (c.includes('HANDMADE') || c.includes('FANCY')) return 'UNIQUE AND CREATIVE HANDMADE FANCY DRESS';
  return c;
}

/**
 * Returns both built-in templates and admin custom-created templates from settings.
 */
/**
 * 4 Universal Built-in WhatsApp Message Templates
 */
export const OFFICIAL_REGISTRATION_TEMPLATE_TEXT =
  `*Meena Shah Public School, Gonda*\n` +
  `*Mind Spark Competition- 2026*\n\n` +
  `Dear Participant ({name}),\n\n` +
  `Your form has been successfully Registered for Mind Spark Competition 2026.\n` +
  `This is your Registration Number: {reg_no}\n\n` +
  `After 26th October, we will provide a link on your WhatsApp Group to download your admit card.\n\n\n` +
  `*नोट: आप सभी प्रतिभागियों के लिए नीचे दिए गए अपने Competition से संबंधित व्हाट्सएप ग्रुप लिंक पर क्लिक करके जॉइन करना अनिवार्य है।*\n` +
  `👇\n` +
  `Link: {whatsapp_group_link}\n\n` +
  `*Thank you,*\n` +
  `*Team Meena Shah Public School, Gonda*`;

export const UNIVERSAL_TEMPLATES: WhatsAppTemplateDef[] = [
  {
    id: 'REGISTRATION_CONFIRMATION',
    title: 'Registration Confirmation (Official Mind Spark 2026)',
    description: 'Universal registration confirmation with admit card release timeline and category WhatsApp link',
    isOfficial: true,
    version: 1,
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'ADMIT_CARD_READY',
    title: 'Admit Card Released',
    description: 'Notify candidate that admit card is ready for download',
    isOfficial: true,
    version: 1,
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
  {
    id: 'EXAM_REMINDER',
    title: 'Exam Day Reminder',
    description: 'Urgent reminder sent 24-48 hours prior to exam',
    isOfficial: true,
    version: 1,
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
  {
    id: 'CUSTOM',
    title: 'Custom Announcement',
    description: 'Custom composed announcement with merge tags',
    isOfficial: true,
    version: 1,
    defaultText:
      `*IMPORTANT ANNOUNCEMENT - MIND-SPARK*\n\n` +
      `Dear *{name}* ({reg_no}),\n\n` +
      `Please be informed regarding *{competition}*:\n\n` +
      `📅 Exam Date: {exam_date}\n` +
      `📍 Venue: {venue}\n\n` +
      `For assistance: {contact_phone}`,
  },
];

/**
 * All 18 Official Competition-Specific WhatsApp Templates for Mind Spark 2026.
 * All 18 presets share the standardized official school registration layout and each links
 * directly to its official verified WhatsApp community group URL.
 */
export const OFFICIAL_COMPETITION_TEMPLATES: WhatsAppTemplateDef[] = [
  {
    id: 'tpl_essay_writing',
    title: 'Mind Spark Essay Writing (All Classes)',
    description: 'Official registration confirmation for Essay Writing (All Classes)',
    categoryFilter: 'ESSAY WRITING',
    classFilter: 'All',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_essay_writing',
    groupUrl: 'https://chat.whatsapp.com/KoiQ7KE6j11HlstZw68WJ3?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_online_quiz_grad',
    title: 'Mind Spark Online Quiz (Graduation)',
    description: 'Official registration confirmation for Online Quiz (Graduation & College Level)',
    categoryFilter: 'ONLINE QUIZ',
    classFilter: 'Graduation',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_online_quiz_grad',
    groupUrl: 'https://chat.whatsapp.com/FnBeq6O9TIyIGvbJiK6quw',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_writing_quest_11_12',
    title: 'Mind Spark Writing Quest (Classes 11–12)',
    description: 'Official registration confirmation for Writing Quest (Classes 11–12)',
    categoryFilter: 'WRITING QUEST',
    classFilter: '11-12',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_writing_quest_11_12',
    groupUrl: 'https://chat.whatsapp.com/BKaf16sFinG6uj6JzfK5MI?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_online_quiz_11_12',
    title: 'Mind Spark Online Quiz (Classes 11–12)',
    description: 'Official registration confirmation for Online Quiz (Classes 11–12)',
    categoryFilter: 'ONLINE QUIZ',
    classFilter: '11-12',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_online_quiz_11_12',
    groupUrl: 'https://chat.whatsapp.com/HChYAjAXd2q9i9xnXbZwme',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_online_quiz_9_10',
    title: 'Mind Spark Online Quiz (Classes 9–10)',
    description: 'Official registration confirmation for Online Quiz (Classes 9–10)',
    categoryFilter: 'ONLINE QUIZ',
    classFilter: '9-10',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_online_quiz_9_10',
    groupUrl: 'https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_young_innovators_9_10',
    title: 'Mind Spark Young Innovators (Classes 9–10)',
    description: 'Official registration confirmation for Young Innovators (Classes 9–10)',
    categoryFilter: 'YOUNG INNOVATORS',
    classFilter: '9-10',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_young_innovators_9_10',
    groupUrl: 'https://chat.whatsapp.com/LVZkMALJ7t13QS1OQeWRAp?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_fireless_cooking_6_8',
    title: 'Mind Spark Fireless Cooking (Classes 6–8)',
    description: 'Official registration confirmation for Fireless Cooking (Classes 6–8)',
    categoryFilter: 'FIRELESS COOKING',
    classFilter: '6-8',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_fireless_cooking_6_8',
    groupUrl: 'https://chat.whatsapp.com/CoSFm1OKCzI9dQvNPgoqr0?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_junior_scientist_6_8',
    title: 'Mind Spark Junior Scientist (Classes 6–8)',
    description: 'Official registration confirmation for Junior Scientist (Classes 6–8)',
    categoryFilter: 'JUNIOR SCIENTIST',
    classFilter: '6-8',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_junior_scientist_6_8',
    groupUrl: 'https://chat.whatsapp.com/DtdXSmSL9xw9iclQ8Bt3IS?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_battle_of_brains_4_5',
    title: 'Mind Spark Battle of Brains (Classes 4–5)',
    description: 'Official registration confirmation for Battle of Brains (Classes 4–5)',
    categoryFilter: 'BATTLE OF BRAINS',
    classFilter: '4-5',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_battle_of_brains_4_5',
    groupUrl: 'https://chat.whatsapp.com/LQ4cJOtKOu2GyZp1QLh1ul?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_poster_artist_4_5',
    title: 'Mind Spark Poster Artist (Classes 4–5)',
    description: 'Official registration confirmation for Poster Artist (Classes 4–5)',
    categoryFilter: 'POSTER ARTIST',
    classFilter: '4-5',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_poster_artist_4_5',
    groupUrl: 'https://chat.whatsapp.com/IXFH8stCsxQFBOn4RRCziG?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_paint_your_imagination_2_3',
    title: 'Mind Spark Paint Your Imagination (Classes 2–3)',
    description: 'Official registration confirmation for Paint Your Imagination (Classes 2–3)',
    categoryFilter: 'PAINT YOUR IMAGINATION',
    classFilter: '2-3',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_paint_your_imagination_2_3',
    groupUrl: 'https://chat.whatsapp.com/LN0NdN4Ov5Z0CenxbXhc2B?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_writing_stars_2_3',
    title: 'Mind Spark Writing Stars (Classes 2–3)',
    description: 'Official registration confirmation for Writing Stars (Classes 2–3)',
    categoryFilter: 'WRITING STARS',
    classFilter: '2-3',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_writing_stars_2_3',
    groupUrl: 'https://chat.whatsapp.com/EZdzL8T1ADm51STsu7uv6F?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_dress_to_impress_1',
    title: 'Mind Spark Dress To Impress (Class 1)',
    description: 'Official registration confirmation for Dress To Impress (Class 1)',
    categoryFilter: 'DRESS TO IMPRESS',
    classFilter: '1',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_dress_to_impress_1',
    groupUrl: 'https://chat.whatsapp.com/BC3BkmIFFGM2NHR6sKJeAq?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_clay_champs_1',
    title: 'Mind Spark Clay Champs (Class 1)',
    description: 'Official registration confirmation for Clay Champs (Class 1)',
    categoryFilter: 'CLAY CHAMPS',
    classFilter: '1',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_clay_champs_1',
    groupUrl: 'https://chat.whatsapp.com/Civ78EDwE9w3tx3QHTfF36?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_complete_the_picture_ukg',
    title: 'Mind Spark Complete The Picture & Colour (UKG)',
    description: 'Official registration confirmation for Complete The Picture & Colour (UKG)',
    categoryFilter: 'COMPLETE THE PICTURE AND COLOUR',
    classFilter: 'UKG',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_complete_the_picture_ukg',
    groupUrl: 'https://chat.whatsapp.com/HK4oXdNxng7Kilg5GIkAdh?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_join_the_dots_lkg',
    title: 'Mind Spark Join The Dots & Colour (LKG)',
    description: 'Official registration confirmation for Join The Dots & Colour (LKG)',
    categoryFilter: 'JOIN THE DOTS AND COLOUR',
    classFilter: 'LKG',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_join_the_dots_lkg',
    groupUrl: 'https://chat.whatsapp.com/CfTovkUjPoh1mtKJHKTzQw?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_colour_by_number_nursery',
    title: 'Mind Spark Colour by Number (Nursery)',
    description: 'Official registration confirmation for Colour by Number (Nursery)',
    categoryFilter: 'COLOUR BY NUMBER',
    classFilter: 'Nursery',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_colour_by_number_nursery',
    groupUrl: 'https://chat.whatsapp.com/LCkLkIPQjxoLYq83H1PL7B?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
  {
    id: 'tpl_handmade_fancy_playgroup',
    title: 'Mind Spark Unique & Creative Handmade Fancy Dress (Play Group)',
    description: 'Official registration confirmation for Handmade Fancy Dress (Play Group)',
    categoryFilter: 'UNIQUE AND CREATIVE HANDMADE FANCY DRESS',
    classFilter: 'Play Group',
    isOfficial: true,
    version: 1,
    groupLinkId: 'grp_handmade_fancy_playgroup',
    groupUrl: 'https://chat.whatsapp.com/IRuKPAsQwsD3JOKvfoRlNe?s=cl&p=a&mlu=4&ilr=4',
    defaultText: OFFICIAL_REGISTRATION_TEMPLATE_TEXT,
  },
];

/**
 * Complete registry of all WhatsApp templates (both Universal Presets and 18 Official Competition Templates).
 */
export const WHATSAPP_TEMPLATES: Record<string, WhatsAppTemplateDef> = {
  REGISTRATION_CONFIRMATION: UNIVERSAL_TEMPLATES[0],
  ADMIT_CARD_READY: UNIVERSAL_TEMPLATES[1],
  EXAM_REMINDER: UNIVERSAL_TEMPLATES[2],
  CUSTOM: UNIVERSAL_TEMPLATES[3],
  ...OFFICIAL_COMPETITION_TEMPLATES.reduce((acc, t) => ({ ...acc, [t.id]: t }), {}),
};

/**
 * Returns both built-in templates (Universal & 18 Competition-specific) and admin custom templates.
 */
export function getAllAvailableTemplates(settings?: SystemSettings | null): WhatsAppTemplateDef[] {
  const builtIn: WhatsAppTemplateDef[] = [
    ...UNIVERSAL_TEMPLATES,
    ...OFFICIAL_COMPETITION_TEMPLATES,
  ];
  const custom: WhatsAppTemplateDef[] = (settings?.customTemplates || []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description || 'Custom admin template',
    defaultText: t.content,
    categoryFilter: t.categoryFilter,
    classFilter: t.classFilter,
    version: t.version || 1,
    isCustom: true,
  }));
  return [...builtIn, ...custom];
}

/**
 * Resolves the recommended or matching template for a candidate based on competition and class.
 */
export function getRecommendedTemplateForStudent(
  student: Partial<Student>,
  settings?: SystemSettings | null
): WhatsAppTemplateDef {
  const all = getAllAvailableTemplates(settings);
  const nComp = normalizeCompetitionCategory(student.competitionName);
  const nCls = normalizeClassCategory(student.className);

  // 1. Check exact match in official competition templates or custom templates
  const exact = all.find((t) => {
    return (
      t.categoryFilter &&
      normalizeCompetitionCategory(t.categoryFilter) === nComp &&
      t.classFilter &&
      (normalizeClassCategory(t.classFilter) === nCls || t.classFilter === 'All')
    );
  });
  if (exact) return exact;

  // 2. Check competition match
  const compMatch = all.find((t) => {
    return (
      t.categoryFilter &&
      normalizeCompetitionCategory(t.categoryFilter) === nComp
    );
  });
  if (compMatch) return compMatch;

  // 3. Fallback to universal registration confirmation
  return WHATSAPP_TEMPLATES.REGISTRATION_CONFIRMATION;
}

export const WHATSAPP_MERGE_TAGS = [
  { tag: '{name}', label: 'Candidate Name', example: 'RAHUL SHARMA' },
  { tag: '{reg_no}', label: 'Registration No', example: 'MS261001' },
  { tag: '{father_name}', label: "Father's Name", example: 'SURESH SHARMA' },
  { tag: '{school}', label: 'School/College', example: 'DAV PUBLIC SCHOOL' },
  { tag: '{class}', label: 'Class / Grade', example: '10' },
  { tag: '{competition}', label: 'Competition Category', example: 'ONLINE QUIZ' },
  { tag: '{exam_date}', label: 'Exam Date', example: '01 Nov 2026' },
  { tag: '{reporting_time}', label: 'Reporting Time', example: '09:00 AM' },
  { tag: '{venue}', label: 'Exam Venue', example: 'MSITM DEGREE COLLEGE GONDA' },
  { tag: '{contact_phone}', label: 'Helpdesk Phone', example: '9876543210' },
  { tag: '{admit_card_url}', label: 'Admit Card Link', example: 'https://mindspark.edu.in/admit-card' },
  { tag: '{whatsapp_group_link}', label: 'Category & Class WhatsApp Group Link', example: 'https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe' },
  { tag: '{group_link}', label: 'Group Link (Alias)', example: 'https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe' },
  { tag: '{dob}', label: 'Date of Birth (DOB)', example: '15/08/2012' },
  { tag: '[REGISTRATION_NUMBER]', label: 'Registration No (Bracket Tag)', example: 'MS261001' },
  { tag: '[DYNAMIC_COMPETITION_GROUP_LINK]', label: 'Dynamic Group Link (Bracket Tag)', example: 'https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe' },
] as const;

/**
 * All official competition categories present in the Mind Spark 2026 registry.
 */
export const OFFICIAL_COMPETITION_CATEGORIES = [
  'ONLINE QUIZ',
  'PAINT YOUR IMAGINATION',
  'COLOUR BY NUMBER',
  'JOIN THE DOTS AND COLOUR',
  'COMPLETE THE PICTURE AND COLOUR',
  'UNIQUE AND CREATIVE HANDMADE FANCY DRESS',
  'BATTLE OF BRAINS',
  'JUNIOR SCIENTIST',
  'POSTER ARTIST',
  'CLAY CHAMPS',
  'ESSAY WRITING',
  'DRESS TO IMPRESS',
  'WRITING STARS',
  'FIRELESS COOKING',
  'WRITING QUEST',
  'YOUNG INNOVATORS',
] as const;

/**
 * Resolves the specific WhatsApp group link for a student's competition AND class category.
 */
export function getCategoryGroupLink(
  competitionName: string | undefined,
  settings?: SystemSettings | null,
  className?: string
): string {
  const defaultFallback =
    settings?.defaultWhatsAppGroupLink ||
    process.env.DEFAULT_WHATSAPP_GROUP_LINK ||
    'https://chat.whatsapp.com/GVPQlFZgMgqBns2WlQGcNe';

  if (!competitionName || !competitionName.trim()) {
    return defaultFallback;
  }

  const cleanComp = competitionName.trim().toUpperCase();
  const nComp = normalizeCompetitionCategory(competitionName);
  const nCls = normalizeClassCategory(className);

  // 1. If custom admin whatsappGroupLinks are explicitly provided in settings
  if (Array.isArray(settings?.whatsappGroupLinks) && settings.whatsappGroupLinks.length > 0) {
    if (className) {
      const exactMatch = settings.whatsappGroupLinks.find((g) => {
        return normalizeCompetitionCategory(g.competition) === nComp && normalizeClassCategory(g.classRange) === nCls && Boolean(g.url?.trim());
      });
      if (exactMatch) return exactMatch.url.trim();
    }
    const compMatch = settings.whatsappGroupLinks.find((g) => {
      const gComp = normalizeCompetitionCategory(g.competition);
      const gCls = normalizeClassCategory(g.classRange);
      return gComp === nComp && (gCls === 'All' || !g.classRange || g.classRange.toUpperCase() === 'ALL') && Boolean(g.url?.trim());
    });
    if (compMatch) return compMatch.url.trim();
  }

  // 2. Check settings.categoryWhatsAppLinks (explicit admin / test overrides)
  const map = settings?.categoryWhatsAppLinks || {};
  for (const [catName, link] of Object.entries(map)) {
    if (catName.trim().toUpperCase() === cleanComp && link && link.trim()) {
      return link.trim();
    }
    if (normalizeCompetitionCategory(catName) === nComp && link && link.trim()) {
      return link.trim();
    }
  }

  // 3. Official 18 pre-configured groups for Mind Spark Competition 2026
  if (className) {
    const exactOfficial = OFFICIAL_WHATSAPP_GROUPS.find((g) => {
      return normalizeCompetitionCategory(g.competition) === nComp && normalizeClassCategory(g.classRange) === nCls && Boolean(g.url?.trim());
    });
    if (exactOfficial) return exactOfficial.url.trim();
  }

  const allOfficial = OFFICIAL_WHATSAPP_GROUPS.find((g) => {
    const gComp = normalizeCompetitionCategory(g.competition);
    const gCls = normalizeClassCategory(g.classRange);
    return gComp === nComp && (gCls === 'All' || !g.classRange || g.classRange.toUpperCase() === 'ALL') && Boolean(g.url?.trim());
  });
  if (allOfficial) return allOfficial.url.trim();

  const compOfficial = OFFICIAL_WHATSAPP_GROUPS.find((g) => {
    return normalizeCompetitionCategory(g.competition) === nComp && Boolean(g.url?.trim());
  });
  if (compOfficial) return compOfficial.url.trim();

  return defaultFallback;
}

/**
 * Resolves full WhatsApp group metadata for a candidate.
 */
export function resolveStudentWhatsAppGroup(
  student: Partial<Student>,
  settings?: SystemSettings | null
): {
  groupId: string;
  groupLink: string;
  groupName: string;
  competitionCategory: string;
  classCategory: string;
  isExactMatch: boolean;
} {
  const comp = student.competitionName || 'GENERAL';
  const cls = student.className || '';
  const nComp = normalizeCompetitionCategory(comp);
  const nCls = normalizeClassCategory(cls);

  const configuredGroups: WhatsAppGroupLinkItem[] =
    Array.isArray(settings?.whatsappGroupLinks) && settings.whatsappGroupLinks.length > 0
      ? settings.whatsappGroupLinks
      : OFFICIAL_WHATSAPP_GROUPS;

  // Exact match
  const exact = configuredGroups.find((g) => {
    return normalizeCompetitionCategory(g.competition) === nComp && normalizeClassCategory(g.classRange) === nCls && Boolean(g.url?.trim());
  });
  if (exact) {
    return {
      groupId: exact.id,
      groupLink: exact.url.trim(),
      groupName: exact.groupName,
      competitionCategory: nComp,
      classCategory: nCls,
      isExactMatch: true,
    };
  }

  // Broad competition match
  const broad = configuredGroups.find((g) => normalizeCompetitionCategory(g.competition) === nComp && Boolean(g.url?.trim()));
  if (broad) {
    return {
      groupId: broad.id,
      groupLink: broad.url.trim(),
      groupName: broad.groupName,
      competitionCategory: nComp,
      classCategory: nCls,
      isExactMatch: false,
    };
  }

  const fallbackLink = getCategoryGroupLink(comp, settings, cls);
  return {
    groupId: 'grp_default',
    groupLink: fallbackLink,
    groupName: 'Mind Spark Community',
    competitionCategory: nComp,
    classCategory: nCls,
    isExactMatch: false,
  };
}



/**
 * Validates whether an Indian mobile phone number has 10 clean digits starting with 6-9.
 */
export function isValidIndianMobile(phone: any): boolean {
  const cleaned = normalizePhone(phone);
  return /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Replace dynamic merge tags with candidate and settings values.
 * Supports both standard `{tag}` and official prompt `[TAG]` placeholder syntaxes.
 */
export function renderMessageTemplate(
  templateText: string,
  student: Student,
  settings?: SystemSettings | null,
  baseUrl: string = ''
): string {
  if (!templateText) return '';

  const cleanBaseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  const admitCardUrl = cleanBaseUrl
    ? `${cleanBaseUrl}/admit-card?regNo=${encodeURIComponent(student.registrationNumber)}`
    : `https://mindspark.edu.in/admit-card?regNo=${encodeURIComponent(student.registrationNumber)}`;

  const resolvedGroupLink = getCategoryGroupLink(student.competitionName, settings, student.className);
  const sched = getStudentEventSchedule(
    student.competitionName || '',
    student.className || '',
    student.registrationNumber
  );

  const verifiedReportingTime =
    sched.reportingTime && sched.reportingTime !== 'PENDING' && sched.reportingTime !== 'N/A'
      ? sched.reportingTime
      : (settings?.reportingTime || '09:00 AM');
  const verifiedExamTime =
    !sched.isHold && sched.examTime && !sched.examTime.includes('PENDING')
      ? sched.examTime
      : (settings?.examTime || '10:00 AM');
  const verifiedExamDate =
    !sched.isHold && sched.examDate
      ? sched.examDate.replace(/-/g, ' ')
      : (settings?.examDate || '01 Nov 2026');
  const verifiedBatch = sched.batchInfo || 'Batch 1';
  const verifiedVenue =
    !sched.isHold && sched.venueDetail && sched.venueDetail !== 'ADMINISTRATION OFFICE'
      ? `${sched.venueMain} - ${sched.venueDetail}`
      : (settings?.venue || 'MEENA SHAH PUBLIC SCHOOL');

  const replacements: Record<string, string> = {
    // Standard curly brace tags
    '{name}': student.name || 'Candidate',
    '{student_name}': student.name || 'Candidate',
    '{reg_no}': student.registrationNumber || '',
    '{registration_number}': student.registrationNumber || '',
    '{father_name}': student.fatherName || '',
    '{school}': student.schoolOrCollege || '',
    '{school_name}': student.schoolOrCollege || '',
    '{class}': student.className || '',
    '{class_name}': student.className || '',
    '{competition}': student.competitionName || settings?.competitionTitle || 'Mind Spark Competition',
    '{competition_name}': student.competitionName || settings?.competitionTitle || 'Mind Spark Competition',
    '{exam_date}': verifiedExamDate,
    '{reporting_time}': verifiedReportingTime,
    '{exam_time}': verifiedExamTime,
    '{timing}': verifiedExamTime,
    '{shift}': verifiedBatch,
    '{shift_batch}': verifiedBatch,
    '{batch}': verifiedBatch,
    '{batch_name}': verifiedBatch,
    '{venue}': verifiedVenue,
    '{contact_phone}': settings?.contactPhone || '8707744749',
    '{contact_email}': settings?.contactEmail || 'admissions@mindspark.edu.in',
    '{admit_card_url}': admitCardUrl,
    '{whatsapp_group_link}': resolvedGroupLink,
    '{group_link}': resolvedGroupLink,
    '{dob}': student.dateOfBirth || '',
    '{date_of_birth}': student.dateOfBirth || '',
    '{lucky_draw_notice}': sched.luckyDrawNotice || '',

    // Bracket placeholder tags specified in prompt
    '[REGISTRATION_NUMBER]': student.registrationNumber || '',
    '[REG_NO]': student.registrationNumber || '',
    '[DYNAMIC_COMPETITION_GROUP_LINK]': resolvedGroupLink,
    '[GROUP_LINK]': resolvedGroupLink,
    '[STUDENT_NAME]': student.name || 'Candidate',
    '[NAME]': student.name || 'Candidate',
    '[CLASS]': student.className || '',
    '[COMPETITION]': student.competitionName || '',
    '[DOB]': student.dateOfBirth || '',
    '[DATE_OF_BIRTH]': student.dateOfBirth || '',
    '[VENUE]': verifiedVenue,
    '[EXAM_DATE]': verifiedExamDate,
    '[REPORTING_TIME]': verifiedReportingTime,
    '[EXAM_TIME]': verifiedExamTime,
    '[BATCH]': verifiedBatch,
    '[SHIFT]': verifiedBatch,
  };

  let rendered = templateText;
  for (const [tag, value] of Object.entries(replacements)) {
    rendered = rendered.split(tag).join(value);
  }

  // Handle cases where templates or pasted messages omit dynamic tags
  if (student.registrationNumber) {
    if (rendered.includes('This is your Registration Number:\n')) {
      rendered = rendered.replace('This is your Registration Number:\n', `This is your Registration Number: ${student.registrationNumber}\n`);
    } else if (rendered.includes('This is your Registration Number:\r\n')) {
      rendered = rendered.replace('This is your Registration Number:\r\n', `This is your Registration Number: ${student.registrationNumber}\r\n`);
    } else if (rendered.includes('This is your Registration Number: \n')) {
      rendered = rendered.replace('This is your Registration Number: \n', `This is your Registration Number: ${student.registrationNumber}\n`);
    }
  }

  if (resolvedGroupLink) {
    if (rendered.includes('Link:\n')) {
      rendered = rendered.replace('Link:\n', `Link: ${resolvedGroupLink}\n`);
    } else if (rendered.includes('Link:\r\n')) {
      rendered = rendered.replace('Link:\r\n', `Link: ${resolvedGroupLink}\r\n`);
    } else if (rendered.includes('Link: \n')) {
      rendered = rendered.replace('Link: \n', `Link: ${resolvedGroupLink}\n`);
    }
  }

  if (student.name) {
    if (rendered.includes('Dear Participant,\n')) {
      rendered = rendered.replace('Dear Participant,\n', `Dear Participant (${student.name}),\n`);
    } else if (rendered.includes('Dear Participant,\r\n')) {
      rendered = rendered.replace('Dear Participant,\r\n', `Dear Participant (${student.name}),\r\n`);
    }
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
