import fs from 'fs';
import path from 'path';
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
import { normalizePhone, matchesDob } from '../excel/normalizer';

interface DatabaseSchema {
  users: User[];
  students: Student[];
  imports: ImportJob[];
  admitCards: AdmitCard[];
  admitCardJobs: AdmitCardJob[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

const DEFAULT_SETTINGS: SystemSettings = {
  schoolName: 'Mind-Spark Inter-School Competition',
  competitionTitle: 'Annual Mind-Spark Academic Olympiad 2026',
  venue: process.env.DEFAULT_VENUE || 'MEENA SHAH PUBLIC SCHOOL, GONDA (U.P.)',
  examDate: process.env.DEFAULT_EXAM_DATE || '01 Nov 2026',
  reportingTime: '09:00 AM',
  contactPhone: '9569731566, 8948905711',
  contactEmail: 'admissions@mindspark.edu.in',
  regNoPrefix: 'MS',
  regNoYear: '26',
  regNoSeqCurrent: 1000,
};

const DEFAULT_USERS: User[] = [
  {
    uid: 'superadmin_1',
    email: 'superadmin@mindspark.edu.in',
    displayName: 'Headmaster (Super Admin)',
    role: 'SUPER_ADMIN',
    active: true,
    createdAt: new Date().toISOString(),
    passwordHash: '$2b$10$BVhiyB/z2UR7IEDgzUjiX.vKgNsWI6AZwg8hzLCCEFqtm5vQ09fyS', // Admin@MindSpark2026!
  },
  {
    uid: 'admin_1',
    email: 'admin@mindspark.edu.in',
    displayName: 'Exam Coordinator (Admin)',
    role: 'ADMIN',
    active: true,
    createdAt: new Date().toISOString(),
    passwordHash: '$2b$10$BVhiyB/z2UR7IEDgzUjiX.vKgNsWI6AZwg8hzLCCEFqtm5vQ09fyS', // Admin@MindSpark2026!
  },
  {
    uid: 'reg_op_1',
    email: 'operator@mindspark.edu.in',
    displayName: 'Registration Operator',
    role: 'REGISTRATION_OPERATOR',
    active: true,
    createdAt: new Date().toISOString(),
    passwordHash: '$2b$10$TuwU6Ky.3qB2nsh3K/F/fufQsalufUpJW3sNP/rPR8Heg/N1GNzuK', // Operator@2026!
  },
  {
    uid: 'excel_op_1',
    email: 'excel@mindspark.edu.in',
    displayName: 'Excel Operator',
    role: 'EXCEL_OPERATOR',
    active: true,
    createdAt: new Date().toISOString(),
    passwordHash: '$2b$10$TuwU6Ky.3qB2nsh3K/F/fufQsalufUpJW3sNP/rPR8Heg/N1GNzuK', // Operator@2026!
  },
  {
    uid: 'readonly_1',
    email: 'viewer@mindspark.edu.in',
    displayName: 'Staff Viewer (Read-only)',
    role: 'READ_ONLY',
    active: true,
    createdAt: new Date().toISOString(),
    passwordHash: '$2b$10$9mU8MmMJUjRZaOHLT6YIl.9kXXv7MZrKtp1EAVsBFNS4Uc6p5xOQa', // Viewer@2026!
  },
];

import os from 'os';

export class LocalJsonDbAdapter implements IDatabaseAdapter {
  private filePath: string;
  private isCustomPath: boolean = false;
  private data: DatabaseSchema;

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
      this.isCustomPath = true;
    } else if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      this.filePath = path.join(os.tmpdir(), 'mind_spark_db.json');
    } else {
      this.filePath = path.join(process.cwd(), '.data', 'mind_spark_db.json');
    }

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.warn('Could not create directory for database file, will maintain in memory:', err);
    }

    this.data = this.loadData();
  }

  public reload(): void {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.students)) {
          return {
            users: parsed.users || DEFAULT_USERS,
            students: parsed.students,
            imports: parsed.imports || [],
            admitCards: parsed.admitCards || [],
            admitCardJobs: parsed.admitCardJobs || [],
            auditLogs: parsed.auditLogs || [],
            settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          };
        }
      } catch (err) {
        console.error('Failed to parse database file, checking seed data:', err);
      }
    }

    // Check for bundled seed database (e.g. on Vercel / production deployment) - only if not custom test path
    const seedPath = path.join(process.cwd(), 'src', 'data', 'seed_db.json');
    if (!this.isCustomPath && fs.existsSync(seedPath)) {
      try {
        const seedContent = fs.readFileSync(seedPath, 'utf-8');
        const parsedSeed = JSON.parse(seedContent);
        const seeded: DatabaseSchema = {
          users: parsedSeed.users || DEFAULT_USERS,
          students: parsedSeed.students || [],
          imports: parsedSeed.imports || [],
          admitCards: parsedSeed.admitCards || [],
          admitCardJobs: parsedSeed.admitCardJobs || [],
          auditLogs: parsedSeed.auditLogs || [],
          settings: { ...DEFAULT_SETTINGS, ...(parsedSeed.settings || {}) },
        };
        this.saveData(seeded);
        return seeded;
      } catch (err) {
        console.warn('Failed to load seed database file:', err);
      }
    }

    const initial: DatabaseSchema = {
      users: DEFAULT_USERS,
      students: [],
      imports: [],
      admitCards: [],
      admitCardJobs: [],
      auditLogs: [],
      settings: DEFAULT_SETTINGS,
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to write database file, keeping in-memory:', err);
    }
  }

  private persist(): void {
    this.saveData(this.data);
  }

  // --- Students ---

  async getStudents(options: StudentQueryOptions = {}): Promise<StudentQueryResult> {
    let list = [...this.data.students];

    // Filter by status (default to non-VOID unless specified)
    if (options.status) {
      list = list.filter((s) => s.status === options.status);
    } else {
      list = list.filter((s) => s.status !== 'VOID');
    }

    // Filter by competition
    if (options.competition) {
      list = list.filter(
        (s) => s.competitionName.toLowerCase() === options.competition!.toLowerCase()
      );
    }

    // Filter by class
    if (options.className) {
      list = list.filter(
        (s) => s.className.toLowerCase() === options.className!.toLowerCase()
      );
    }

    // Filter by school/college
    if (options.schoolOrCollege) {
      list = list.filter(
        (s) => s.schoolOrCollege.toLowerCase().includes(options.schoolOrCollege!.toLowerCase())
      );
    }

    // Filter by WhatsApp Status
    if (options.whatsappStatus && options.whatsappStatus !== 'ALL') {
      list = list.filter(
        (s) => (s.whatsappStatus || 'NOT_SENT') === options.whatsappStatus
      );
    }

    // Search query across fields
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.registrationNumber.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.fatherName.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.schoolOrCollege.toLowerCase().includes(q)
      );
    }

    // Sort descending by registrationNumber / createdAt
    list.sort((a, b) => b.registrationNumber.localeCompare(a.registrationNumber));

    const total = list.length;
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, options.pageSize || 20);
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const students = list.slice(startIndex, startIndex + pageSize);

    return {
      students,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getAllActiveStudents(): Promise<Student[]> {
    return this.data.students.filter((s) => s.status === 'ACTIVE');
  }

  async getStudentById(studentId: string): Promise<Student | null> {
    return this.data.students.find((s) => s.studentId === studentId) || null;
  }

  async getStudentByRegNo(regNo: string): Promise<Student | null> {
    const clean = regNo.trim().toUpperCase();
    return this.data.students.find((s) => s.registrationNumber.toUpperCase() === clean) || null;
  }

  async createStudent(
    studentData: Omit<Student, 'studentId' | 'createdAt' | 'updatedAt' | 'dataVersion'>
  ): Promise<Student> {
    const cleanName = studentData.name.trim().toUpperCase();
    const cleanFather = studentData.fatherName.trim().toUpperCase();
    const cleanPhone = studentData.phone ? studentData.phone.replace(/\D/g, '').slice(-10) : '';

    // 1. Strict Duplicate Candidate Check: Prevent duplicate registrations of the same human student
    const existingCandidates = this.data.students.filter((s) => {
      if (s.status === 'VOID' || s.status === 'ARCHIVED') return false;
      return (
        s.name.trim().toUpperCase() === cleanName &&
        s.fatherName.trim().toUpperCase() === cleanFather
      );
    });

    if (existingCandidates.length > 0) {
      const match = existingCandidates.find((c) => {
        const phoneMatch = cleanPhone && normalizePhone(c.phone) === cleanPhone;
        const dobMatch = studentData.dateOfBirth && matchesDob(c.dateOfBirth, studentData.dateOfBirth);
        return phoneMatch || dobMatch;
      });

      if (match) {
        throw new Error(
          `DUPLICATE REGISTRATION CONFLICT: Candidate '${cleanName}' (Father: '${cleanFather}') is already registered under Registration No. ${match.registrationNumber} in event '${match.competitionName}' (Status: ${match.status}). A student cannot receive two simultaneous registrations or allotments.`
        );
      }
    }

    let regNo = studentData.registrationNumber?.trim();
    if (!regNo) {
      regNo = await this.allocateNextRegistrationNumber();
    } else {
      // Check collision
      const existing = await this.getStudentByRegNo(regNo);
      if (existing) {
        throw new Error(`Registration Number '${regNo}' already exists`);
      }
    }

    const now = new Date().toISOString();
    const student: Student = {
      ...studentData,
      studentId: `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      registrationNumber: regNo,
      createdAt: now,
      updatedAt: now,
      dataVersion: 1,
    };

    this.data.students.push(student);
    this.persist();
    return student;
  }

  async updateStudent(studentId: string, updates: Partial<Student>): Promise<Student> {
    const idx = this.data.students.findIndex((s) => s.studentId === studentId);
    if (idx === -1) {
      throw new Error(`Student '${studentId}' not found`);
    }

    const current = this.data.students[idx];

    // If changing registration number, check for collisions
    if (
      updates.registrationNumber &&
      updates.registrationNumber.toUpperCase() !== current.registrationNumber.toUpperCase()
    ) {
      const existing = await this.getStudentByRegNo(updates.registrationNumber);
      if (existing && existing.studentId !== studentId) {
        throw new Error(`Registration Number '${updates.registrationNumber}' already belongs to another student`);
      }
    }

    const updated: Student = {
      ...current,
      ...updates,
      studentId: current.studentId, // immutable
      createdAt: current.createdAt, // immutable
      updatedAt: new Date().toISOString(),
      dataVersion: current.dataVersion + 1,
    };

    this.data.students[idx] = updated;
    this.persist();
    return updated;
  }

  async batchUpdateStudentWhatsAppStatus(
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
  ): Promise<number> {
    if (!studentIds || studentIds.length === 0) return 0;
    const now = new Date().toISOString();
    const idSet = new Set(studentIds);
    let updatedCount = 0;

    for (let i = 0; i < this.data.students.length; i++) {
      if (idSet.has(this.data.students[i].studentId)) {
        const student = this.data.students[i];

        // Safe Delivery Policy: Successful deliveries and UNCERTAIN notifications must NEVER be reset to NOT_SENT if preserveSuccessful is requested
        const isProtected =
          student.whatsappStatus === 'SENT' ||
          student.whatsappStatus === 'DELIVERED' ||
          student.whatsappStatus === 'READ' ||
          student.whatsappStatus === 'OPENED' ||
          student.whatsappStatus === 'UNCERTAIN';
        if (status === 'NOT_SENT' && isProtected && metadata?.preserveSuccessful) {
          continue;
        }

        // Invariant: Confirmed delivery states and UNCERTAIN must NEVER be overwritten/downgraded to SENT
        if (status === 'SENT' && ['DELIVERED', 'READ', 'OPENED', 'UNCERTAIN'].includes(student.whatsappStatus || '')) {
          continue;
        }

        const history = Array.isArray(student.messageHistory) ? [...student.messageHistory] : [];
        const studentMeta = metadata?.perStudentMetadata?.[student.studentId];

        const tId = studentMeta?.templateId || metadata?.templateId || 'admit_card_new';
        const tName = studentMeta?.templateName || metadata?.templateName || 'Registration Confirmation';
        const tVer = studentMeta?.templateVersion ?? metadata?.templateVersion ?? 1;
        const msgContent = studentMeta?.messageContent || '';
        const grpLink = studentMeta?.groupLink || metadata?.groupLink || '';
        const campId = studentMeta?.campaignId || metadata?.campaignId || '';
        const campName = studentMeta?.campaignName || metadata?.campaignName || '';
        const msgId = studentMeta?.messageId || metadata?.messageId;
        const err = studentMeta?.error || metadata?.error;

        if (metadata?.templateId || metadata?.templateName || studentMeta) {
          history.push({
            templateId: tId,
            templateName: tName,
            templateVersion: tVer,
            messageContent: msgContent,
            groupLink: grpLink,
            campaignId: campId,
            campaignName: campName,
            sentAt: now,
            status,
            messageId: msgId,
            error: err,
            provider: metadata?.provider || 'WhatsApp Gateway',
            retryCount: history.length + 1,
          });
        }

        this.data.students[i] = {
          ...student,
          whatsappStatus: status,
          whatsappSentAt: (status === 'SENT' || status === 'OPENED') ? now : student.whatsappSentAt,
          lastTemplateId: tId || student.lastTemplateId,
          lastTemplateName: tName || student.lastTemplateName,
          lastTemplateVersion: tVer || student.lastTemplateVersion,
          lastMessageContent: msgContent || student.lastMessageContent,
          lastGroupLink: grpLink || student.lastGroupLink,
          messageHistory: history,
          updatedAt: now,
          dataVersion: student.dataVersion + 1,
        };
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      this.persist();
    }
    return updatedCount;
  }

  async archiveStudent(studentId: string, actorUid: string): Promise<boolean> {
    const student = await this.getStudentById(studentId);
    if (!student) return false;

    await this.updateStudent(studentId, {
      status: 'ARCHIVED',
      updatedBy: actorUid,
    });
    return true;
  }

  async batchCreateStudents(
    students: Array<Omit<Student, 'studentId' | 'createdAt' | 'updatedAt' | 'dataVersion'>>
  ): Promise<{ createdCount: number; studentIds: string[] }> {
    const createdIds: string[] = [];
    const now = new Date().toISOString();

    for (const item of students) {
      let regNo = item.registrationNumber?.trim();
      if (!regNo) {
        regNo = await this.allocateNextRegistrationNumber();
      }

      const student: Student = {
        ...item,
        studentId: `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        registrationNumber: regNo,
        createdAt: now,
        updatedAt: now,
        dataVersion: 1,
      };

      this.data.students.push(student);
      createdIds.push(student.studentId);
    }

    this.persist();
    return { createdCount: createdIds.length, studentIds: createdIds };
  }

  async allocateNextRegistrationNumber(prefix?: string, year?: string): Promise<string> {
    const currentSettings = this.data.settings;
    const pfx = prefix || currentSettings.regNoPrefix || 'MS';
    const yr = year || currentSettings.regNoYear || '26';

    let nextSeq = (currentSettings.regNoSeqCurrent || 1000) + 1;

    // Dynamically guarantee nextSeq is strictly greater than any existing student in the same sequence pool
    const regPattern = new RegExp(`^${pfx}${yr}(\\d+)$`, 'i');
    for (const s of this.data.students) {
      const match = s.registrationNumber ? s.registrationNumber.match(regPattern) : null;
      if (match && match[1].length === String(nextSeq).length) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num >= nextSeq) {
          nextSeq = num + 1;
        }
      }
    }

    currentSettings.regNoSeqCurrent = nextSeq;
    this.persist();

    const formattedSeq = yr.length > 2 ? String(nextSeq).padStart(5, '0') : String(nextSeq);
    return `${pfx}${yr}${formattedSeq}`;
  }

  // --- Imports ---

  async getImportJobs(): Promise<ImportJob[]> {
    return [...this.data.imports].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  async getImportJobById(importId: string): Promise<ImportJob | null> {
    return this.data.imports.find((j) => j.importId === importId) || null;
  }

  async createImportJob(job: ImportJob): Promise<ImportJob> {
    this.data.imports.push(job);
    this.persist();
    return job;
  }

  async updateImportJob(importId: string, updates: Partial<ImportJob>): Promise<ImportJob> {
    const idx = this.data.imports.findIndex((j) => j.importId === importId);
    if (idx === -1) throw new Error(`Import job '${importId}' not found`);

    const updated = { ...this.data.imports[idx], ...updates };
    this.data.imports[idx] = updated;
    this.persist();
    return updated;
  }

  // --- Admit Cards ---

  async getAdmitCards(): Promise<AdmitCard[]> {
    return [...this.data.admitCards];
  }

  async getAdmitCardByStudentId(studentId: string): Promise<AdmitCard | null> {
    return this.data.admitCards.find((c) => c.studentId === studentId) || null;
  }

  async saveAdmitCard(card: AdmitCard): Promise<AdmitCard> {
    const idx = this.data.admitCards.findIndex((c) => c.studentId === card.studentId);
    if (idx !== -1) {
      this.data.admitCards[idx] = card;
    } else {
      this.data.admitCards.push(card);
    }
    this.persist();
    return card;
  }

  // --- Admit Card Jobs ---

  async getAdmitCardJobs(): Promise<AdmitCardJob[]> {
    return [...this.data.admitCardJobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAdmitCardJobById(jobId: string): Promise<AdmitCardJob | null> {
    return this.data.admitCardJobs.find((j) => j.jobId === jobId) || null;
  }

  async createAdmitCardJob(job: AdmitCardJob): Promise<AdmitCardJob> {
    this.data.admitCardJobs.push(job);
    this.persist();
    return job;
  }

  async updateAdmitCardJob(jobId: string, updates: Partial<AdmitCardJob>): Promise<AdmitCardJob> {
    const idx = this.data.admitCardJobs.findIndex((j) => j.jobId === jobId);
    if (idx === -1) throw new Error(`Admit card job '${jobId}' not found`);

    const updated = { ...this.data.admitCardJobs[idx], ...updates };
    this.data.admitCardJobs[idx] = updated;
    this.persist();
    return updated;
  }

  // --- Audit Logs ---

  async addAuditLog(log: Omit<AuditLog, 'eventId' | 'timestamp'>): Promise<AuditLog> {
    const fullLog: AuditLog = {
      ...log,
      eventId: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.push(fullLog);
    this.persist();
    return fullLog;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return [...this.data.auditLogs]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }

  // --- Settings ---

  async getSettings(): Promise<SystemSettings> {
    return { ...this.data.settings };
  }

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    this.data.settings = { ...this.data.settings, ...settings };
    this.persist();
    return { ...this.data.settings };
  }

  // --- Users ---

  async getUserByEmail(email: string): Promise<User | null> {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async getUserById(uid: string): Promise<User | null> {
    return this.data.users.find((u) => u.uid === uid) || null;
  }

  async upsertUser(user: User): Promise<User> {
    const idx = this.data.users.findIndex((u) => u.uid === user.uid || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...user };
    } else {
      this.data.users.push(user);
    }
    this.persist();
    return user;
  }
}
