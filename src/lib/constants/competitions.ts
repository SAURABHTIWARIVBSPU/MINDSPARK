export interface CompetitionOption {
  key: string;
  title: string;
  category: string;
  eligibleClasses: string[];
  defaultClass: string;
  isHold?: boolean;
  holdReason?: string;
  examSlot: string;
  reportingTime: string;
  venue: string;
}

export const APPROVED_COMPETITIONS: CompetitionOption[] = [
  {
    key: 'COLOUR_BY_NUMBER',
    title: 'Colour by Number',
    category: 'Kindergarten',
    eligibleClasses: ['NURSERY'],
    defaultClass: 'NURSERY',
    examSlot: '11:00 AM - 12:00 PM',
    reportingTime: '10:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'JOIN_THE_DOTS',
    title: 'Join the Dots & Colour',
    category: 'Kindergarten',
    eligibleClasses: ['LKG', 'L.K.G'],
    defaultClass: 'LKG',
    examSlot: '12:00 PM - 01:00 PM',
    reportingTime: '11:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'COMPLETE_THE_PICTURE',
    title: 'Complete the Picture & Colour',
    category: 'Kindergarten',
    eligibleClasses: ['UKG', 'U.K.G', 'KG'],
    defaultClass: 'UKG',
    examSlot: '01:00 PM - 02:00 PM',
    reportingTime: '12:30 PM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'FANCY_DRESS',
    title: 'Unique & Creative Handmade Fancy Dress',
    category: 'Kindergarten',
    eligibleClasses: ['PLAY GROUP', 'PLAYGROUP', 'PG'],
    defaultClass: 'PLAY GROUP',
    examSlot: '11:00 AM ONWARDS',
    reportingTime: '10:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS STAGE'
  },
  {
    key: 'CLAY_CHAMPS',
    title: 'Clay Champs',
    category: 'Primary (Class 1)',
    eligibleClasses: ['1', 'CLASS 1', '1ST'],
    defaultClass: '1',
    examSlot: '10:00 AM - 02:00 PM (BATCHES 1-4)',
    reportingTime: '09:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS MUSIC ROOM'
  },
  {
    key: 'DRESS_TO_IMPRESS',
    title: 'Dress to Impress',
    category: 'Primary (Class 1)',
    eligibleClasses: ['1', 'CLASS 1', '1ST'],
    defaultClass: '1',
    examSlot: '12:00 PM ONWARDS',
    reportingTime: '11:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS STAGE'
  },
  {
    key: 'PAINT_YOUR_IMAGINATION',
    title: 'Paint Your Imagination',
    category: 'Primary (Class 2-3)',
    eligibleClasses: ['2', '3', 'CLASS 2', 'CLASS 3', '2ND', '3RD'],
    defaultClass: '2',
    examSlot: '10:00 AM - 12:30 PM (BATCHES 1-2)',
    reportingTime: '09:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS LIBRARY'
  },
  {
    key: 'WRITING_STARS',
    title: 'Writing Stars',
    category: 'Primary (Class 2-3)',
    eligibleClasses: ['2', '3', 'CLASS 2', 'CLASS 3', '2ND', '3RD'],
    defaultClass: '3',
    examSlot: '03:00 PM - 04:00 PM',
    reportingTime: '02:30 PM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'BATTLE_OF_BRAINS',
    title: 'Battle of Brains',
    category: 'Junior (Class 4-5)',
    eligibleClasses: ['4', '5', 'CLASS 4', 'CLASS 5', '4TH', '5TH'],
    defaultClass: '4',
    examSlot: '02:00 PM - 03:00 PM',
    reportingTime: '01:30 PM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'POSTER_ARTIST',
    title: 'Poster Artist',
    category: 'Junior (Class 4-5)',
    eligibleClasses: ['4', '5', 'CLASS 4', 'CLASS 5', '4TH', '5TH'],
    defaultClass: '4',
    examSlot: '02:30 PM - 05:00 PM (BATCHES 1-2)',
    reportingTime: '02:00 PM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS LIBRARY'
  },
  {
    key: 'SUDOKU',
    title: 'Sudoku',
    category: 'Middle (Class 6-8)',
    eligibleClasses: ['6', '7', '8', 'CLASS 6', 'CLASS 7', 'CLASS 8', '6TH', '7TH', '8TH'],
    defaultClass: '6',
    examSlot: '02:00 PM - 03:00 PM',
    reportingTime: '01:30 PM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'FIRELESS_COOKING',
    title: 'Fireless Cooking',
    category: 'Middle (Class 6-8)',
    eligibleClasses: ['6', '7', '8', 'CLASS 6', 'CLASS 7', 'CLASS 8', '6TH', '7TH', '8TH'],
    defaultClass: '6',
    examSlot: '09:00 AM - 03:00 PM (BATCHES 1-5)',
    reportingTime: '08:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - GROUND FLOOR'
  },
  {
    key: 'JUNIOR_SCIENTIST',
    title: 'Junior Scientist [ON HOLD]',
    category: 'Middle (Class 6-8)',
    eligibleClasses: ['6', '7', '8', 'CLASS 6', 'CLASS 7', 'CLASS 8', '6TH', '7TH', '8TH'],
    defaultClass: '6',
    isHold: true,
    holdReason: 'ON HOLD: Model evaluation pending prior to hall ticket release per committee directive.',
    examSlot: 'SCHEDULE ON HOLD',
    reportingTime: 'PENDING ANNOUNCEMENT',
    venue: 'VACANT ROOM 1st FLOOR (PENDING EVALUATION)'
  },
  {
    key: 'YOUNG_INNOVATORS',
    title: 'Young Innovators',
    category: 'Secondary (Class 9-10)',
    eligibleClasses: ['9', '10', 'CLASS 9', 'CLASS 10', '9TH', '10TH'],
    defaultClass: '9',
    examSlot: '11:00 AM - 04:00 PM (BATCHES 1-4)',
    reportingTime: '10:30 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - VACANT ROOM 1st FLOOR'
  },
  {
    key: 'ONLINE_QUIZ_9_10',
    title: 'Online Quiz (Class 9-10)',
    category: 'Secondary (Class 9-10)',
    eligibleClasses: ['9', '10', 'CLASS 9', 'CLASS 10', '9TH', '10TH'],
    defaultClass: '9',
    examSlot: '08:30 AM - 03:00 PM (BATCHES 1-5)',
    reportingTime: '08:00 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS LAB'
  },
  {
    key: 'WRITING_QUEST',
    title: 'Writing Quest',
    category: 'Senior (Class 11-12)',
    eligibleClasses: ['11', '12', 'CLASS 11', 'CLASS 12', '11TH', '12TH'],
    defaultClass: '11',
    examSlot: '04:00 PM - 05:00 PM',
    reportingTime: '03:30 PM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSPS 1st FLOOR'
  },
  {
    key: 'ONLINE_QUIZ_11_12',
    title: 'Online Quiz (Class 11-12)',
    category: 'Senior (Class 11-12)',
    eligibleClasses: ['11', '12', 'CLASS 11', 'CLASS 12', '11TH', '12TH'],
    defaultClass: '11',
    examSlot: '08:30 AM - 04:00 PM (BATCHES 1-6)',
    reportingTime: '08:00 AM',
    venue: 'MEENA SHAH PUBLIC SCHOOL - MSITM LAB'
  },
  {
    key: 'ONLINE_QUIZ_GRADUATION',
    title: 'Online Quiz (Graduation) [ON HOLD]',
    category: 'Higher Ed (Graduation)',
    eligibleClasses: ['GRADUATION', 'B.SC', 'B.A', 'B.COM', 'BBA', 'BCA', 'B.TECH', 'COLLEGE'],
    defaultClass: 'GRADUATION',
    isHold: true,
    holdReason: 'ON HOLD: Scheduled after university semester exams per committee directive.',
    examSlot: 'SCHEDULE ON HOLD',
    reportingTime: 'PENDING ANNOUNCEMENT',
    venue: 'MSITM 1st FLOOR (POST-SEMESTER DATES)'
  },
  {
    key: 'ESSAY_WRITING_GRADUATION',
    title: 'Essay Writing (Graduation) [ON HOLD]',
    category: 'Higher Ed (Graduation)',
    eligibleClasses: ['GRADUATION', 'B.SC', 'B.A', 'B.COM', 'BBA', 'BCA', 'B.TECH', 'COLLEGE'],
    defaultClass: 'GRADUATION',
    isHold: true,
    holdReason: 'ON HOLD: Topic and submission schedule to be released separately.',
    examSlot: 'SCHEDULE ON HOLD',
    reportingTime: 'PENDING ANNOUNCEMENT',
    venue: 'MSITM LT2, LT3, LT4 (PENDING ANNOUNCEMENT)'
  }
];
