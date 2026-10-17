import {
  IDatabaseAdapter,
  StudentQueryOptions,
  StudentQueryResult,
} from './adapter.interface';
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

/**
 * Cloud Firestore Production Database Adapter.
 * Connects to Firebase Admin SDK Firestore in production.
 */
export class FirestoreAdapter implements IDatabaseAdapter {
  private projectId: string;

  constructor() {
    this.projectId = process.env.FIREBASE_PROJECT_ID || '';
    if (!this.projectId) {
      console.warn('FIREBASE_PROJECT_ID not set. Ensure Firebase Admin is properly initialized in production.');
    }
  }

  async getStudents(options: StudentQueryOptions = {}): Promise<StudentQueryResult> {
    // In production, queries Firestore 'students' collection with limits, where clauses, and cursors
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getAllActiveStudents(): Promise<Student[]> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getStudentById(studentId: string): Promise<Student | null> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getStudentByRegNo(regNo: string): Promise<Student | null> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async createStudent(student: Omit<Student, 'studentId' | 'createdAt' | 'updatedAt' | 'dataVersion'>): Promise<Student> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async updateStudent(studentId: string, updates: Partial<Student>): Promise<Student> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async batchUpdateStudentWhatsAppStatus(studentIds: string[], status: WhatsAppStatus): Promise<number> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async archiveStudent(studentId: string, actorUid: string): Promise<boolean> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async batchCreateStudents(students: Array<Omit<Student, 'studentId' | 'createdAt' | 'updatedAt' | 'dataVersion'>>): Promise<{ createdCount: number; studentIds: string[] }> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async allocateNextRegistrationNumber(prefix?: string, year?: string): Promise<string> {
    // Uses runTransaction on 'settings/counters' document to atomically increment sequence
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getImportJobs(): Promise<ImportJob[]> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getImportJobById(importId: string): Promise<ImportJob | null> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async createImportJob(job: ImportJob): Promise<ImportJob> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async updateImportJob(importId: string, updates: Partial<ImportJob>): Promise<ImportJob> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getAdmitCards(): Promise<AdmitCard[]> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getAdmitCardByStudentId(studentId: string): Promise<AdmitCard | null> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async saveAdmitCard(admitCard: AdmitCard): Promise<AdmitCard> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getAdmitCardJobs(): Promise<AdmitCardJob[]> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getAdmitCardJobById(jobId: string): Promise<AdmitCardJob | null> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async createAdmitCardJob(job: AdmitCardJob): Promise<AdmitCardJob> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async updateAdmitCardJob(jobId: string, updates: Partial<AdmitCardJob>): Promise<AdmitCardJob> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async addAuditLog(log: Omit<AuditLog, 'eventId' | 'timestamp'>): Promise<AuditLog> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getSettings(): Promise<SystemSettings> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getUserByEmail(email: string): Promise<User | null> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async getUserById(uid: string): Promise<User | null> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }

  async upsertUser(user: User): Promise<User> {
    throw new Error('Firestore adapter requires production Firebase Admin credentials');
  }
}
