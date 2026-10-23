import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { normalizePhone, normalizeText } from './normalizer';

export interface TestStaffRecipient {
  sNo: number;
  name: string;
  phone: string;
  designation: string;
  school: string;
  email?: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  lastDispatchAt?: string;
  notes?: string;
}

const REGISTRY_PATH = path.join(process.cwd(), 'Test_Teachers_And_Staff_Registry.xlsx');

/**
 * Initial seed records if file doesn't exist
 */
const INITIAL_STAFF_RECORDS: TestStaffRecipient[] = [
  {
    sNo: 1,
    name: 'TEST OBSERVER 1',
    phone: '8948905711',
    designation: 'EXAM COORDINATOR',
    school: 'MEENA SHAH MEMORIAL SCHOOL',
    email: 'coordinator@meenashah.edu',
    status: 'PENDING',
    lastDispatchAt: '',
    notes: 'Primary verification test recipient',
  },
  {
    sNo: 2,
    name: 'TEST OBSERVER 2',
    phone: '9795600217',
    designation: 'HEAD TEACHER / INVIGILATOR',
    school: 'MEENA SHAH MEMORIAL SCHOOL',
    email: 'teacher@meenashah.edu',
    status: 'PENDING',
    lastDispatchAt: '',
    notes: 'Secondary verification test recipient',
  },
  {
    sNo: 3,
    name: 'ADMIN PORTAL CONTROLLER',
    phone: '8707744749',
    designation: 'PORTAL CONTROLLER',
    school: 'MEENA SHAH MEMORIAL SCHOOL',
    email: 'tabrezaalam92@gmail.com',
    status: 'PENDING',
    lastDispatchAt: '',
    notes: 'Registered sender / admin phone',
  },
];

/**
 * Initialize the Test Teachers & Staff Excel registry if not present
 */
