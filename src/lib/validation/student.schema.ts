import { z } from 'zod';
import { normalizeDate } from '@/lib/excel/normalizer';

export const PhoneSchema = z.string().transform((val) => {
  // Strip non-digits
  const cleaned = val.replace(/\D/g, '');
  // Remove leading 91 or 0 if 12 or 11 digits
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned.slice(2);
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned.slice(1);
  }
  return cleaned;
}).refine((val) => /^[6-9]\d{9}$/.test(val), {
  message: 'Phone number must be a valid 10-digit Indian mobile number',
});

export const DateOfBirthSchema = z.string().trim().transform((val) => {
  const norm = normalizeDate(val);
  return norm || val;
}).refine((val) => val.length >= 4, {
  message: 'Date of birth is required and must be a valid date (DD-MM-YYYY or YYYY-MM-DD)',
});

export const StudentFormSchema = z.object({
  registrationNumber: z.string().trim().optional(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  fatherName: z.string().trim().min(2, "Father's name must be at least 2 characters"),
  dateOfBirth: DateOfBirthSchema,
  phone: PhoneSchema,
  schoolOrCollege: z.string().trim().min(2, 'School/College name is required'),
  className: z.string().trim().default(''),
  competitionName: z.string().trim().default('General Competition'),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'VOID']).default('ACTIVE'),
});

export type StudentFormData = z.infer<typeof StudentFormSchema>;
