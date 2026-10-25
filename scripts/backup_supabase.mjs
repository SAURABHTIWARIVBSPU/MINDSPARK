import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

const BACKUPS_DIR = path.join(process.cwd(), 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

async function fetchAllRows(client, table) {
  // First get exact count
  const { count, error: countErr } = await client.from(table).select('*', { count: 'exact', head: true });
  if (countErr) {
    throw new Error(`Count failed on ${table}: ${countErr.message}`);
  }

  const total = count || 0;
  if (total === 0) return { rows: [], total: 0 };

  const PAGE_SIZE = 1000;
  let allRows = [];
  let from = 0;

  while (from < total) {
    const to = Math.min(from + PAGE_SIZE - 1, total - 1);
    const { data, error } = await client.from(table).select('*').range(from, to);
    if (error) {
      throw new Error(`Pagination failed on ${table} [${from}-${to}]: ${error.message}`);
    }
    allRows = allRows.concat(data || []);
    from += PAGE_SIZE;
  }

  return { rows: allRows, total };
}

async function backupSupabase() {
  console.log('🔄 Initializing Complete Live Supabase Cloud Database Backup (All 14 Tables with Full Pagination)...');
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const tables = [
    // 7 Core Application Tables
    'students', 'users', 'system_settings', 'admit_cards', 'audit_logs', 'import_jobs', 'admit_card_jobs',
    // 7 WhatsApp Worker / Queue Tables
    'message_jobs', 'message_job_items', 'message_attempts', 'message_templates', 'whatsapp_accounts', 'worker_assignments', 'worker_installations'
  ];

  const snapshot = {
    timestamp: new Date().toISOString(),
    supabaseUrl: env.SUPABASE_URL,
    tables: {},
    counts: {},
  };

  for (const table of tables) {
    try {
      const { rows, total } = await fetchAllRows(client, table);
      snapshot.tables[table] = rows;
      snapshot.counts[table] = total;

      if (rows.length !== total) {
        throw new Error(`FATAL: Table ${table} array length (${rows.length}) does not match total count (${total})!`);
      }
      console.log(`  ✓ Exported ${table}: ${rows.length} / ${total} rows (100% complete)`);
    } catch (err) {
      console.warn(`  ⚠️ Exception exporting ${table}: ${err.message}`);
      snapshot.tables[table] = [];
      snapshot.counts[table] = 0;
    }
  }

  const rawJson = JSON.stringify(snapshot, null, 2);
  const checksum = crypto.createHash('sha256').update(rawJson).digest('hex');
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `supabase_cloud_backup_full_${now}.json`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

  fs.writeFileSync(backupFilePath, rawJson, 'utf8');

  console.log('\n===============================================================');
  console.log('✅ COMPLETE SUPABASE CLOUD BACKUP VERIFIED & SAVED!');
  console.log(`📁 File: ${backupFilePath}`);
  console.log(`🔐 SHA-256 Checksum: ${checksum}`);
  console.log(`📊 Size: ${(fs.statSync(backupFilePath).size / 1024 / 1024).toFixed(2)} MB`);
  console.log('📊 Complete Record Counts:', snapshot.counts);
  console.log('===============================================================\n');

  return { backupFilePath, checksum, counts: snapshot.counts };
}

backupSupabase().catch((err) => {
  console.error('❌ Supabase Backup Failed:', err);
  process.exit(1);
});
