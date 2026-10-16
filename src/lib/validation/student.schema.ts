import { z } from 'zod';

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

export const StudentFormSchema = z.object({
  registrationNumber: z.string().trim().optional(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  fatherName: z.string().trim().min(2, "Father's name must be at least 2 characters"),
  dateOfBirth: z.string().trim().min(4, 'Date of birth is required'),
  phone: PhoneSchema,
  schoolOrCollege: z.string().trim().min(2, 'School/College name is required'),
  className: z.string().trim().default(''),
  competitionName: z.string().trim().default('General Competition'),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'VOID']).default('ACTIVE'),
});

export type StudentFormData = z.infer<typeof StudentFormSchema>;
