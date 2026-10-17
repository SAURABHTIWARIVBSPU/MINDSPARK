-- Mind-Spark Master Database Schema for Supabase (PostgreSQL)
-- Run this in your Supabase Project -> SQL Editor -> Click 'Run'

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_settings',
  school_name TEXT NOT NULL DEFAULT 'Mind-Spark Inter-School Competition',
  competition_title TEXT NOT NULL DEFAULT 'Annual Mind-Spark Academic Olympiad 2026',
  venue TEXT NOT NULL DEFAULT 'MSITM DEGREE COLLEGE GONDA UTTAR PRADESH',
  exam_date TEXT NOT NULL DEFAULT '01 Nov 2026',
  reporting_time TEXT NOT NULL DEFAULT '09:00 AM',
  contact_phone TEXT NOT NULL DEFAULT '9876543210',
  contact_email TEXT NOT NULL DEFAULT 'admissions@mindspark.edu.in',
  reg_no_prefix TEXT NOT NULL DEFAULT 'MS',
  reg_no_year TEXT NOT NULL DEFAULT '26',
  reg_no_seq_current BIGINT NOT NULL DEFAULT 1000,
  whatsapp_cloud_token TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_template_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial default settings row if not exists
INSERT INTO system_settings (id) VALUES ('default_settings') ON CONFLICT (id) DO NOTHING;

-- 2. Staff Users & Authentication Table
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'READ_ONLY',
  active BOOLEAN NOT NULL DEFAULT true,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Insert default admin users
INSERT INTO users (uid, email, display_name, role, active, password_hash)
VALUES
  ('superadmin_1', 'superadmin@mindspark.edu.in', 'Headmaster (Super Admin)', 'SUPER_ADMIN', true, '$2b$10$BVhiyB/z2UR7IEDgzUjiX.vKgNsWI6AZwg8hzLCCEFqtm5vQ09fyS'),
  ('admin_1', 'admin@mindspark.edu.in', 'Exam Coordinator (Admin)', 'ADMIN', true, '$2b$10$BVhiyB/z2UR7IEDgzUjiX.vKgNsWI6AZwg8hzLCCEFqtm5vQ09fyS'),
  ('operator_1', 'operator@mindspark.edu.in', 'Registration Operator', 'REGISTRATION_OPERATOR', true, '$2b$10$TuwU6Ky.3qB2nsh3K/F/fufQsalufUpJW3sNP/rPR8Heg/N1GNzuK')
ON CONFLICT (uid) DO NOTHING;

-- 3. Students Master Table
CREATE TABLE IF NOT EXISTS students (
  student_id TEXT PRIMARY KEY,
  registration_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  phone TEXT NOT NULL,
  school_or_college TEXT NOT NULL,
  class_name TEXT NOT NULL,
  competition_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  whatsapp_status TEXT NOT NULL DEFAULT 'NOT_SENT',
  whatsapp_sent_at TIMESTAMPTZ,
  source_import_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system',
  data_version INT DEFAULT 1
);

-- Fast search indexes for millions of records
CREATE INDEX IF NOT EXISTS idx_students_reg_no ON students (registration_number);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students (phone);
CREATE INDEX IF NOT EXISTS idx_students_status ON students (status);
CREATE INDEX IF NOT EXISTS idx_students_competition ON students (competition_name);
CREATE INDEX IF NOT EXISTS idx_students_school ON students (school_or_college);
CREATE INDEX IF NOT EXISTS idx_students_whatsapp ON students (whatsapp_status);

-- 4. Import Jobs Audit Table
CREATE TABLE IF NOT EXISTS import_jobs (
  import_id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_fingerprint TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  total_rows INT DEFAULT 0,
  valid_rows INT DEFAULT 0,
  warning_rows INT DEFAULT 0,
  rejected_rows INT DEFAULT 0,
  processed_rows INT DEFAULT 0,
  mapping_version TEXT,
  error_report JSONB DEFAULT '[]'::jsonb
);

-- 5. Admit Cards Cache Table
CREATE TABLE IF NOT EXISTS admit_cards (
  student_id TEXT PRIMARY KEY REFERENCES students(student_id) ON DELETE CASCADE,
  registration_number TEXT NOT NULL,
  file_id TEXT NOT NULL,
  storage_type TEXT DEFAULT 'local',
  template_version TEXT DEFAULT 'v1',
  source_data_hash TEXT,
  status TEXT DEFAULT 'READY',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Batch Generation Jobs Table
CREATE TABLE IF NOT EXISTS admit_card_jobs (
  job_id TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  template_version TEXT DEFAULT 'v1',
  total INT DEFAULT 0,
  processed INT DEFAULT 0,
  succeeded INT DEFAULT 0,
  failed INT DEFAULT 0,
  last_progress_at TIMESTAMPTZ DEFAULT NOW(),
  errors JSONB DEFAULT '[]'::jsonb
);

-- 7. Audit Security Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  event_id TEXT PRIMARY KEY,
  actor_uid TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp DESC);
