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

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.student.name).toBe('MEENAKSHI GUPTA');
    expect(data.student.registrationNumber).toBe('MS211001');
    expect(data.schedule.examDate).toBeDefined();
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
  });

  it('successfully serves PDF binary for download when verified', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/download?regNo=MS211001&dob=2008-05-31');
    const res = await downloadAdmitCard(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');

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
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/download?regNo=MS211001&dob=2008');
    const res = await downloadAdmitCard(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
  });

  it('successfully serves PDF download when DOB is provided as DD-MM-YYYY', async () => {
    const req = new NextRequest('http://localhost:3000/api/public/admit-card/download?regNo=MS211001&dob=31-05-2008');
    const res = await downloadAdmitCard(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
  });

  it('enforces 429 Too Many Requests when IP exceeds search rate limit', async () => {
    const testIp = '198.51.100.42';

    // Make 10 requests to reach the limit
    for (let i = 0; i < 10; i++) {
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

    // 11th request must be blocked with HTTP 429
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

