import { Student } from '@/types';
import { normalizeText, normalizePhone } from './normalizer';

export interface DuplicateCheckInput {
  rowNumber: number;
  registrationNumber?: string;
  name: string;
  fatherName: string;
  phone: string;
}

export interface DuplicateEvaluation {
  hasConflict: boolean;
  conflictType?: 'EXACT_REG_NO' | 'CANDIDATE_PERSON' | 'INTRA_FILE_DUPLICATE';
  reason?: string;
  matchedStudent?: Student;
}

export class DuplicateDetector {
  private existingByRegNo = new Map<string, Student>();
  private existingByNameAndFather = new Map<string, Student>();
  private existingByPhone = new Map<string, Student>();

  private seenInFileRegNo = new Set<string>();
  private seenInFilePerson = new Set<string>();

  constructor(existingStudents: Student[]) {
    for (const student of existingStudents) {
      if (student.status !== 'VOID') {
        if (student.registrationNumber) {
          this.existingByRegNo.set(student.registrationNumber.toUpperCase(), student);
        }
        const personKey = this.makePersonKey(student.name, student.fatherName);
        this.existingByNameAndFather.set(personKey, student);

        if (student.phone) {
          this.existingByPhone.set(student.phone, student);
        }
      }
    }
  }

  private makePersonKey(name: string, fatherName: string): string {
    return `${normalizeText(name).toLowerCase()}|${normalizeText(fatherName).toLowerCase()}`;
  }

  evaluate(row: DuplicateCheckInput): DuplicateEvaluation {
    const regNoUpper = row.registrationNumber ? row.registrationNumber.trim().toUpperCase() : '';
    const personKey = this.makePersonKey(row.name, row.fatherName);
    const cleanPhone = normalizePhone(row.phone);

    // 1. Check intra-file duplicate registration number
    if (regNoUpper) {
      if (this.seenInFileRegNo.has(regNoUpper)) {
        return {
          hasConflict: true,
          conflictType: 'INTRA_FILE_DUPLICATE',
          reason: `Registration Number '${regNoUpper}' appears multiple times in this uploaded file`,
        };
      }
      this.seenInFileRegNo.add(regNoUpper);
    }

    // 2. Check exact registration number conflict against existing database
    if (regNoUpper && this.existingByRegNo.has(regNoUpper)) {
      const match = this.existingByRegNo.get(regNoUpper)!;
      return {
        hasConflict: true,
        conflictType: 'EXACT_REG_NO',
        reason: `Registration Number '${regNoUpper}' already exists for student '${match.name}' (${match.schoolOrCollege})`,
        matchedStudent: match,
      };
    }

    // 3. Check candidate duplicate by Name + Father Name
    if (this.existingByNameAndFather.has(personKey)) {
      const match = this.existingByNameAndFather.get(personKey)!;
      return {
        hasConflict: true,
        conflictType: 'CANDIDATE_PERSON',
        reason: `Possible duplicate: Name '${row.name}' and Father '${row.fatherName}' match existing student with Reg No '${match.registrationNumber}'`,
        matchedStudent: match,
      };
    }

    // 4. Check candidate duplicate by Phone
    if (cleanPhone && this.existingByPhone.has(cleanPhone)) {
      const match = this.existingByPhone.get(cleanPhone)!;
      return {
        hasConflict: true,
        conflictType: 'CANDIDATE_PERSON',
        reason: `Possible duplicate: Contact phone '${cleanPhone}' matches existing student '${match.name}' (Reg No '${match.registrationNumber}')`,
        matchedStudent: match,
      };
    }

    // 5. Intra-file candidate check
    if (this.seenInFilePerson.has(personKey)) {
      return {
        hasConflict: true,
        conflictType: 'INTRA_FILE_DUPLICATE',
        reason: `Candidate '${row.name}' with Father '${row.fatherName}' appears multiple times in this file`,
      };
    }
    this.seenInFilePerson.add(personKey);

    return { hasConflict: false };
  }
}
