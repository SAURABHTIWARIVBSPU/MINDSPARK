import { normalizeText } from './normalizer';

export interface ColumnMappingResult {
  detectedMappings: Record<string, string>; // canonicalKey -> originalHeader
  missingRequired: string[];
  unmappedHeaders: string[];
}

export const CANONICAL_FIELDS = {
  registrationNumber: {
    label: 'Registration Number',
    required: false, // Can be auto-allocated if missing
    aliases: [
      'reg no',
      'regno',
      'reg no.',
      'reg_no',
      'registration no',
      'registration number',
      'roll no',
      'roll number',
      'admit card no',
    ],
  },
  name: {
    label: 'Student Name',
    required: true,
    aliases: [
      'name of student',
      'student name',
      'name',
      'candidate name',
      'student',
      'full name',
      'candidate',
    ],
  },
  fatherName: {
    label: "Father's Name",
    required: true,
    aliases: [
      'father name',
      "father's name",
      'fathers name',
      'guardian name',
      'father',
      'guardian',
    ],
  },
  dateOfBirth: {
    label: 'Date of Birth',
    required: true,
    aliases: [
      'dob',
      'date of birth',
      'birth date',
      'birthdate',
      'd.o.b.',
      'd.o.b',
    ],
  },
  phone: {
    label: 'Contact Number',
    required: true,
    aliases: [
      'contact',
      'contact no',
      'contact number',
      'mobile',
      'mobile no',
      'mobile number',
      'phone',
      'phone no',
      'phone number',
      'whatsapp',
      'whatsapp no',
    ],
  },
  schoolOrCollege: {
    label: 'School / College Name',
    required: true,
    aliases: [
      'school/college name',
      'school / college name',
      'school/college',
      'school name',
      'college name',
      'institution',
      'school',
      'college',
      'institute',
    ],
  },
  className: {
    label: 'Class',
    required: false,
    aliases: [
      'class',
      'class/grade',
      'grade',
      'standard',
      'std',
      'stream',
    ],
  },
  competitionName: {
    label: 'Competition Name',
    required: false,
    aliases: [
      'competitions name',
      'competition name',
      'competition',
      'event',
      'event name',
      'competitions',
    ],
  },
};

/**
 * Normalizes a header string for comparison: lowercase, remove special characters, trim.
 */
function cleanHeader(header: string): string {
  return normalizeText(header)
    .toLowerCase()
    .replace(/[_\-\.\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Maps raw sheet headers to canonical fields.
 */
export function mapHeaders(rawHeaders: string[]): ColumnMappingResult {
  const detectedMappings: Record<string, string> = {};
  const mappedRawHeaders = new Set<string>();

  const cleanedRawHeaders = rawHeaders.map((h) => ({
    original: h,
    cleaned: cleanHeader(h),
  }));

  for (const [canonicalKey, fieldDef] of Object.entries(CANONICAL_FIELDS)) {
    // 1. Exact match against aliases
    let found = cleanedRawHeaders.find((item) =>
      fieldDef.aliases.some((alias) => item.cleaned === cleanHeader(alias))
    );

    // 2. Substring matching if not found
    if (!found) {
      found = cleanedRawHeaders.find((item) =>
        !mappedRawHeaders.has(item.original) &&
        fieldDef.aliases.some((alias) => {
          const cAlias = cleanHeader(alias);
          return item.cleaned.includes(cAlias) || cAlias.includes(item.cleaned);
        })
      );
    }

    if (found && !mappedRawHeaders.has(found.original)) {
      detectedMappings[canonicalKey] = found.original;
      mappedRawHeaders.add(found.original);
    }
  }

  const missingRequired = Object.entries(CANONICAL_FIELDS)
    .filter(([key, def]) => def.required && !detectedMappings[key])
    .map(([key]) => key);

  const unmappedHeaders = rawHeaders.filter((h) => !mappedRawHeaders.has(h));

  return {
    detectedMappings,
    missingRequired,
    unmappedHeaders,
  };
}
