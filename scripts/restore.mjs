import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const DB_PATH = path.join(process.cwd(), '.data', 'mind_spark_db.json');

export async function restoreDatabaseFromBackup(backupFilePath, targetDbPath) {
  const targetFile = targetDbPath || DB_PATH;

  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found at: ${backupFilePath}`);
  }

  // 1. If currently existing, take a safety snapshot before overwriting
  if (fs.existsSync(targetFile)) {
    const safetyBackup = `${targetFile}.pre_restore_${Date.now()}.bak`;
    fs.copyFileSync(targetFile, safetyBackup);
  }

  let restoredContent = '';

  if (backupFilePath.endsWith('.zip')) {
    const zipData = fs.readFileSync(backupFilePath);
    const zip = await JSZip.loadAsync(zipData);

    const snapshotFile = zip.file('full_db_snapshot.json');
    if (!snapshotFile) {
      throw new Error('Invalid backup archive: missing full_db_snapshot.json');
    }

    restoredContent = await snapshotFile.async('string');
  } else if (backupFilePath.endsWith('.json')) {
    restoredContent = fs.readFileSync(backupFilePath, 'utf-8');
  } else {
    throw new Error('Unsupported backup format. Must be .zip or .json');
  }

  // Validate JSON integrity
  const parsed = JSON.parse(restoredContent);
  if (!parsed.students || !parsed.settings) {
    throw new Error('Invalid backup data schema: missing students or settings collection');
  }

  const dir = path.dirname(targetFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(targetFile, JSON.stringify(parsed, null, 2), 'utf-8');

  return {
    success: true,
    totalStudents: parsed.students.length,
    restoredFrom: backupFilePath,
    targetFile,
  };
}

import url from 'url';

// CLI Execution
const isMain = process.argv[1] && url.fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase();
if (isMain) {
  const backupFile = process.argv[2];
  if (!backupFile) {
    console.error('Usage: npm run restore <path-to-backup-zip-or-json>');
    process.exit(1);
  }

  (async () => {
    try {
      console.log(`🔄 Restoring database from: ${backupFile}...`);
      const res = await restoreDatabaseFromBackup(backupFile);
      console.log('✅ Database Restored Successfully!');
      console.log(`📊 Restored ${res.totalStudents} student records into ${res.targetFile}`);
    } catch (err) {
      console.error('❌ Restore Failed:', err.message);
      process.exit(1);
    }
  })();
}
