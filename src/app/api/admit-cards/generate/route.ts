import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { assertPermission } from '@/lib/auth/permissions';
import { AdmitCardBatchRunner } from '@/lib/pdf/batch-runner';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, 'admitCards.generate');

    const body = await req.json().catch(() => ({}));
    const { jobId, batchSize = 25, competition, forceRegenerate = false } = body;

    let targetJobId = jobId;
    if (!targetJobId) {
      const newJob = await AdmitCardBatchRunner.startOrGetJob(user!.uid, {
        competition,
        forceRegenerate,
      });
      targetJobId = newJob.jobId;
    }

    const updatedJob = await AdmitCardBatchRunner.processBatchChunk(targetJobId, {
      batchSize,
      competition,
      forceRegenerate,
    });

    return NextResponse.json({
      jobId: updatedJob.jobId,
      status: updatedJob.status,
      total: updatedJob.total,
      processed: updatedJob.processed,
      succeeded: updatedJob.succeeded,
      failed: updatedJob.failed,
      errors: updatedJob.errors,
      isFinished: updatedJob.status === 'READY' || updatedJob.status === 'FAILED',
    });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
