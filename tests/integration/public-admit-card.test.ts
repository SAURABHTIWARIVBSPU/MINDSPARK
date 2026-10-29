import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '@/lib/db';
import { NextRequest } from 'next/server';
import { POST as searchAdmitCard } from '@/app/api/public/admit-card/search/route';
import { GET as downloadAdmitCard } from '@/app/api/public/admit-card/download/route';

describe('Public Student Admit Card Verification & Download', () => {
  beforeAll(async () => {
    const db = getDb();
    // Seed a known test student if not present
    const existing = await db.getStudentByRegNo('MS211001');
    if (!existing) {
      await db.createStudent({
        registrationNumber: 'MS211001',
        name: 'MEENAKSHI GUPTA',
        fatherName: 'TEST UNIQUE FATHER',
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

  it('successfully verifies candidate with correct Reg No and DOB', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationNumber: 'MS211001',
        dateOfBirth: '2008-05-31',
      }),
    });

    const res = await searchAdmitCard(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('private');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.get('pragma')).toBe('no-cache');

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.student.name).toBe('MEENAKSHI GUPTA');
    expect(data.student.registrationNumber).toBe('MS211001');
    expect(data.schedule.examDate).toBeDefined();
    expect(typeof data.canDownload).toBe('boolean');
    expect(data.releaseStatus.messageHindi).toContain('25 अक्टूबर');
  });

  it('rejects verification if Date of Birth does not match', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationNumber: 'MS211001',
        dateOfBirth: '2005-01-01',
      }),
    });

    const res = await searchAdmitCard(req);
    expect(res.status).toBe(401);
    expect(res.headers.get('cache-control')).toContain('private');

    const data = await res.json();
    expect(data.error).toContain('Date of Birth does not match');
  });

  it('rejects verification if Registration Number does not exist', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationNumber: 'NON_EXISTENT_9999',
        dateOfBirth: '2008-05-31',
      }),
    });

    const res = await searchAdmitCard(req);
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toContain('private');
  });

  it('respects release date logic and returns appropriate response with private headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/download?regNo=MS211001&dob=2008-05-31');
    const res = await downloadAdmitCard(req);

    // On or after 25 October returns 200 (download allowed); before 25 October returns 403
    expect([200, 403]).toContain(res.status);
    expect(res.headers.get('cache-control')).toContain('private');
  });

  it('successfully serves PDF binary for download when bypassDateLock is used', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/download?regNo=MS211001&dob=2008-05-31&bypassDateLock=true');
    const res = await downloadAdmitCard(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('cache-control')).toContain('private');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.get('pragma')).toBe('no-cache');

    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);
  });

  it('successfully verifies candidate using DD-MM-YYYY format', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationNumber: 'MS211001',
        dateOfBirth: '31-05-2008',
      }),
    });

    const res = await searchAdmitCard(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.student.name).toBe('MEENAKSHI GUPTA');
  });

  it('successfully verifies candidate using YYYY birth year format', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationNumber: 'MS211001',
        dateOfBirth: '2008',
      }),
    });

    const res = await searchAdmitCard(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.student.name).toBe('MEENAKSHI GUPTA');
  });

  it('successfully serves PDF download when DOB is provided as YYYY birth year', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/download?regNo=MS211001&dob=2008&bypassDateLock=true');
    const res = await downloadAdmitCard(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
  });

  it('successfully serves PDF download when DOB is provided as DD-MM-YYYY', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/download?regNo=MS211001&dob=31-05-2008&bypassDateLock=true');
    const res = await downloadAdmitCard(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
  });

  it('enforces 429 Too Many Requests when IP exceeds search rate limit', async () => {
    const testIp = '198.51.100.42';

    // Make 60 requests to reach the calibrated threshold
    for (let i = 0; i < 60; i++) {
      const req = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': testIp,
        },
        body: JSON.stringify({
          registrationNumber: 'MS211001',
          dateOfBirth: '2008-05-31',
        }),
      });
      await searchAdmitCard(req);
    }

    // 61st request must be blocked with HTTP 429
    const blockedReq = new NextRequest('http://localhost:3000/api/public/admit-card/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp,
      },
      body: JSON.stringify({
        registrationNumber: 'MS211001',
        dateOfBirth: '2008-05-31',
      }),
    });

    const blockedRes = await searchAdmitCard(blockedReq);
    expect(blockedRes.status).toBe(429);

    const data = await blockedRes.json();
    expect(data.error).toContain('Too many verification attempts');
    expect(blockedRes.headers.get('retry-after')).toBeDefined();
  });
});

