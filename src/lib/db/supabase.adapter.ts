import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

function getExtendedSettingsPath(): string {
  const dir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'whatsapp_extended_settings.json');
}

function getStudentHistoryPath(): string {
  const dir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'whatsapp_student_history.json');
}

function loadExtendedSettings(): Partial<SystemSettings> {
  try {
    const p = getExtendedSettingsPath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read extended settings:', e);
  }
  return {};
}

function saveExtendedSettings(ext: Partial<SystemSettings>) {
  try {
    const current = loadExtendedSettings();
    const updated = { ...current, ...ext };
    fs.writeFileSync(getExtendedSettingsPath(), JSON.stringify(updated, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write extended settings:', e);
  }
}

function loadStudentHistoryMap(): Record<
  string,
  {
    lastTemplateId?: string;
    lastTemplateName?: string;
    lastTemplateVersion?: number | string;
    lastMessageContent?: string;
    lastGroupLink?: string;
    messageHistory: any[];
  }
> {
  try {
    const p = getStudentHistoryPath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read student history:', e);
  }
  return {};
}

function saveStudentHistoryMap(map: Record<string, any>) {
  try {
    fs.writeFileSync(getStudentHistoryPath(), JSON.stringify(map, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write student history:', e);
  }
}

const DEFAULT_SETTINGS: SystemSettings = {
  schoolName: 'Mind-Spark Inter-School Competition',
  competitionTitle: 'Annual Mind-Spark Academic Olympiad 2026',
  venue: process.env.DEFAULT_VENUE || 'MSITM DEGREE COLLEGE GONDA UTTAR PRADESH',
  examDate: process.env.DEFAULT_EXAM_DATE || '01 Nov 2026',
  reportingTime: '09:00 AM',
  contactPhone: '9876543210',
  contactEmail: 'admissions@mindspark.edu.in',
  regNoPrefix: 'MS',
  regNoYear: '26',
  regNoSeqCurrent: 1000,
  categoryWhatsAppLinks: {},
  defaultWhatsAppGroupLink: 'https://chat.whatsapp.com/DTuxN2SADVdCm714xkPB3L',
  whatsappGroupLinks: [],
  customTemplates: [],
  whatsappCampaigns: [],
};

export class SupabaseAdapter implements IDatabaseAdapter {
  private client: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      supabaseKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        'Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local'
      );
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  // --- Students ---

  async getStudents(options: StudentQueryOptions = {}): Promise<StudentQueryResult> {
    let query = this.client.from('students').select('*', { count: 'exact' });

    if (options.status) {
      query = query.eq('status', options.status);
    } else {
      query = query.neq('status', 'VOID');
    }

    if (options.competition) {
      query = query.ilike('competition_name', options.competition);
    }

    if (options.className) {
      query = query.ilike('class_name', options.className);
    }

    if (options.schoolOrCollege) {
      query = query.ilike('school_or_college', `%${options.schoolOrCollege}%`);
    }

    if (options.whatsappStatus && options.whatsappStatus !== 'ALL') {
      query = query.eq('whatsapp_status', options.whatsappStatus);
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      query = query.or(
        `registration_number.ilike.%${q}%,name.ilike.%${q}%,father_name.ilike.%${q}%,phone.ilike.%${q}%,school_or_college.ilike.%${q}%`
      );
    }

    query = query.order('registration_number', { ascending: false });

    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, options.pageSize || 20);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw new Error(`Supabase error getting students: ${error.message}`);

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const students = (data || []).map(this.mapRowToStudent);

    return {
      students,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getAllActiveStudents(): Promise<Student[]> {
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await this.client
        .from('students')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('registration_number', { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) throw new Error(`Supabase error: ${error.message}`);
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    return allData.map(this.mapRowToStudent);
  }

  async getStudentById(studentId: string): Promise<Student | null> {
    const { data, error } = await this.client
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) throw new Error(`Supabase error: ${error.message}`);
    return data ? this.mapRowToStudent(data) : null;
  }

  async getStudentByRegNo(regNo: string): Promise<Student | null> {
    const clean = regNo.trim().toUpperCase();
    const { data, error } = await this.client
      .from('students')
      .select('*')
      .ilike('registration_number', clean)
      .maybeSingle();

    if (error) throw new Error(`Supabase error: ${error.message}`);
    return data ? this.mapRowToStudent(data) : null;
  }

  async createStudent(
    studentData: Omit<Student, 'studentId' | 'createdAt' | 'updatedAt' | 'dataVersion'>
  ): Promise<Student> {
    let regNo = studentData.registrationNumber?.trim();
    if (!regNo) {
      regNo = await this.allocateNextRegistrationNumber();
    }

    const studentId = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const row = {
      student_id: studentId,
      registration_number: regNo.toUpperCase(),
      name: studentData.name.trim().toUpperCase(),
      father_name: studentData.fatherName.trim().toUpperCase(),
      date_of_birth: studentData.dateOfBirth,
      phone: studentData.phone.replace(/\D/g, '').slice(-10),
      school_or_college: studentData.schoolOrCollege.trim().toUpperCase(),
      class_name: studentData.className?.trim().toUpperCase() || '',
      competition_name: studentData.competitionName?.trim().toUpperCase() || 'GENERAL',
      status: studentData.status || 'ACTIVE',
      whatsapp_status: studentData.whatsappStatus || 'NOT_SENT',
      whatsapp_sent_at: studentData.whatsappSentAt || null,
      source_import_id: studentData.sourceImportId || null,
      created_at: now,
      created_by: studentData.createdBy || 'system',
      updated_at: now,
      updated_by: studentData.updatedBy || 'system',
      data_version: 1,
    };

    const { data, error } = await this.client.from('students').insert(row).select().single();
    if (error) throw new Error(`Supabase insert student error: ${error.message}`);
    return this.mapRowToStudent(data);
  }

  async updateStudent(studentId: string, updates: Partial<Student>): Promise<Student> {
    const rowUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) rowUpdates.name = updates.name.trim().toUpperCase();
    if (updates.fatherName !== undefined) rowUpdates.father_name = updates.fatherName.trim().toUpperCase();
    if (updates.dateOfBirth !== undefined) rowUpdates.date_of_birth = updates.dateOfBirth;
    if (updates.phone !== undefined) rowUpdates.phone = updates.phone.replace(/\D/g, '').slice(-10);
    if (updates.schoolOrCollege !== undefined) rowUpdates.school_or_college = updates.schoolOrCollege.trim().toUpperCase();
    if (updates.className !== undefined) rowUpdates.class_name = updates.className.trim().toUpperCase();
    if (updates.competitionName !== undefined) rowUpdates.competition_name = updates.competitionName.trim().toUpperCase();
    if (updates.status !== undefined) rowUpdates.status = updates.status;
    if (updates.whatsappStatus !== undefined) rowUpdates.whatsapp_status = updates.whatsappStatus;
    if (updates.whatsappSentAt !== undefined) rowUpdates.whatsapp_sent_at = updates.whatsappSentAt;
    if (updates.updatedBy !== undefined) rowUpdates.updated_by = updates.updatedBy;

    const { data, error } = await this.client
      .from('students')
      .update(rowUpdates)
      .eq('student_id', studentId)
      .select()
      .single();

    if (error) throw new Error(`Supabase update student error: ${error.message}`);
    return this.mapRowToStudent(data);
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
    if (studentIds.length === 0) return 0;

    const now = new Date().toISOString();
    let query = this.client
      .from('students')
      .update({
        whatsapp_status: status,
        ...(status === 'SENT' || status === 'OPENED' ? { whatsapp_sent_at: now } : {}),
        updated_at: now,
      })
      .in('student_id', studentIds);

    // Safe Delivery Policy: Successful deliveries and UNCERTAIN notifications must NEVER be reset to NOT_SENT if preserveSuccessful is requested
    if (status === 'NOT_SENT' && metadata?.preserveSuccessful) {
      query = query.not('whatsapp_status', 'in', '("SENT","DELIVERED","READ","OPENED","UNCERTAIN")');
    }

    const { error, count } = await query;

    if (error) throw new Error(`Supabase batch whatsapp update error: ${error.message}`);

    // Update extended student message history store
    try {
      const historyMap = loadStudentHistoryMap();
      for (const sId of studentIds) {
        const studentRecord = historyMap[sId] || { messageHistory: [] };
        const sMeta = metadata?.perStudentMetadata?.[sId];
        const tId = sMeta?.templateId || metadata?.templateId || 'admit_card_new';
        const tName = sMeta?.templateName || metadata?.templateName || 'Registration Confirmation';
        const tVer = sMeta?.templateVersion ?? metadata?.templateVersion ?? 1;
        const msgContent = sMeta?.messageContent || '';
        const grpLink = sMeta?.groupLink || metadata?.groupLink || '';
        const campId = sMeta?.campaignId || metadata?.campaignId || '';
        const campName = sMeta?.campaignName || metadata?.campaignName || '';
        const msgId = sMeta?.messageId || metadata?.messageId;
        const err = sMeta?.error || metadata?.error;

        studentRecord.lastTemplateId = tId;
        studentRecord.lastTemplateName = tName;
        studentRecord.lastTemplateVersion = tVer;
        if (msgContent) studentRecord.lastMessageContent = msgContent;
        if (grpLink) studentRecord.lastGroupLink = grpLink;
        studentRecord.messageHistory = Array.isArray(studentRecord.messageHistory) ? studentRecord.messageHistory : [];
        studentRecord.messageHistory.push({
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
          retryCount: studentRecord.messageHistory.length + 1,
        });

        historyMap[sId] = studentRecord;
      }
      saveStudentHistoryMap(historyMap);
    } catch (histErr) {
      console.error('Failed to update student history map:', histErr);
    }

    return count || studentIds.length;
  }

  async archiveStudent(studentId: string, actorUid: string): Promise<boolean> {
    const now = new Date().toISOString();
    const { error } = await this.client
      .from('students')
      .update({
        status: 'ARCHIVED',
        updated_at: now,
        updated_by: actorUid,
      })
      .eq('student_id', studentId);

    if (error) throw new Error(`Supabase archive student error: ${error.message}`);
    return true;
  }

  async batchCreateStudents(
    students: Array<Omit<Student, 'studentId' | 'createdAt' | 'updatedAt' | 'dataVersion'>>
  ): Promise<{ createdCount: number; studentIds: string[] }> {
    if (students.length === 0) return { createdCount: 0, studentIds: [] };

    const settings = await this.getSettings();
    const prefix = settings.regNoPrefix || 'MS';
    const year = settings.regNoYear || '26';
    let currentSeq = settings.regNoSeqCurrent || 1000;

    const now = new Date().toISOString();
    const rowsToInsert: any[] = [];
    const generatedIds: string[] = [];

    for (const s of students) {
      let regNo = s.registrationNumber?.trim();
      if (!regNo) {
        currentSeq++;
        regNo = `${prefix}${year}${currentSeq}`;
      }

      const id = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      generatedIds.push(id);

      rowsToInsert.push({
        student_id: id,
        registration_number: regNo.toUpperCase(),
        name: s.name.trim().toUpperCase(),
        father_name: s.fatherName.trim().toUpperCase(),
        date_of_birth: s.dateOfBirth,
        phone: s.phone.replace(/\D/g, '').slice(-10),
        school_or_college: s.schoolOrCollege.trim().toUpperCase(),
        class_name: s.className?.trim().toUpperCase() || '',
        competition_name: s.competitionName?.trim().toUpperCase() || 'GENERAL',
        status: s.status || 'ACTIVE',
        whatsapp_status: s.whatsappStatus || 'NOT_SENT',
        whatsapp_sent_at: s.whatsappSentAt || null,
        source_import_id: s.sourceImportId || null,
        created_at: now,
        created_by: s.createdBy || 'system',
        updated_at: now,
        updated_by: s.updatedBy || 'system',
        data_version: 1,
      });
    }

    const { error } = await this.client.from('students').insert(rowsToInsert);
    if (error) throw new Error(`Supabase batch insert error: ${error.message}`);

    await this.updateSettings({ regNoSeqCurrent: currentSeq });

    return { createdCount: rowsToInsert.length, studentIds: generatedIds };
  }

  // --- Registration Number Generator ---

  async allocateNextRegistrationNumber(prefix?: string, year?: string): Promise<string> {
    const settings = await this.getSettings();
    const p = prefix || settings.regNoPrefix || 'MS';
    const y = year || settings.regNoYear || '26';
    const nextSeq = (settings.regNoSeqCurrent || 1000) + 1;

    await this.updateSettings({ regNoSeqCurrent: nextSeq });
    const formattedSeq = y.length > 2 ? String(nextSeq).padStart(5, '0') : String(nextSeq);
    return `${p}${y}${formattedSeq}`;
  }

  // --- Imports ---

  async getImportJobs(): Promise<ImportJob[]> {
    const { data, error } = await this.client
      .from('import_jobs')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) return [];
    return (data || []).map(this.mapRowToImportJob);
  }

  async getImportJobById(importId: string): Promise<ImportJob | null> {
    const { data, error } = await this.client
      .from('import_jobs')
      .select('*')
      .eq('import_id', importId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRowToImportJob(data);
  }

  async createImportJob(job: ImportJob): Promise<ImportJob> {
    const row = {
      import_id: job.importId,
      file_name: job.fileName,
      file_fingerprint: job.fileFingerprint,
      uploaded_by: job.uploadedBy,
      uploaded_at: job.uploadedAt,
      status: job.status,
      total_rows: job.totalRows,
      valid_rows: job.validRows,
      warning_rows: job.warningRows,
      rejected_rows: job.rejectedRows,
      processed_rows: job.processedRows,
      mapping_version: job.mappingVersion,
      error_report: job.errorReport || [],
    };

    const { data, error } = await this.client.from('import_jobs').insert(row).select().single();
    if (error) throw new Error(`Supabase create import error: ${error.message}`);
    return this.mapRowToImportJob(data);
  }

  async updateImportJob(importId: string, updates: Partial<ImportJob>): Promise<ImportJob> {
    const row: Record<string, any> = {};
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.processedRows !== undefined) row.processed_rows = updates.processedRows;
    if (updates.errorReport !== undefined) row.error_report = updates.errorReport;

    const { data, error } = await this.client
      .from('import_jobs')
      .update(row)
      .eq('import_id', importId)
      .select()
      .single();

    if (error) throw new Error(`Supabase update import error: ${error.message}`);
    return this.mapRowToImportJob(data);
  }

  // --- Admit Cards ---

  async getAdmitCards(): Promise<AdmitCard[]> {
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await this.client
        .from('admit_cards')
        .select('*')
        .range(from, from + batchSize - 1);

      if (error) return [];
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    return allData.map(this.mapRowToAdmitCard);
  }

  async getAdmitCardByStudentId(studentId: string): Promise<AdmitCard | null> {
    const { data, error } = await this.client
      .from('admit_cards')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRowToAdmitCard(data);
  }

  async saveAdmitCard(admitCard: AdmitCard): Promise<AdmitCard> {
    const row = {
      student_id: admitCard.studentId,
      registration_number: admitCard.registrationNumber,
      file_id: admitCard.fileId,
      storage_type: admitCard.storageType,
      template_version: admitCard.templateVersion,
      source_data_hash: admitCard.sourceDataHash,
      status: admitCard.status,
      generated_at: admitCard.generatedAt,
      updated_at: admitCard.updatedAt,
    };

    const { data, error } = await this.client
      .from('admit_cards')
      .upsert(row, { onConflict: 'student_id' })
      .select()
      .single();

    if (error) throw new Error(`Supabase save admit card error: ${error.message}`);
    return this.mapRowToAdmitCard(data);
  }

  // --- Admit Card Jobs ---

  async getAdmitCardJobs(): Promise<AdmitCardJob[]> {
    const { data, error } = await this.client
      .from('admit_card_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map(this.mapRowToAdmitCardJob);
  }

  async getAdmitCardJobById(jobId: string): Promise<AdmitCardJob | null> {
    const { data, error } = await this.client
      .from('admit_card_jobs')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRowToAdmitCardJob(data);
  }

  async createAdmitCardJob(job: AdmitCardJob): Promise<AdmitCardJob> {
    const row = {
      job_id: job.jobId,
      created_by: job.createdBy,
      created_at: job.createdAt,
      status: job.status,
      template_version: job.templateVersion,
      total: job.total,
      processed: job.processed,
      succeeded: job.succeeded,
      failed: job.failed,
      last_progress_at: job.lastProgressAt,
      errors: job.errors || [],
    };

    const { data, error } = await this.client.from('admit_card_jobs').insert(row).select().single();
    if (error) throw new Error(`Supabase create admit job error: ${error.message}`);
    return this.mapRowToAdmitCardJob(data);
  }

  async updateAdmitCardJob(jobId: string, updates: Partial<AdmitCardJob>): Promise<AdmitCardJob> {
    const row: Record<string, any> = {};
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.processed !== undefined) row.processed = updates.processed;
    if (updates.succeeded !== undefined) row.succeeded = updates.succeeded;
    if (updates.failed !== undefined) row.failed = updates.failed;
    if (updates.lastProgressAt !== undefined) row.last_progress_at = updates.lastProgressAt;
    if (updates.errors !== undefined) row.errors = updates.errors;

    const { data, error } = await this.client
      .from('admit_card_jobs')
      .update(row)
      .eq('job_id', jobId)
      .select()
      .single();

    if (error) throw new Error(`Supabase update admit job error: ${error.message}`);
    return this.mapRowToAdmitCardJob(data);
  }

  // --- Audit Logs ---

  async addAuditLog(log: Omit<AuditLog, 'eventId' | 'timestamp'>): Promise<AuditLog> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const row = {
      event_id: eventId,
      actor_uid: log.actorUid,
      actor_email: log.actorEmail,
      action: log.action,
      target_type: log.targetType,
      target_id: log.targetId,
      timestamp,
      details: log.details || {},
    };

    await this.client.from('audit_logs').insert(row);
    return {
      eventId,
      actorUid: log.actorUid,
      actorEmail: log.actorEmail,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      timestamp,
      details: log.details,
    };
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    const { data, error } = await this.client
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data || []).map((row) => ({
      eventId: row.event_id,
      actorUid: row.actor_uid,
      actorEmail: row.actor_email,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      timestamp: row.timestamp,
      details: row.details,
    }));
  }

  // --- Settings ---

  async getSettings(): Promise<SystemSettings> {
    const { data, error } = await this.client
      .from('system_settings')
      .select('*')
      .eq('id', 'default_settings')
      .maybeSingle();

    const ext = loadExtendedSettings();

    if (error || !data) {
      return { ...DEFAULT_SETTINGS, ...ext };
    }

    return {
      schoolName: data.school_name || DEFAULT_SETTINGS.schoolName,
      competitionTitle: data.competition_title || DEFAULT_SETTINGS.competitionTitle,
      venue: data.venue || DEFAULT_SETTINGS.venue,
      examDate: data.exam_date || DEFAULT_SETTINGS.examDate,
      reportingTime: data.reporting_time || DEFAULT_SETTINGS.reportingTime,
      contactPhone: data.contact_phone || DEFAULT_SETTINGS.contactPhone,
      contactEmail: data.contact_email || DEFAULT_SETTINGS.contactEmail,
      regNoPrefix: data.reg_no_prefix || DEFAULT_SETTINGS.regNoPrefix,
      regNoYear: data.reg_no_year || DEFAULT_SETTINGS.regNoYear,
      regNoSeqCurrent: Number(data.reg_no_seq_current || DEFAULT_SETTINGS.regNoSeqCurrent),
      whatsappCloudToken: data.whatsapp_cloud_token,
      whatsappPhoneNumberId: data.whatsapp_phone_number_id,
      whatsappTemplateName: data.whatsapp_template_name,
      categoryWhatsAppLinks: ext.categoryWhatsAppLinks || {},
      defaultWhatsAppGroupLink: ext.defaultWhatsAppGroupLink || 'https://chat.whatsapp.com/DTuxN2SADVdCm714xkPB3L',
      whatsappGroupLinks: ext.whatsappGroupLinks || [],
      customTemplates: ext.customTemplates || [],
      whatsappCampaigns: ext.whatsappCampaigns || [],
    };
  }

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };

    // Persist dynamic extended WhatsApp settings to local store
    saveExtendedSettings({
      categoryWhatsAppLinks: updated.categoryWhatsAppLinks,
      defaultWhatsAppGroupLink: updated.defaultWhatsAppGroupLink,
      whatsappGroupLinks: updated.whatsappGroupLinks,
      customTemplates: updated.customTemplates,
      whatsappCampaigns: updated.whatsappCampaigns,
    });

    const row = {
      id: 'default_settings',
      school_name: updated.schoolName,
      competition_title: updated.competitionTitle,
      venue: updated.venue,
      exam_date: updated.examDate,
      reporting_time: updated.reportingTime,
      contact_phone: updated.contactPhone,
      contact_email: updated.contactEmail,
      reg_no_prefix: updated.regNoPrefix,
      reg_no_year: updated.regNoYear,
      reg_no_seq_current: updated.regNoSeqCurrent,
      whatsapp_cloud_token: updated.whatsappCloudToken,
      whatsapp_phone_number_id: updated.whatsappPhoneNumberId,
      whatsapp_template_name: updated.whatsappTemplateName,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.client
      .from('system_settings')
      .upsert(row, { onConflict: 'id' });

    if (error) throw new Error(`Supabase update settings error: ${error.message}`);
    return updated;
  }

  // --- Users ---

  async getUserByEmail(email: string): Promise<User | null> {
    const clean = email.toLowerCase().trim();
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .ilike('email', clean)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRowToUser(data);
  }

  async getUserById(uid: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('uid', uid)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRowToUser(data);
  }

  async upsertUser(user: User): Promise<User> {
    const row = {
      uid: user.uid,
      email: user.email.toLowerCase().trim(),
      display_name: user.displayName,
      role: user.role,
      active: user.active,
      created_at: user.createdAt,
      last_login_at: user.lastLoginAt || null,
      password_hash: user.passwordHash || null,
    };

    const { data, error } = await this.client
      .from('users')
      .upsert(row, { onConflict: 'uid' })
      .select()
      .single();

    if (error) throw new Error(`Supabase upsert user error: ${error.message}`);
    return this.mapRowToUser(data);
  }

  // --- Helper mappers ---

  private mapRowToStudent(row: any): Student {
    const historyMap = loadStudentHistoryMap();
    const hist = historyMap[row.student_id];

    return {
      studentId: row.student_id,
      registrationNumber: row.registration_number,
      name: row.name,
      fatherName: row.father_name,
      dateOfBirth: row.date_of_birth,
      phone: row.phone,
      schoolOrCollege: row.school_or_college,
      className: row.class_name,
      competitionName: row.competition_name,
      status: row.status,
      whatsappStatus: row.whatsapp_status,
      whatsappSentAt: row.whatsapp_sent_at,
      lastTemplateId: hist?.lastTemplateId,
      lastTemplateName: hist?.lastTemplateName,
      lastTemplateVersion: hist?.lastTemplateVersion,
      lastMessageContent: hist?.lastMessageContent,
      lastGroupLink: hist?.lastGroupLink,
      messageHistory: hist?.messageHistory || [],
      sourceImportId: row.source_import_id,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      dataVersion: row.data_version,
    };
  }

  private mapRowToImportJob(row: any): ImportJob {
    return {
      importId: row.import_id,
      fileName: row.file_name,
      fileFingerprint: row.file_fingerprint,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
      status: row.status,
      totalRows: row.total_rows,
      validRows: row.valid_rows,
      warningRows: row.warning_rows,
      rejectedRows: row.rejected_rows,
      processedRows: row.processed_rows,
      mappingVersion: row.mapping_version,
      errorReport: row.error_report,
    };
  }

  private mapRowToAdmitCard(row: any): AdmitCard {
    return {
      studentId: row.student_id,
      registrationNumber: row.registration_number,
      fileId: row.file_id,
      storageType: row.storage_type,
      templateVersion: row.template_version,
      sourceDataHash: row.source_data_hash,
      status: row.status,
      generatedAt: row.generated_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToAdmitCardJob(row: any): AdmitCardJob {
    return {
      jobId: row.job_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      status: row.status,
      templateVersion: row.template_version,
      total: row.total,
      processed: row.processed,
      succeeded: row.succeeded,
      failed: row.failed,
      lastProgressAt: row.last_progress_at,
      errors: row.errors || [],
    };
  }

  private mapRowToUser(row: any): User {
    return {
      uid: row.uid,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      active: row.active,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      passwordHash: row.password_hash,
    };
  }
}