export function initTestStaffRegistry(): void {
  if (fs.existsSync(REGISTRY_PATH)) return;

  const dataRows = INITIAL_STAFF_RECORDS.map((r) => ({
    'S.No': r.sNo,
    'Teacher / Staff Name': r.name,
    'Mobile Number (10 Digit)': r.phone,
    'Designation / Subject': r.designation,
    'School / College': r.school,
    'Email Address': r.email || '',
    'WhatsApp Status': r.status,
    'Last Dispatch Date': r.lastDispatchAt || '',
    'Notes / Verification Status': r.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 25 },
    { wch: 30 },
    { wch: 35 },
    { wch: 28 },
    { wch: 18 },
    { wch: 24 },
    { wch: 35 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test_Staff_Registry');
  XLSX.writeFile(workbook, REGISTRY_PATH);
}

/**
 * Read all staff recipients from Excel with strict deduplication & validation
 */
export async function getTestStaffList(): Promise<TestStaffRecipient[]> {
  initTestStaffRegistry();

  try {
    const fileBuf = fs.readFileSync(REGISTRY_PATH);
    const workbook = XLSX.read(fileBuf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const seenPhones = new Set<string>();
    const list: TestStaffRecipient[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rawPhone = String(
        row['Mobile Number (10 Digit)'] ||
          row['Mobile Number'] ||
          row['Phone'] ||
          row['phone'] ||
          ''
      );
      const cleanPhone = normalizePhone(rawPhone);

      // Must be a valid 10-digit Indian phone
      if (!cleanPhone || cleanPhone.length !== 10) continue;

      // Strict Deduplication: Do not add if phone already seen
      if (seenPhones.has(cleanPhone)) continue;
      seenPhones.add(cleanPhone);

      const name = normalizeText(
        String(
          row['Teacher / Staff Name'] ||
            row['Teacher Name'] ||
            row['Name'] ||
            row['name'] ||
            `STAFF MEMBER ${list.length + 1}`
        )
      );

      const designation = normalizeText(
        String(
          row['Designation / Subject'] ||
            row['Designation'] ||
            row['Subject'] ||
            'TEACHER / STAFF'
        )
      );

      const school = normalizeText(
        String(
          row['School / College'] ||
            row['School'] ||
            'MEENA SHAH MEMORIAL SCHOOL'
        )
      );

      const email = String(row['Email Address'] || row['Email'] || '').trim();
      const statusRaw = String(row['WhatsApp Status'] || row['Status'] || 'PENDING').toUpperCase();
      const status: 'PENDING' | 'SENT' | 'FAILED' =
        statusRaw === 'SENT' ? 'SENT' : statusRaw === 'FAILED' ? 'FAILED' : 'PENDING';

      list.push({
        sNo: list.length + 1,
        name,
        phone: cleanPhone,
        designation,
        school,
        email,
        status,
        lastDispatchAt: String(row['Last Dispatch Date'] || ''),
        notes: String(row['Notes / Verification Status'] || ''),
      });
    }

    return list;
  } catch (err) {
    console.error('Error reading Test Staff Excel registry:', err);
    return INITIAL_STAFF_RECORDS;
  }
}

/**
 * Add a new teacher or staff recipient with strict duplicate validation
 */
export async function addTestStaffRecipient(
  input: {
    name: string;
    phone: string;
    designation?: string;
    school?: string;
    email?: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string; recipient?: TestStaffRecipient }> {
  const cleanPhone = normalizePhone(input.phone);
  if (!cleanPhone || cleanPhone.length !== 10) {
    return {
      success: false,
      error: `Invalid phone number: '${input.phone}'. Must be a valid 10-digit Indian mobile number.`,
    };
  }

  const existingList = await getTestStaffList();

  // 1. Strict Duplicate Check: Phone Number
  const duplicate = existingList.find((r) => r.phone === cleanPhone);
  if (duplicate) {
    return {
      success: false,
      error: `DUPLICATE REJECTED: Phone number ${cleanPhone} is already registered for '${duplicate.name}' (${duplicate.designation} - ${duplicate.school}).`,
    };
  }

  const newRecipient: TestStaffRecipient = {
    sNo: existingList.length + 1,
    name: normalizeText(input.name.trim().toUpperCase() || 'STAFF MEMBER'),
    phone: cleanPhone,
    designation: normalizeText((input.designation || 'TEACHER / STAFF').trim().toUpperCase()),
    school: normalizeText((input.school || 'MEENA SHAH MEMORIAL SCHOOL').trim().toUpperCase()),
    email: (input.email || '').trim().toLowerCase(),
    status: 'PENDING',
    lastDispatchAt: '',
    notes: input.notes || 'Added for examination test dispatch',
  };

  const updatedList = [...existingList, newRecipient];
  await saveTestStaffList(updatedList);

  return { success: true, recipient: newRecipient };
}

/**
 * Update dispatch status of one or more staff recipients in the Excel registry
 */
export async function updateStaffDispatchStatus(
  phone: string,
  status: 'SENT' | 'FAILED',
  details?: string
): Promise<void> {
  const cleanPhone = normalizePhone(phone);
  const currentList = await getTestStaffList();

  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const updatedList = currentList.map((item) => {
    if (item.phone === cleanPhone) {
      return {
        ...item,
        status,
        lastDispatchAt: nowStr,
        notes: details ? details : item.notes,
      };
    }
    return item;
  });

  await saveTestStaffList(updatedList);
}

/**
 * Write updated records safely to Test_Teachers_And_Staff_Registry.xlsx
 */
export async function saveTestStaffList(list: TestStaffRecipient[]): Promise<void> {
  const dataRows = list.map((r, idx) => ({
    'S.No': idx + 1,
    'Teacher / Staff Name': r.name,
    'Mobile Number (10 Digit)': r.phone,
    'Designation / Subject': r.designation,
    'School / College': r.school,
    'Email Address': r.email || '',
    'WhatsApp Status': r.status,
    'Last Dispatch Date': r.lastDispatchAt || '',
    'Notes / Verification Status': r.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 25 },
    { wch: 30 },
    { wch: 35 },
    { wch: 28 },
    { wch: 18 },
    { wch: 24 },
    { wch: 35 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test_Staff_Registry');
  XLSX.writeFile(workbook, REGISTRY_PATH);
}
