import {
  Student,
  WhatsAppStatus,
  ImportJob,
  AdmitCard,
  AdmitCardJob,
  AuditLog,
  SystemSettings,
  User,
} from '@/types';

export interface StudentQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  competition?: string;
  className?: string;
  schoolOrCollege?: string;
  status?: string;
  whatsappStatus?: string;
}

export interface StudentQueryResult {
  students: Student[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IDatabaseAdapter {
  // Students
  getStudents(options?: StudentQueryOptions): Promise<StudentQueryResult>;
  getAllActiveStudents(): Promise<Student[]>;
  getStudentById(studentId: string): Promise<Student | null>;
  getStudentByRegNo(regNo: string): Promise<Student | null>;
  createStudent(student: Omit<Student, 'studentId' | 'createdAt' | 'updatedAt' | 'dataVersion'>): Promise<Student>;
  updateStudent(studentId: string, updates: Partial<Student>): Promise<Student>;
  batchUpdateStudentWhatsAppStatus(
    studentIds: string[],
    status: WhatsAppStatus,
    metadata?: {
      templateId?: string;
      templateName?: string;
      templateVersion?: number | string;
      provider?: string;
      error?: string;
      messageId?: string;
      groupLink?: string;
      campaignId?: string;
      campaignName?: string;
      preserveSuccessful?: boolean;
      perStudentMetadata?: Record<
        string,
        {
          messageId?: string;
          error?: string;
          templateId?: string;
          templateName?: string;
          templateVersion?: number | string;
          messageContent?: string;
          groupLink?: string;
          campaignId?: string;
          campaignName?: string;
        }
      >;
    }
  ): Promise<number>;
  archiveStudent(studentId: string, actorUid: string): Promise<boolean>;
  batchCreateStudents(students: Array<Omit<Student, 'studentId' | 'createdAt' | 'updatedAt' | 'dataVersion'>>): Promise<{ createdCount: number; studentIds: string[] }>;

  // Registration Number Allocation (Atomic & Collision-Safe)
  allocateNextRegistrationNumber(prefix?: string, year?: string): Promise<string>;

  // Imports
  getImportJobs(): Promise<ImportJob[]>;
  getImportJobById(importId: string): Promise<ImportJob | null>;
  createImportJob(job: ImportJob): Promise<ImportJob>;
  updateImportJob(importId: string, updates: Partial<ImportJob>): Promise<ImportJob>;

  // Admit Cards
  getAdmitCards(): Promise<AdmitCard[]>;
  getAdmitCardByStudentId(studentId: string): Promise<AdmitCard | null>;
  saveAdmitCard(admitCard: AdmitCard): Promise<AdmitCard>;

  // Admit Card Jobs
  getAdmitCardJobs(): Promise<AdmitCardJob[]>;
  getAdmitCardJobById(jobId: string): Promise<AdmitCardJob | null>;
  createAdmitCardJob(job: AdmitCardJob): Promise<AdmitCardJob>;
  updateAdmitCardJob(jobId: string, updates: Partial<AdmitCardJob>): Promise<AdmitCardJob>;

  // Audit Logs
  addAuditLog(log: Omit<AuditLog, 'eventId' | 'timestamp'>): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;

  // Settings
  getSettings(): Promise<SystemSettings>;
  updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings>;

  // Users
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(uid: string): Promise<User | null>;
  upsertUser(user: User): Promise<User>;
}
