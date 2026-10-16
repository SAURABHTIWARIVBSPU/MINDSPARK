import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import { createDatabaseBackup } from '../../scripts/backup.mjs';
import { restoreDatabaseFromBackup } from '../../scripts/restore.mjs';

const testDir = path.join(process.cwd(), '.data', 'test_backup_temp');
const testDbFile = path.join(testDir, 'source_db.json');
const testOutDir = path.join(testDir, 'archives');
const testRestoreTarget = path.join(testDir, 'restored_db.json');

describe('Automated Database Backup & Restore System', () => {
  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Seed test database file
    const sampleDb = {
      users: [
        { uid: 'u1', email: 'test@mindspark.edu.in', role: 'ADMIN', active: true },
      ],
      students: [
        {
          studentId: 'std_1',
          registrationNumber: 'MS261001',
          name: 'STUDENT ONE',
          fatherName: 'FATHER ONE',
          dateOfBirth: '2008-01-01',
          phone: '9876543210',
          schoolOrCollege: 'TEST SCHOOL',
          className: '10',
          competitionName: 'QUIZ',
          status: 'ACTIVE',
        },
      ],
      imports: [],
      admitCards: [],
      admitCardJobs: [],
      auditLogs: [],
      settings: {
        schoolName: 'Test School',
        venue: 'Test Venue',
      },
    };
    fs.writeFileSync(testDbFile, JSON.stringify(sampleDb, null, 2), 'utf-8');
  });

  it('generates a valid, compressed timestamped zip archive with manifest and collections', async () => {
    const backupRes = await createDatabaseBackup(testDbFile, testOutDir);

    expect(backupRes.success).toBe(true);
    expect(fs.existsSync(backupRes.backupFilePath)).toBe(true);
    expect(backupRes.manifest.statistics.totalStudents).toBe(1);
    expect(backupRes.checksum).toBeDefined();

    // Verify zip contents
    const zipData = fs.readFileSync(backupRes.backupFilePath);
    const zip = await JSZip.loadAsync(zipData);

    expect(zip.file('manifest.json')).not.toBeNull();
    expect(zip.file('students.json')).not.toBeNull();
    expect(zip.file('settings.json')).not.toBeNull();
    expect(zip.file('full_db_snapshot.json')).not.toBeNull();

    const manifestRaw = await zip.file('manifest.json')!.async('string');
    const parsedManifest = JSON.parse(manifestRaw);
    expect(parsedManifest.statistics.totalStudents).toBe(1);
  });

  it('successfully restores the database from a backup zip archive', async () => {
    const backupRes = await createDatabaseBackup(testDbFile, testOutDir);

    // Restore to target
    const restoreRes = await restoreDatabaseFromBackup(backupRes.backupFilePath, testRestoreTarget);

    expect(restoreRes.success).toBe(true);
    expect(restoreRes.totalStudents).toBe(1);
    expect(fs.existsSync(testRestoreTarget)).toBe(true);

    const restoredData = JSON.parse(fs.readFileSync(testRestoreTarget, 'utf-8'));
    expect(restoredData.students[0].registrationNumber).toBe('MS261001');
    expect(restoredData.settings.venue).toBe('Test Venue');
  });
});
