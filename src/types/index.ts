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

export type WhatsAppStatus = 'NOT_SENT' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'OPENED' | 'UNCERTAIN';

export interface WhatsAppGroupLinkItem {
  id: string;
  groupName: string;
  competition: string;
  classRange: string; // e.g. '9-10', '11-12', 'Graduation', '6-8', '4-5', '2-3', '1', 'UKG', 'LKG', 'Nursery', 'Play Group', 'All'
  url: string;
  description?: string;
  isOfficial?: boolean;
  studentCount?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface StudentMessageRecord {
  templateId: string;
  templateName: string;
  templateVersion?: number | string;
  messageContent?: string;
  groupLink?: string;
  campaignId?: string;
  campaignName?: string;
  sentAt: string;
  status: WhatsAppStatus;
  messageId?: string;
  error?: string;
  provider?: string;
  retryCount?: number;
  dedupKey?: string;
  isUncertain?: boolean;
}

export interface CustomWhatsAppTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  categoryFilter?: string; // e.g. 'ONLINE QUIZ' or 'ALL'
  classFilter?: string; // e.g. '9-10', '11-12', 'Graduation' or 'ALL'
  version: number;
  versionsHistory?: Array<{
    version: number;
    content: string;
    updatedAt: string;
    updatedBy?: string;
  }>;
  active?: boolean;
  language?: 'en' | 'hi' | 'bilingual';
  metaTemplateName?: string;
  metaLanguage?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface WhatsAppCampaign {
  campaignId: string;
  name: string;
  competitionGroup: string; // 'ALL' or specific competition title
  classGroup?: string; // 'ALL' or specific class group
  templateId: string;
  templateName: string;
  templateVersion?: number | string;
  dispatchedAt: string;
  dispatchedBy: string;
  totalCandidates: number;
  succeededCount: number;
  failedCount: number;
  pendingCount?: number;
  provider: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'PAUSED' | 'IN_PROGRESS';
}

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
  whatsappStatus?: WhatsAppStatus;
  whatsappSentAt?: string;
  lastTemplateId?: string;
  lastTemplateName?: string;
  lastTemplateVersion?: number | string;
  lastMessageContent?: string;
  lastGroupLink?: string;
  messageHistory?: StudentMessageRecord[];
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
  targetType: 'STUDENT' | 'IMPORT' | 'ADMIT_CARD' | 'EXPORT' | 'USER' | 'SETTINGS' | 'WHATSAPP';
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
  whatsappCloudToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappTemplateName?: string;
  categoryWhatsAppLinks?: Record<string, string>;
  defaultWhatsAppGroupLink?: string;
  whatsappGroupLinks?: WhatsAppGroupLinkItem[];
  customTemplates?: CustomWhatsAppTemplate[];
  whatsappCampaigns?: WhatsAppCampaign[];
}
