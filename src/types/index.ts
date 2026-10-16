export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'REGISTRATION_OPERATOR'
  | 'EXCEL_OPERATOR'
  | 'READ_ONLY';

export type Permission =
  | 'students.read'
  | 'students.create'
  | 'students.update'
  | 'students.archive'
  | 'imports.create'
  | 'imports.review'
  | 'exports.master'
  | 'registrationNumbers.manage'
  | 'admitCards.generate'
  | 'admitCards.read'
  | 'admitCards.download'
  | 'messages.prepare'
  | 'messages.send'
  | 'users.manage'
  | 'permissions.manage'
  | 'auditLogs.read'
  | 'settings.manage';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
  passwordHash?: string;
}

export type StudentStatus = 'ACTIVE' | 'ARCHIVED' | 'VOID';

export interface Student {
  studentId: string;
  registrationNumber: string;
  name: string;
  fatherName: string;
  dateOfBirth: string; // ISO YYYY-MM-DD
  phone: string; // 10 digits
  schoolOrCollege: string;
  className: string;
  competitionName: string;
  status: StudentStatus;
  sourceImportId?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  dataVersion: number;
}

export type ImportStatus = 'PREVIEWED' | 'COMMITTED' | 'FAILED';

export interface ImportJob {
  importId: string;
  fileName: string;
  fileFingerprint: string;
  uploadedBy: string;
  uploadedAt: string;
  status: ImportStatus;
  totalRows: number;
  validRows: number;
  warningRows: number;
  rejectedRows: number;
  processedRows: number;
  mappingVersion: string;
  errorReport?: Array<{ rowNumber: number; reason: string; rawData: Record<string, any> }>;
}

export interface CandidateDuplicate {
  rowNumber: number;
  studentName: string;
  fatherName: string;
  phone: string;
  matchedExistingStudentId?: string;
  matchedExistingRegNo?: string;
  reason: string;
}

export interface AdmitCard {
  studentId: string;
  registrationNumber: string;
  fileId: string; // Storage key / Drive file ID
  storageType: 'local' | 'gdrive';
  templateVersion: string;
  sourceDataHash: string;
  status: 'READY' | 'STALE';
  generatedAt: string;
  updatedAt: string;
}

export type AdmitCardJobStatus = 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED' | 'CANCELLED';

export interface AdmitCardJob {
  jobId: string;
  createdBy: string;
  createdAt: string;
  status: AdmitCardJobStatus;
  templateVersion: string;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  lastProgressAt: string;
  errors: Array<{ studentId: string; registrationNumber: string; error: string }>;
}

export interface AuditLog {
  eventId: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: 'STUDENT' | 'IMPORT' | 'ADMIT_CARD' | 'EXPORT' | 'USER' | 'SETTINGS';
  targetId: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface SystemSettings {
  schoolName: string;
  competitionTitle: string;
  venue: string;
  examDate: string;
  reportingTime: string;
  contactPhone: string;
  contactEmail: string;
  regNoPrefix: string;
  regNoYear: string;
  regNoSeqCurrent: number;
}
