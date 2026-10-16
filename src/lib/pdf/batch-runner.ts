import { getDb } from '@/lib/db';
import { getStorageAdapter } from '@/lib/storage';
import { AdmitCardJob, Student } from '@/types';
import {
  generateAdmitCardPdf,
  computeStudentDataHash,
  ADMIT_CARD_TEMPLATE_VERSION,
} from './template';

export interface BatchGenerationOptions {
  batchSize?: number; // Number of cards to generate in this invocation (e.g. 25)
  competition?: string;
  forceRegenerate?: boolean;
}

export class AdmitCardBatchRunner {
  /**
   * Initializes or fetches an active admit card generation job.
   */
  static async startOrGetJob(actorUid: string, options: BatchGenerationOptions = {}): Promise<AdmitCardJob> {
    const db = getDb();
    let students = await db.getAllActiveStudents();

    if (options.competition) {
      students = students.filter(
        (s) => s.competitionName.toLowerCase() === options.competition!.toLowerCase()
      );
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: AdmitCardJob = {
      jobId,
      createdBy: actorUid,
      createdAt: new Date().toISOString(),
      status: 'QUEUED',
      templateVersion: ADMIT_CARD_TEMPLATE_VERSION,
      total: students.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      lastProgressAt: new Date().toISOString(),
      errors: [],
    };

    await db.createAdmitCardJob(job);
    return job;
  }

  /**
   * Processes a slice of the batch. Can be called repeatedly by the client/route handler
   * until all students have been processed (resumable design).
   */
  static async processBatchChunk(
    jobId: string,
    options: BatchGenerationOptions = {}
  ): Promise<AdmitCardJob> {
    const db = getDb();
    const storage = getStorageAdapter();
    const settings = await db.getSettings();

    const job = await db.getAdmitCardJobById(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }

    if (job.status === 'READY' || job.status === 'CANCELLED') {
      return job;
    }

    await db.updateAdmitCardJob(jobId, { status: 'PROCESSING' });

    let allStudents = await db.getAllActiveStudents();
    if (options.competition) {
      allStudents = allStudents.filter(
        (s) => s.competitionName.toLowerCase() === options.competition!.toLowerCase()
      );
    }

    const existingCards = await db.getAdmitCards();
    const cardMap = new Map(existingCards.map((c) => [c.studentId, c]));

    // Determine pending students
    const pendingStudents = allStudents.filter((s) => {
      const existing = cardMap.get(s.studentId);
      if (!existing || options.forceRegenerate) return true;
      const expectedHash = computeStudentDataHash(s, ADMIT_CARD_TEMPLATE_VERSION);
      return existing.sourceDataHash !== expectedHash || existing.status !== 'READY';
    });

    const chunkSize = options.batchSize || 25;
    const chunk = pendingStudents.slice(0, chunkSize);

    let newSucceeded = 0;
    let newFailed = 0;
    const errors: Array<{ studentId: string; registrationNumber: string; error: string }> = [];

    const concurrency = 5;
    for (let i = 0; i < chunk.length; i += concurrency) {
      const subChunk = chunk.slice(i, i + concurrency);
      await Promise.all(
        subChunk.map(async (student) => {
          try {
            const hash = computeStudentDataHash(student, ADMIT_CARD_TEMPLATE_VERSION);
            const pdfBytes = await generateAdmitCardPdf(student, settings);

            const fileName = `AdmitCard_${student.registrationNumber}_${student.name.replace(/\s+/g, '_')}.pdf`;
            const { fileId, storageType } = await storage.saveFile(fileName, pdfBytes, 'application/pdf');

            const now = new Date().toISOString();
            await db.saveAdmitCard({
              studentId: student.studentId,
              registrationNumber: student.registrationNumber,
              fileId,
              storageType,
              templateVersion: ADMIT_CARD_TEMPLATE_VERSION,
              sourceDataHash: hash,
              status: 'READY',
              generatedAt: now,
              updatedAt: now,
            });

            newSucceeded++;
          } catch (err: any) {
            newFailed++;
            errors.push({
              studentId: student.studentId,
              registrationNumber: student.registrationNumber,
              error: err.message || 'Unknown PDF generation error',
            });
          }
        })
      );
    }

    const processedSoFar = job.processed + chunk.length;
    const isFinished = processedSoFar >= job.total || chunk.length === 0;

    const updatedJob = await db.updateAdmitCardJob(jobId, {
      processed: Math.min(job.total, processedSoFar),
      succeeded: job.succeeded + newSucceeded,
      failed: job.failed + newFailed,
      status: isFinished ? 'READY' : 'PROCESSING',
      lastProgressAt: new Date().toISOString(),
      errors: [...job.errors, ...errors],
    });

    return updatedJob;
  }
}
