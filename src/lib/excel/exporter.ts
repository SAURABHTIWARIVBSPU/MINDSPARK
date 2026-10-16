import * as XLSX from 'xlsx';
import { Student } from '@/types';
import { sanitizeForSpreadsheet } from './normalizer';

export function generateMasterExcel(students: Student[], schoolName: string): Uint8Array {
  // Define clean canonical export headers
  const headers = [
    'Registration No',
    'Student Name',
    'Father Name',
    'Date of Birth',
    'Contact Number',
    'School / College Name',
    'Class',
    'Competition Name',
    'Status',
    'Registered Date',
  ];

  const rows = students.map((s) => [
    sanitizeForSpreadsheet(s.registrationNumber),
    sanitizeForSpreadsheet(s.name),
    sanitizeForSpreadsheet(s.fatherName),
    sanitizeForSpreadsheet(s.dateOfBirth),
    sanitizeForSpreadsheet(s.phone),
    sanitizeForSpreadsheet(s.schoolOrCollege),
    sanitizeForSpreadsheet(s.className),
    sanitizeForSpreadsheet(s.competitionName),
    s.status,
    s.createdAt ? s.createdAt.split('T')[0] : '',
  ]);

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 16 }, // Reg No
    { wch: 25 }, // Name
    { wch: 25 }, // Father Name
    { wch: 14 }, // DOB
    { wch: 16 }, // Contact
    { wch: 32 }, // School/College
    { wch: 12 }, // Class
    { wch: 22 }, // Competition
    { wch: 12 }, // Status
    { wch: 16 }, // Registered Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Students');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}
