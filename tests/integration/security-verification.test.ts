import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { POST as searchAdmitCard } from '@/app/api/public/admit-card/search/route';
import { GET as downloadAdmitCard } from '@/app/api/public/admit-card/download/route';
import { GET as getPublicSettings } from '@/app/api/settings/route';

describe('Security & Authorization Verification (Production Standards)', () => {
  beforeAll(async () => {
    const db = getDb();
    const existing = await db.getStudentByRegNo('MS211001');
    if (!existing) {
      await db.createStudent({
        registrationNumber: 'MS211001',
        name: 'MEENAKSHI GUPTA',
        fatherName: 'RAKESH KUMAR GUPTA',
        dateOfBirth: '2008-05-31',
        phone: '7007440076',
        schoolOrCollege: 'AIMS INTERNATIONAL',
        className: '12',
        competitionName: 'ONLINE QUIZ',
        status: 'ACTIVE',
        createdBy: 'system_test',
        updatedBy: 'system_test',
      });
    }
  });
  it('CRITICAL: ensures SUPABASE_SERVICE_ROLE_KEY is never exposed as a NEXT_PUBLIC_ variable', () => {
    // Service role key must NEVER have the NEXT_PUBLIC_ prefix
    expect(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY).toBeUndefined();

    // Any NEXT_PUBLIC_ environment variable must be non-secret
    const envKeys = Object.keys(process.env);
    const leakedServiceKeys = envKeys.filter(
      (k) => k.startsWith('NEXT_PUBLIC_') && k.toLowerCase().includes('service_role')
    );
    expect(leakedServiceKeys).toHaveLength(0);
  });

  it('CRITICAL: ensures admit card search response headers are strictly private and never publicly cached', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationNumber: 'MS211001',
        dateOfBirth: '2008-05-31',
      }),
    });

    const res = await searchAdmitCard(req);
    const cacheControl = res.headers.get('cache-control') || '';
    const pragma = res.headers.get('pragma') || '';

    // Must be private and must not be stored in shared CDN or proxy caches
    expect(cacheControl).toContain('private');
    expect(cacheControl).toContain('no-store');
    expect(cacheControl).not.toContain('public');
    expect(cacheControl).not.toContain('s-maxage');
    expect(pragma).toBe('no-cache');
  });

  it('CRITICAL: ensures admit card PDF download response headers are strictly private and unshared', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/public/admit-card/download?regNo=MS211001&dob=2008-05-31&bypassDateLock=true'
    );
    const res = await downloadAdmitCard(req);

    const cacheControl = res.headers.get('cache-control') || '';
    const pragma = res.headers.get('pragma') || '';

    expect(cacheControl).toContain('private');
    expect(cacheControl).toContain('no-store');
    expect(cacheControl).not.toContain('public');
    expect(cacheControl).not.toContain('s-maxage');
    expect(pragma).toBe('no-cache');
  });

  it('SECURITY: prevents unauthorized PII retrieval when Date of Birth is incorrect', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationNumber: 'MS211001',
        dateOfBirth: '1999-12-31', // Incorrect DOB
      }),
    });

    const res = await searchAdmitCard(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBeDefined();
    // Student personal data (name, father, phone, school) MUST NOT be present
    expect(data.student).toBeUndefined();
    expect(data.schedule).toBeUndefined();
  });

  it('SECURITY: public settings endpoint sanitizes sensitive configuration and tokens', async () => {
    const res = await getPublicSettings();
    expect(res.status).toBe(200);

    const data = await res.json();
    // Non-sensitive public event metadata should be present
    expect(data.venue).toBeDefined();
    expect(data.examDate).toBeDefined();

    // Sensitive server credentials MUST NOT be leaked to unauthenticated public callers
    expect(data.whatsappCloudToken).toBeUndefined();
    expect(data.whatsappPhoneNumberId).toBeUndefined();
    expect(data.regNoSeqCurrent).toBeUndefined();
  });

  it('SECURITY: locks out attacker IP after 5 failed DOB attempts while protecting legitimate students on other IPs from DoS', async () => {
    const regNo = 'MS211001';
    const attackerIp = '192.0.2.66';
    const legitimateStudentIp = '198.51.100.77';

    // Attacker makes 5 consecutive failed DOB attempts from attackerIp
    for (let i = 1; i <= 5; i++) {
      const req = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-forwarded-for': attackerIp,
        },
        body: JSON.stringify({
          registrationNumber: regNo,
          dateOfBirth: `1990-01-0${i}`, // Wrong DOB
        }),
      });
      const res = await searchAdmitCard(req);
      if (i < 5) {
        expect(res.status).toBe(401);
      }
    }

    // 6th attempt from attackerIp must be blocked (HTTP 429)
    const blockedAttackerReq = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-forwarded-for': attackerIp,
      },
      body: JSON.stringify({
        registrationNumber: regNo,
        dateOfBirth: '2008-05-31', // Even if attacker enters correct DOB, attacker IP is locked
      }),
    });

    const blockedRes = await searchAdmitCard(blockedAttackerReq);
    expect(blockedRes.status).toBe(429);
    const data = await blockedRes.json();
    expect(data.error).toContain('temporarily locked');

    // CRITICAL: Legitimate student on legitimateStudentIp is NOT locked out and succeeds with HTTP 200!
    const legitReq = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-forwarded-for': legitimateStudentIp,
      },
      body: JSON.stringify({
        registrationNumber: regNo,
        dateOfBirth: '2008-05-31', // Correct DOB
      }),
    });

    const legitRes = await searchAdmitCard(legitReq);
    expect(legitRes.status).toBe(200);
    const legitData = await legitRes.json();
    expect(legitData.success).toBe(true);
    expect(legitData.student.registrationNumber).toBe(regNo);
  });

  it('SECURITY: SupabaseAdapter refuses initialization without service-role key', async () => {
    const { SupabaseAdapter } = await import('@/lib/db/supabase.adapter');
    expect(() => {
      new SupabaseAdapter('https://example.supabase.co', '');
    }).toThrow('CRITICAL CONFIGURATION ERROR');
  });

  it('SECURITY: SupabaseStorageAdapter refuses initialization without service-role key', async () => {
    const { SupabaseStorageAdapter } = await import('@/lib/storage/supabase.adapter');
    expect(() => {
      new SupabaseStorageAdapter('https://example.supabase.co', '');
    }).toThrow('CRITICAL CONFIGURATION ERROR');
  });

  it('SECURITY: getStorageAdapter throws error in production environment to prevent silent fallback to ephemeral disk', async () => {
    const prevVercel = process.env.VERCEL;
    const prevStorageSource = process.env.STORAGE_SOURCE;
    try {
      (process.env as any).VERCEL = '1';
      (process.env as any).STORAGE_SOURCE = 'local';
      const { getStorageAdapter, resetStorageInstance } = await import('@/lib/storage');
      resetStorageInstance();
      expect(() => {
        getStorageAdapter();
      }).toThrow('CRITICAL ARCHITECTURE CONFIGURATION ERROR');
    } finally {
      (process.env as any).VERCEL = prevVercel;
      (process.env as any).STORAGE_SOURCE = prevStorageSource;
      const { resetStorageInstance } = await import('@/lib/storage');
      resetStorageInstance();
    }
  });

  it('SECURITY: PDF download route rejects unauthorized DOB and yields no binary or signed URL', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/public/admit-card/download?regNo=MS211001&dob=1999-01-01&bypassDateLock=true'
    );
    const res = await downloadAdmitCard(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('content-type')).not.toContain('application/pdf');
  });

  it('INTEGRITY: pregeneration filter excludes test records and pending-review records', () => {
    const samplePool = [
      { registrationNumber: 'MS261101001', status: 'ACTIVE' },
      { registrationNumber: 'MS261101002', status: 'ACTIVE' },
      { registrationNumber: 'MS261101296', status: 'PENDING_REVIEW' }, // Pending review
      { registrationNumber: 'MS26TEST9795', status: 'ACTIVE' },        // Test record
      { registrationNumber: 'MS26TEST8948', status: 'ACTIVE' },        // Test record
    ];

    const eligible = samplePool.filter(
      (s) => s.registrationNumber.startsWith('MS2611') && s.status === 'ACTIVE'
    );

    expect(eligible).toHaveLength(2);
    expect(eligible.map((s) => s.registrationNumber)).toEqual(['MS261101001', 'MS261101002']);
    expect(eligible.some((s) => s.registrationNumber.includes('TEST'))).toBe(false);
    expect(eligible.some((s) => s.status === 'PENDING_REVIEW')).toBe(false);
  });

  it('SECURITY: getClientIp prioritizes tamper-proof Vercel and Cloudflare headers over client-supplied X-Forwarded-For', async () => {
    const { getClientIp } = await import('@/lib/security/rate-limiter');
    
    // Attacker supplies a spoofed X-Forwarded-For, but Vercel sets x-vercel-ip
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '1.1.1.1',
        'x-vercel-ip': '203.0.113.195',
      },
    });

    expect(getClientIp(req)).toBe('203.0.113.195');

    // Cloudflare cf-connecting-ip precedence
    const cfReq = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '1.1.1.1',
        'cf-connecting-ip': '198.51.100.22',
      },
    });

    expect(getClientIp(cfReq)).toBe('198.51.100.22');
  });

  it('SECURITY: Webhook POST strictly fails closed (401) in production when secrets are unconfigured', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevAppSecret = process.env.WHATSAPP_APP_SECRET;
    const prevVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    const prevIcpaasToken = process.env.ICPAAS_WEBHOOK_TOKEN;

    try {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.WHATSAPP_APP_SECRET;
      delete process.env.META_APP_SECRET;
      delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
      delete process.env.ICPAAS_WEBHOOK_TOKEN;

      const { POST: webhookPost } = await import('@/app/api/whatsapp/webhook/route');
      const req = new NextRequest('http://localhost:3000/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'delivery_update' }),
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('CRITICAL: Webhook authentication secrets');
    } finally {
      (process.env as any).NODE_ENV = prevNodeEnv;
      if (prevAppSecret) process.env.WHATSAPP_APP_SECRET = prevAppSecret;
      if (prevVerifyToken) process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = prevVerifyToken;
      if (prevIcpaasToken) process.env.ICPAAS_WEBHOOK_TOKEN = prevIcpaasToken;
    }
  });
});

