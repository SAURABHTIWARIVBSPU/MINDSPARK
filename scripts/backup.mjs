import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';

const DB_PATH = path.join(process.cwd(), '.data', 'mind_spark_db.json');
const BACKUPS_DIR = path.join(process.cwd(), 'backups');

export async function createDatabaseBackup(customDbPath, customOutputDir) {
  const dbFile = customDbPath || DB_PATH;
  const outDir = customOutputDir || BACKUPS_DIR;

  if (!fs.existsSync(dbFile)) {
    throw new Error(`Database file not found at ${dbFile}`);
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const rawContent = fs.readFileSync(dbFile, 'utf-8');
  const dbData = JSON.parse(rawContent);

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupBaseName = `mind_spark_backup_${timestamp}`;
  const zipFileName = `${backupBaseName}.zip`;
  const zipFilePath = path.join(outDir, zipFileName);

  // Compute database SHA-256 checksum
  const checksum = crypto.createHash('sha256').update(rawContent).digest('hex');

  // Sanitize users (do not export password hashes in plaintext dumps)
  const sanitizedUsers = (dbData.users || []).map((u) => {
    const { passwordHash, ...safe } = u;
    return { ...safe, hasPasswordConfigured: !!passwordHash };
  });

  const manifest = {
    backupName: backupBaseName,
    createdAt: now.toISOString(),
    version: '1.0.0',
    checksumSha256: checksum,
    statistics: {
      totalStudents: (dbData.students || []).length,
      activeStudents: (dbData.students || []).filter((s) => s.status === 'ACTIVE').length,
      totalImports: (dbData.imports || []).length,
      totalAuditLogs: (dbData.auditLogs || []).length,
      totalAdmitCards: (dbData.admitCards || []).length,
      totalUsers: (dbData.users || []).length,
    },
    settingsSnapshot: dbData.settings || {},
  };

  // Build ZIP archive
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('students.json', JSON.stringify(dbData.students || [], null, 2));
  zip.file('settings.json', JSON.stringify(dbData.settings || {}, null, 2));
  zip.file('imports.json', JSON.stringify(dbData.imports || [], null, 2));
  zip.file('audit_logs.json', JSON.stringify(dbData.auditLogs || [], null, 2));
  zip.file('admit_cards.json', JSON.stringify(dbData.admitCards || [], null, 2));
  zip.file('users_metadata.json', JSON.stringify(sanitizedUsers, null, 2));
  zip.file('full_db_snapshot.json', rawContent);

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  fs.writeFileSync(zipFilePath, zipBuffer);

  return {
    success: true,
    backupFileName: zipFileName,
    backupFilePath: zipFilePath,
    timestamp: now.toISOString(),
    checksum,
    manifest,
  };
}

import url from 'url';

// Direct CLI Execution
const isMain = process.argv[1] && url.fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase();
if (isMain) {
  (async () => {
    try {
      console.log('🔄 Initializing Mind-Spark Database Backup...');
      const result = await createDatabaseBackup();
      console.log('✅ Backup Generated Successfully!');
      console.log(`📁 File: ${result.backupFilePath}`);
      console.log(`📊 Statistics:`);
      console.log(`   - Total Students: ${result.manifest.statistics.totalStudents}`);
      console.log(`   - Active Students: ${result.manifest.statistics.activeStudents}`);
      console.log(`   - Audit Records: ${result.manifest.statistics.totalAuditLogs}`);
      console.log(`   - SHA-256 Checksum: ${result.checksum}`);
    } catch (err) {
      console.error('❌ Backup Failed:', err.message);
      process.exit(1);
    }
  })();
}
