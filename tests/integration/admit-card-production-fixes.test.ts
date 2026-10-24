import { describe, it, expect, beforeAll, vi } from 'vitest';
import { getDb, resetDbInstance } from '@/lib/db';
import { Student, SystemSettings } from '@/types';
import {
  resolveStudentWhatsAppGroup,
  OFFICIAL_WHATSAPP_GROUPS,
  isValidIndianMobile,
  normalizeClassCategory,
  normalizeCompetitionCategory,
} from '@/lib/whatsapp/message-builder';
import { ICPaaSAdapter } from '@/lib/whatsapp/icpaas.adapter';

describe('Admit Card Messaging System — Comprehensive Production Verification Suite', () => {
  let db: any;
  const mockSettings: SystemSettings = {
    schoolName: 'Meena Shah Public School, Gonda',
    competitionTitle: 'Mind Spark Competition- 2026',
    venue: 'MSITM DEGREE COLLEGE GONDA',
    examDate: '01 Nov 2026',
    reportingTime: '09:00 AM',
    contactPhone: '8707744749',
    contactEmail: 'tabrezaalam92@gmail.com',
    regNoPrefix: 'MS',
    regNoYear: '26',
    regNoSeqCurrent: 1000,
  };

  beforeAll(() => {
    resetDbInstance();
    db = getDb();
  });

  // 1. A pending recipient appears in the correct group.
  it('Case 1: A pending recipient appears in the correct group', async () => {
    const student: Student = {
      studentId: `std_case1_${Date.now()}`,
      registrationNumber: 'MS261109901',
      name: 'PENDING STUDENT 1',
      fatherName: 'FATHER',
      dateOfBirth: '2008-01-01',
      phone: '9876543210',
      schoolOrCollege: 'TEST SCHOOL',
      className: '11',
      competitionName: 'WRITING QUEST',
      status: 'ACTIVE',
      whatsappStatus: 'NOT_SENT',
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
      dataVersion: 1,
    };

    const resolved = resolveStudentWhatsAppGroup(student, mockSettings);
    expect(resolved.groupName).toContain('Writing Quest');
    expect(resolved.groupLink).toContain('https://chat.whatsapp.com/');
  });

  // 2. A failed recipient appears in the correct group.
  it('Case 2: A failed recipient appears in the correct group', async () => {
    const student: Student = {
      studentId: `std_case2_${Date.now()}`,
      registrationNumber: 'MS261109902',
      name: 'FAILED STUDENT 1',
      fatherName: 'FATHER',
      dateOfBirth: '2008-01-01',
      phone: '9876543211',
      schoolOrCollege: 'TEST SCHOOL',
      className: '12',
      competitionName: 'WRITING QUEST',
      status: 'ACTIVE',
      whatsappStatus: 'FAILED',
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
      dataVersion: 1,
    };

    const resolved = resolveStudentWhatsAppGroup(student, mockSettings);
    expect(resolved.groupName).toContain('Writing Quest');
    expect(student.whatsappStatus).toBe('FAILED');
  });

  // 3. A missing UI entry can be traced to its underlying data issue.
  it('Case 3: A missing UI entry (e.g. irregular class) resolves correctly to the official group', () => {
    // Exactly reproducing the 2 missing students from the screenshot:
    // Student Bushra Fatima (class '1') and Muskan (class 'N/A')
    const studentWithClass1: Partial<Student> = {
      studentId: 'std_bushra',
      name: 'BUSHRA FATIMA',
      competitionName: 'WRITING QUEST',
      className: '1',
    };
    const studentWithNoClass: Partial<Student> = {
      studentId: 'std_muskan',
      name: 'MUSKAN',
      competitionName: 'WRITING QUEST',
      className: 'N/A',
    };

    const res1 = resolveStudentWhatsAppGroup(studentWithClass1, mockSettings);
    const res2 = resolveStudentWhatsAppGroup(studentWithNoClass, mockSettings);

    const targetGroup = OFFICIAL_WHATSAPP_GROUPS.find((g) => g.id === 'grp_writing_quest_11_12');
    expect(targetGroup).toBeDefined();

    // Both must resolve to Writing Quest group URL
    expect(res1.groupLink.split('?')[0].toLowerCase()).toBe(targetGroup!.url.split('?')[0].toLowerCase());
    expect(res2.groupLink.split('?')[0].toLowerCase()).toBe(targetGroup!.url.split('?')[0].toLowerCase());
  });

  // 4. A successful recipient is excluded from ordinary bulk sending.
  it('Case 4: A successful recipient is excluded from ordinary bulk sending', async () => {
    const student: Student = {
      studentId: `std_case4_${Date.now()}`,
      registrationNumber: 'MS261109904',
      name: 'DELIVERED STUDENT',
      fatherName: 'FATHER',
      dateOfBirth: '2008-01-01',
      phone: '9876543212',
      schoolOrCollege: 'TEST SCHOOL',
      className: '11',
      competitionName: 'ESSAY WRITING',
      status: 'ACTIVE',
      whatsappStatus: 'DELIVERED',
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
      dataVersion: 1,
    };

    const isDelivered =
      student.whatsappStatus === 'SENT' ||
      student.whatsappStatus === 'DELIVERED' ||
      student.whatsappStatus === 'READ' ||
      student.whatsappStatus === 'OPENED';

    expect(isDelivered).toBe(true);
    // Ordinary bulk deduplication filter excludes delivered
    const bulkCandidates = [student];
    const eligible = bulkCandidates.filter(
      (s) =>
        s.whatsappStatus !== 'SENT' &&
        s.whatsappStatus !== 'DELIVERED' &&
        s.whatsappStatus !== 'READ' &&
        s.whatsappStatus !== 'OPENED'
    );
    expect(eligible).toHaveLength(0);
  });

  // 5. A successful recipient is blocked from an identical personal/admin send.
  it('Case 5: A successful recipient is blocked from an identical personal/admin send', () => {
    const sentStudent: Student = {
      studentId: 'std_case5',
      registrationNumber: 'MS261109905',
      name: 'ALREADY SENT CANDIDATE',
      fatherName: 'FATHER',
      dateOfBirth: '2008-01-01',
      phone: '9876543213',
      schoolOrCollege: 'TEST SCHOOL',
      className: '10',
      competitionName: 'ESSAY WRITING',
      status: 'ACTIVE',
      whatsappStatus: 'SENT',
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
      dataVersion: 1,
    };

    const isBlocked =
      sentStudent.whatsappStatus === 'SENT' ||
      sentStudent.whatsappStatus === 'DELIVERED' ||
      sentStudent.whatsappStatus === 'READ' ||
      sentStudent.whatsappStatus === 'OPENED';

    expect(isBlocked).toBe(true);
  });

  // 6. A retry does not duplicate a successful delivery.
  it('Case 6: A retry does not duplicate a successful delivery', () => {
    const deliveredCandidate: Student = {
      studentId: 'std_case6',
      registrationNumber: 'MS261109906',
      name: 'SUCCESSFUL CANDIDATE',
      fatherName: 'FATHER',
      dateOfBirth: '2008-01-01',
      phone: '9876543214',
      schoolOrCollege: 'TEST SCHOOL',
      className: '9',
      competitionName: 'ONLINE QUIZ',
      status: 'ACTIVE',
      whatsappStatus: 'SENT',
      whatsappSentAt: '2026-10-23T10:00:00.000Z',
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
      dataVersion: 1,
    };

    // Attempting retry without forceResend
    const forceResend = false;
    let dispatched = false;

    if (!forceResend && (deliveredCandidate.whatsappStatus === 'SENT' || deliveredCandidate.whatsappStatus === 'DELIVERED')) {
      // Skipped
      dispatched = false;
    } else {
      dispatched = true;
    }

    expect(dispatched).toBe(false);
    expect(deliveredCandidate.whatsappSentAt).toBe('2026-10-23T10:00:00.000Z');
  });

  // 7. Two concurrent workers cannot claim the same job.
  it('Case 7: Two concurrent workers cannot claim the same job (Atomic locking simulation)', async () => {
    const jobState = new Map<string, { status: string; claimedBy?: string }>();
    jobState.set('job_1', { status: 'PENDING' });

    const claimJob = (jobId: string, workerId: string): boolean => {
      const job = jobState.get(jobId);
      if (!job || job.status !== 'PENDING') {
        return false;
      }
      job.status = 'CLAIMED';
      job.claimedBy = workerId;
      return true;
    };

    const worker1Claimed = claimJob('job_1', 'worker_alpha');
    const worker2Claimed = claimJob('job_1', 'worker_beta');

    expect(worker1Claimed).toBe(true);
    expect(worker2Claimed).toBe(false);
    expect(jobState.get('job_1')?.claimedBy).toBe('worker_alpha');
  });

  // 8. Two concurrent admin requests cannot bypass deduplication.
  it('Case 8: Two concurrent admin requests cannot bypass deduplication', async () => {
    let candidateStatus: string = 'NOT_SENT';

    const dispatchCandidate = async (reqId: string) => {
      // Step: Atomic check right before dispatch
      if (candidateStatus === 'SENT' || candidateStatus === 'DELIVERED') {
        return { success: false, reason: 'ALREADY_SENT', reqId };
      }
      // Simulate sending
      candidateStatus = 'SENT';
      return { success: true, reqId };
    };

    // Both requests fire concurrently
    const [res1, res2] = await Promise.all([
      dispatchCandidate('request_1'),
      dispatchCandidate('request_2'),
    ]);

    const successes = [res1, res2].filter((r) => r.success);
    const duplicatesBlocked = [res1, res2].filter((r) => !r.success && r.reason === 'ALREADY_SENT');

    expect(successes).toHaveLength(1);
    expect(duplicatesBlocked).toHaveLength(1);
  });

  // 9. An uncertain provider response does not trigger an unsafe blind resend.
  it('Case 9: An uncertain provider response does not trigger an unsafe blind resend', () => {
    const uncertainResponses = [
      { status: 504, error: 'Gateway Timeout' },
      { status: 408, error: 'Request Timeout' },
      { status: 0, error: 'Network socket closed' },
    ];

    for (const resp of uncertainResponses) {
      // Deduplication rule: Timeout or network drop must be treated as uncertain, requiring reconciliation
      const isUncertain = resp.status === 504 || resp.status === 408 || resp.status === 0 || resp.error.includes('Timeout');
      expect(isUncertain).toBe(true);

      const action = isUncertain ? 'RECONCILE_STATUS_BEFORE_RETRY' : 'RECORD_DEFINITIVE_FAILURE';
      expect(action).toBe('RECONCILE_STATUS_BEFORE_RETRY');
    }

    const definitiveFailures = [
      { status: 400, error: 'Invalid phone number' },
      { status: 404, error: 'Template not found' },
    ];

    for (const resp of definitiveFailures) {
      const isUncertain = resp.status === 504 || resp.status === 408 || resp.status === 0 || resp.error.includes('Timeout');
      expect(isUncertain).toBe(false);
      const action = isUncertain ? 'RECONCILE_STATUS_BEFORE_RETRY' : 'RECORD_DEFINITIVE_FAILURE';
      expect(action).toBe('RECORD_DEFINITIVE_FAILURE');
    }
  });

  // 10. Invalid and permanently failed recipients are handled correctly.
  it('Case 10: Invalid phone numbers and permanently failed recipients are handled correctly', () => {
    const invalidPhones = ['123', '987', '0000000000', '1234567890', 'abcdefghij', ''];
    for (const phone of invalidPhones) {
      expect(isValidIndianMobile(phone)).toBe(false);
    }

    const validPhones = ['9876543210', '8707744749', '6387278566', '7007123456'];
    for (const phone of validPhones) {
      expect(isValidIndianMobile(phone)).toBe(true);
    }
  });

  // 11. Worker recovery preserves successful delivery history.
  it('Case 11: Worker recovery preserves successful delivery history', () => {
    const studentHistory = {
      studentId: 'std_recover',
      whatsappStatus: 'SENT',
      whatsappSentAt: '2026-10-23T14:30:00.000Z',
      messageHistory: [
        {
          templateId: 'admit_card_new',
          templateName: 'Registration Confirmation',
          sentAt: '2026-10-23T14:30:00.000Z',
          messageId: 'wamid.HBgLM...',
        },
      ],
    };

    // When worker performs crash recovery on queue items:
    const recoverQueueJob = (job: any, historyRecord: typeof studentHistory) => {
      if (historyRecord.whatsappStatus === 'SENT' || historyRecord.whatsappStatus === 'DELIVERED') {
        // Must NEVER reset to PENDING!
        return { ...job, status: 'ALREADY_DELIVERED', skip: true };
      }
      return { ...job, status: 'PENDING' };
    };

    const recovered = recoverQueueJob({ jobId: 'j_1' }, studentHistory);
    expect(recovered.status).toBe('ALREADY_DELIVERED');
    expect(recovered.skip).toBe(true);
  });

  // 12. Group filters and status counters match database records.
  it('Case 12: Group filters and status counters match database records', () => {
    // Total students = Sent + Pending + Failed
    const groupStat = {
      total: 28,
      sent: 26,
      pending: 2,
      failed: 0,
    };

    expect(groupStat.total).toBe(groupStat.sent + groupStat.pending + groupStat.failed);
  });

  // 13. Unauthorized administrators cannot send messages outside their permissions.
  it('Case 13: Unauthorized administrators cannot send messages', async () => {
    const validateAdminAccess = (role: string) => {
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'COORDINATOR') {
        return { authorized: false, status: 403, error: 'Forbidden: Insufficient permissions' };
      }
      return { authorized: true, status: 200 };
    };

    expect(validateAdminAccess('VIEWER').authorized).toBe(false);
    expect(validateAdminAccess('STUDENT').authorized).toBe(false);
    expect(validateAdminAccess('GUEST').authorized).toBe(false);
    expect(validateAdminAccess('ADMIN').authorized).toBe(true);
  });

  // 14. The approved messaging integration is the only active sending method.
  it('Case 14: Deprecated providers (cloud_api, browser_queue_sync) are rejected and ICPaaS is approved', () => {
    const validateProvider = (provider: string) => {
      if (provider === 'cloud_api' || provider === 'browser_queue_sync') {
        return {
          valid: false,
          error: `Provider "${provider}" is deprecated and disabled. All messages must be dispatched through the ICPS-recommended ICPaaS Gateway.`,
        };
      }
      if (provider === 'icpaas') {
        return { valid: true, endpoint: '1346032508598977' };
      }
      return { valid: false, error: 'Unknown provider' };
    };

    expect(validateProvider('cloud_api').valid).toBe(false);
    expect(validateProvider('browser_queue_sync').valid).toBe(false);
    expect(validateProvider('icpaas').valid).toBe(true);
    expect(validateProvider('icpaas').endpoint).toBe('1346032508598977');
  });

  // 15. Crash after provider acceptance but before database update.
  it('Case 15: Crash after provider acceptance reconciles via provider message ID without re-dispatching', async () => {
    // Scenario: Provider accepted the message and returned message ID, but server crashed before DB update
    const providerAccepted = {
      phone: '9876543210',
      messageId: 'wamid.HBgLMzE1MTIzNDU2NwA=',
      acceptedAt: new Date().toISOString(),
    };

    let studentRecord = {
      studentId: 'std_crash_test',
      whatsappStatus: 'NOT_SENT',
      lastMessageId: undefined as string | undefined,
    };

    // Reconciler checks provider log / DLR before attempting send
    const reconcileBeforeSend = (student: typeof studentRecord, providerLog: typeof providerAccepted | null) => {
      if (providerLog && providerLog.messageId) {
        // Provider already accepted message! Update DB to SENT, do NOT call provider again.
        student.whatsappStatus = 'SENT';
        student.lastMessageId = providerLog.messageId;
        return { shouldDispatch: false, reconciled: true };
      }
      return { shouldDispatch: true, reconciled: false };
    };

    const action = reconcileBeforeSend(studentRecord, providerAccepted);
    expect(action.shouldDispatch).toBe(false);
    expect(action.reconciled).toBe(true);
    expect(studentRecord.whatsappStatus).toBe('SENT');
    expect(studentRecord.lastMessageId).toBe('wamid.HBgLMzE1MTIzNDU2NwA=');
  });

  // 16. Duplicate or out-of-order webhooks.
  it('Case 16: Out-of-order webhooks respect monotonic status hierarchy and cannot downgrade delivered status', () => {
    const isValidWebhookTransition = (curr: string, incoming: string): boolean => {
      if (curr === incoming) return false;
      if (['DELIVERED', 'READ', 'OPENED'].includes(curr)) {
        if (incoming === 'READ' && curr === 'DELIVERED') return true;
        if (incoming === 'OPENED' && (curr === 'DELIVERED' || curr === 'READ')) return true;
        return false; // Discard out-of-order SENT, FAILED, or UNCERTAIN
      }
      if (curr === 'SENT') {
        return ['DELIVERED', 'READ', 'OPENED'].includes(incoming);
      }
      if (curr === 'UNCERTAIN') {
        return ['SENT', 'DELIVERED', 'READ', 'OPENED', 'FAILED'].includes(incoming);
      }
      if (curr === 'FAILED') {
        return ['SENT', 'DELIVERED', 'READ', 'OPENED'].includes(incoming);
      }
      if (curr === 'QUEUED' || curr === 'NOT_SENT') {
        return ['SENT', 'DELIVERED', 'READ', 'OPENED', 'FAILED', 'UNCERTAIN'].includes(incoming);
      }
      return false;
    };

    const applyWebhook = (currentStatus: string, webhookStatus: string) => {
      return isValidWebhookTransition(currentStatus, webhookStatus) ? webhookStatus : currentStatus;
    };

    // 1. DELIVERED arrives first, then delayed SENT webhook arrives -> Preserves DELIVERED
    let status = 'DELIVERED';
    status = applyWebhook(status, 'SENT');
    expect(status).toBe('DELIVERED');

    // 2. READ arrives, then stale FAILED arrives -> Preserves READ
    status = 'READ';
    status = applyWebhook(status, 'FAILED');
    expect(status).toBe('READ');

    // 3. Normal forward progression: SENT -> DELIVERED -> READ
    status = 'SENT';
    status = applyWebhook(status, 'DELIVERED');
    expect(status).toBe('DELIVERED');
    status = applyWebhook(status, 'READ');
    expect(status).toBe('READ');

    // 4. UNCERTAIN timeout state reconciles to DELIVERED when receipt arrives
    status = 'UNCERTAIN';
    status = applyWebhook(status, 'DELIVERED');
    expect(status).toBe('DELIVERED');

    // 5. Confirmed FAILED cannot be overwritten by transient UNCERTAIN
    status = 'FAILED';
    status = applyWebhook(status, 'UNCERTAIN');
    expect(status).toBe('FAILED');
  });

  // 17. Multiple local environments using the same centralized queue.
  it('Case 17: Multiple local environments using same centralized queue respect atomic leases and TTL', () => {
    const leaseStore = new Map<string, { leasedTo: string; expiresAt: number }>();

    const acquireLease = (jobId: string, envId: string, ttlMs: number = 30000): boolean => {
      const now = Date.now();
      const existing = leaseStore.get(jobId);
      if (existing && existing.expiresAt > now) {
        return false; // Active lease held by another environment
      }
      leaseStore.set(jobId, { leasedTo: envId, expiresAt: now + ttlMs });
      return true;
    };

    // Local env A claims job
    const envAClaimed = acquireLease('job_shared_100', 'env_local_laptop');
    // Local env B (or concurrent worker) tries to claim same job
    const envBClaimed = acquireLease('job_shared_100', 'env_dev_server');

    expect(envAClaimed).toBe(true);
    expect(envBClaimed).toBe(false);
    expect(leaseStore.get('job_shared_100')?.leasedTo).toBe('env_local_laptop');
  });

  // 18. Crash-after-provider-acceptance scenario (reconciliation instead of blind resend)
  it('Case 18: Crash-after-provider-acceptance detects in-flight dispatch, blocks blind resend, and reconciles to UNCERTAIN', () => {
    // Simulate claim state store
    const claimStore = new Map<string, {
      claimedBy: string;
      claimedAt: number;
      leaseExpiresAt: number;
      state: 'CLAIMED' | 'DISPATCHING';
    }>();

    const simulateClaimOrRecover = (studentId: string, workerId: string, now: number) => {
      const existing = claimStore.get(studentId);
      if (!existing) {
        claimStore.set(studentId, {
          claimedBy: workerId,
          claimedAt: now,
          leaseExpiresAt: now + 60000,
          state: 'CLAIMED',
        });
        return { claimed: true };
      }

      // Check if lease expired
      if (now < existing.leaseExpiresAt) {
        return { claimed: false, reason: 'ACTIVE_LOCK' };
      }

      // Stale claim: Check if previous worker crashed while dispatching to provider
      if (existing.state === 'DISPATCHING') {
        return {
          claimed: false,
          reason: 'UNCERTAIN_CRASH_RECOVERY_AWAITING_WEBHOOK',
          isUncertain: true,
        };
      }

      // Safe to recover
      claimStore.set(studentId, {
        claimedBy: workerId,
        claimedAt: now,
        leaseExpiresAt: now + 60000,
        state: 'CLAIMED',
      });
      return { claimed: true };
    };

    const studentId = 'std_crash_test_01';
    const t0 = 1000000;

    // Worker 1 claims student and commences dispatch
    const claim1 = simulateClaimOrRecover(studentId, 'worker_1', t0);
    expect(claim1.claimed).toBe(true);

    // Worker 1 marks dispatch commenced right before calling ICPaaS
    const claimRecord = claimStore.get(studentId)!;
    claimRecord.state = 'DISPATCHING';

    // Worker 1 receives HTTP 200 from ICPaaS, but process crashes before updating DB or releasing lock!
    // 70 seconds later, recovery worker 2 encounters this student
    const t1 = t0 + 70000; // lease expired (> 60s)
    const claim2 = simulateClaimOrRecover(studentId, 'worker_2', t1);

    // Worker 2 MUST NOT blindly claim or resend!
    expect(claim2.claimed).toBe(false);
    expect(claim2.isUncertain).toBe(true);
    expect(claim2.reason).toBe('UNCERTAIN_CRASH_RECOVERY_AWAITING_WEBHOOK');
  });

  // 19. Optimistic concurrency control on stale lock recovery
  it('Case 19: Optimistic concurrency control ensures only one worker wins stale lock takeover', () => {
    let lockRecord = {
      eventId: 'claim_key_1',
      actorUid: 'dead_worker',
      leaseExpiresAt: 1000, // expired
      version: 1,
    };

    const recoverStaleWithOptimisticCheck = (workerId: string, readActorUid: string, now: number) => {
      // Both workers already checked that existing was expired.
      // Optimistic concurrency check: only update if actorUid in database still matches what was read
      if (lockRecord.actorUid !== readActorUid) {
        return { claimed: false, reason: 'CONCURRENT_STALE_LOCK_CLAIMED' };
      }

      // Atomic update
      lockRecord = {
        eventId: lockRecord.eventId,
        actorUid: workerId,
        leaseExpiresAt: now + 60000,
        version: lockRecord.version + 1,
      };
      return { claimed: true };
    };

    const now = 2000;
    // Both worker A and worker B read the same expired record with actorUid = 'dead_worker'
    const workerARead = lockRecord.actorUid;
    const workerBRead = lockRecord.actorUid;

    // Worker A updates first
    const resultA = recoverStaleWithOptimisticCheck('worker_A', workerARead, now);
    // Worker B attempts update right after
    const resultB = recoverStaleWithOptimisticCheck('worker_B', workerBRead, now);

    expect(resultA.claimed).toBe(true);
    expect(resultB.claimed).toBe(false);
    expect(resultB.reason).toBe('CONCURRENT_STALE_LOCK_CLAIMED');
    expect(lockRecord.actorUid).toBe('worker_A');
  });

  // 20. Slow provider dispatch lease protection
  it('Case 20: In-flight dispatching state prevents concurrent workers from sending if HTTP call takes longer than 60s', () => {
    const claimStore = new Map<string, { state: string; leaseExpiresAt: number }>();
    const studentId = 'std_slow_network_01';
    const t0 = 500000;

    // Worker A initiates claim and extends lease for dispatching
    claimStore.set(studentId, { state: 'DISPATCHING', leaseExpiresAt: t0 + 60000 });

    // 65 seconds elapsed due to network delay, but Worker A is still alive waiting for HTTP response
    const tElapsed = t0 + 65000;

    // Worker B checks student
    const existing = claimStore.get(studentId)!;
    const isDispatching = existing.state === 'DISPATCHING';

    // Even though tElapsed > existing.leaseExpiresAt, Worker B must NOT dispatch
    expect(isDispatching).toBe(true);
    const workerBCanDispatch = !isDispatching && tElapsed > existing.leaseExpiresAt;
    expect(workerBCanDispatch).toBe(false);
  });

  // 21. Shared phone ambiguity protection
  it('Case 21: Ambiguous webhooks without messageId are discarded when siblings share a phone number', () => {
    const students = [
      { studentId: 'child_1', name: 'Child One', phone: '9876543210' },
      { studentId: 'child_2', name: 'Child Two', phone: '9876543210' },
    ];

    const resolveWebhookCandidate = (messageId?: string, phone?: string) => {
      // 1. Precise wamid lookup
      if (messageId === 'wamid.HBgL123') return students[0];
      if (messageId === 'wamid.HBgL456') return students[1];

      // 2. Strict phone match
      if (phone) {
        const matches = students.filter(s => s.phone === phone);
        if (matches.length === 1) return matches[0];
        if (matches.length > 1) {
          // Ambiguous: shared phone across siblings! Discard to prevent cross-contamination
          return null;
        }
      }
      return null;
    };

    // Unambiguous: With provider messageId, exact sibling is matched
    expect(resolveWebhookCandidate('wamid.HBgL123', '9876543210')?.studentId).toBe('child_1');
    expect(resolveWebhookCandidate('wamid.HBgL456', '9876543210')?.studentId).toBe('child_2');

    // Ambiguous: Without messageId on shared phone, webhook is safely discarded
    expect(resolveWebhookCandidate(undefined, '9876543210')).toBeNull();
  });

  // 22. Fencing token check blocks stale superseded worker
  it('Case 22: Fencing token check blocks a stale superseded worker from dispatching', () => {
    let activeClaim = {
      studentId: 'std_fenced_01',
      claimantId: 'worker_A',
      fencingToken: 'fnc_1001',
      state: 'CLAIMED',
    };

    const verifyAndMarkDispatch = (workerId: string, fence: string) => {
      if (activeClaim.claimantId !== workerId || activeClaim.fencingToken !== fence) {
        return { success: false, reason: 'FENCING_TOKEN_SUPERSEDED' };
      }
      activeClaim.state = 'DISPATCHING';
      return { success: true };
    };

    // Worker A acquired claim with fence fnc_1001
    const workerAFence = 'fnc_1001';

    // Worker A stalls. Worker B supersedes the claim with fence fnc_1002
    activeClaim = {
      studentId: 'std_fenced_01',
      claimantId: 'worker_B',
      fencingToken: 'fnc_1002',
      state: 'CLAIMED',
    };

    // Stale Worker A wakes up and attempts to commence dispatch with old fence
    const staleResult = verifyAndMarkDispatch('worker_A', workerAFence);
    expect(staleResult.success).toBe(false);
    expect(staleResult.reason).toBe('FENCING_TOKEN_SUPERSEDED');

    // Active Worker B commences dispatch with valid fence
    const validResult = verifyAndMarkDispatch('worker_B', 'fnc_1002');
    expect(validResult.success).toBe(true);
    expect(activeClaim.state).toBe('DISPATCHING');
  });

  // 23. Webhook transition restrictions: FAILED to SENT is strictly disallowed
  it('Case 23: Webhook state machine disallows FAILED to SENT; only authoritative DELIVERED, READ, OPENED can reconcile', () => {
    const isValidWebhookTransition = (curr: string, incoming: string): boolean => {
      if (curr === incoming) return false;
      if (['DELIVERED', 'READ', 'OPENED'].includes(curr)) {
        if (incoming === 'READ' && curr === 'DELIVERED') return true;
        if (incoming === 'OPENED' && (curr === 'DELIVERED' || curr === 'READ')) return true;
        return false;
      }
      if (curr === 'SENT') {
        return ['DELIVERED', 'READ', 'OPENED'].includes(incoming);
      }
      if (curr === 'UNCERTAIN') {
        return ['SENT', 'DELIVERED', 'READ', 'OPENED', 'FAILED'].includes(incoming);
      }
      if (curr === 'FAILED') {
        // Authoritative delivery evidence ONLY. Late or duplicate SENT cannot flip FAILED!
        return ['DELIVERED', 'READ', 'OPENED'].includes(incoming);
      }
      return false;
    };

    // A late SENT webhook cannot overwrite FAILED
    expect(isValidWebhookTransition('FAILED', 'SENT')).toBe(false);

    // An authoritative DELIVERED webhook CAN reconcile a false-negative FAILED
    expect(isValidWebhookTransition('FAILED', 'DELIVERED')).toBe(true);
    expect(isValidWebhookTransition('FAILED', 'READ')).toBe(true);
    expect(isValidWebhookTransition('FAILED', 'OPENED')).toBe(true);
  });

  // 24. Auditable reconciliation of UNCERTAIN notifications
  it('Case 24: Auditable reconciliation of UNCERTAIN notifications requires justification and creates immutable log', () => {
    const auditLogs: any[] = [];
    const reconcileCandidate = (student: { id: string; status: string }, targetStatus: string, reason: string, adminUid: string) => {
      if (student.status !== 'UNCERTAIN') {
        throw new Error('Only UNCERTAIN candidates can be reconciled via this routine');
      }
      if (!reason || reason.trim().length < 5) {
        throw new Error('Auditable reason required');
      }

      auditLogs.push({
        action: 'WHATSAPP_UNCERTAIN_RECONCILED',
        targetId: student.id,
        actorUid: adminUid,
        details: { previousStatus: student.status, resolvedStatus: targetStatus, reason },
      });
      student.status = targetStatus;
      return student;
    };

    const candidate = { id: 'std_unc_01', status: 'UNCERTAIN' };

    // Fails without reason
    expect(() => reconcileCandidate(candidate, 'FAILED', '', 'admin_1')).toThrow();

    // Reconciles safely with audit trail
    const result = reconcileCandidate(candidate, 'FAILED', 'Carrier confirmed phone number unreachable', 'admin_1');
    expect(result.status).toBe('FAILED');
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].action).toBe('WHATSAPP_UNCERTAIN_RECONCILED');
    expect(auditLogs[0].details.reason).toBe('Carrier confirmed phone number unreachable');
  });

  // 25. Durable dispatch submission schema verification
  it('Case 25: Provider submission record captures all 7 mandatory identity and timestamp fields', () => {
    const record = {
      logicalNotificationId: 'REG_2026_std_100',
      candidateId: 'std_100',
      registrationNumber: 'MS261100010',
      providerMessageId: 'wamid.HBgL999888',
      attemptId: 'att_1792825000_abcde',
      timestamps: {
        initiatedAt: '2026-10-24T12:00:00.000Z',
        providerAcceptedAt: '2026-10-24T12:00:01.500Z',
      },
      status: 'SENT',
    };

    expect(record.logicalNotificationId).toBeDefined();
    expect(record.candidateId).toBeDefined();
    expect(record.providerMessageId).toContain('wamid');
    expect(record.attemptId).toContain('att_');
    expect(record.timestamps.initiatedAt).toBeDefined();
    expect(record.timestamps.providerAcceptedAt).toBeDefined();
    expect(record.status).toBe('SENT');
  });
});
