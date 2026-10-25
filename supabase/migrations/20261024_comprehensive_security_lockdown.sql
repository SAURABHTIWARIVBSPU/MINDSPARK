-- ============================================================================
-- MIND-SPARK MASTER PRODUCTION SECURITY MIGRATION (LEAST-PRIVILEGE LOCKDOWN)
-- Target: Supabase PostgreSQL (Public Schema)
-- Version: 20261024_comprehensive_security_lockdown.sql
-- Scope: All 14 Application Tables, Sequences, RPC Functions & Future Privileges
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: PREFLIGHT HEALTH CHECKS & SCHEMA VALIDATION
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
  missing_roles TEXT[] := ARRAY[]::TEXT[];
  t TEXT;
  r TEXT;
  target_tables TEXT[] := ARRAY[
    -- 7 Admit Card Core Tables
    'students', 'users', 'system_settings', 'admit_cards', 
    'audit_logs', 'import_jobs', 'admit_card_jobs',
    -- 7 WhatsApp Worker / Queue Tables
    'message_jobs', 'message_job_items', 'message_attempts',
    'message_templates', 'whatsapp_accounts', 'worker_assignments',
    'worker_installations'
  ];
  target_roles TEXT[] := ARRAY['anon', 'authenticated', 'service_role'];
BEGIN
  -- Verify Required PostgreSQL Roles
  FOREACH r IN ARRAY target_roles LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      missing_roles := array_append(missing_roles, r);
    END IF;
  END LOOP;

  IF array_length(missing_roles, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT ABORTED: Missing required PostgreSQL roles: %', missing_roles;
  END IF;

  -- Verify Required Tables in Public Schema
  FOREACH t IN ARRAY target_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      missing_tables := array_append(missing_tables, t);
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT ABORTED: Missing tables in public schema: %', missing_tables;
  END IF;

  RAISE NOTICE 'PREFLIGHT PASSED: All 3 roles and 14 tables verified in public schema.';
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: REVOKE PUBLIC, ANON, AND AUTHENTICATED PRIVILEGES
-- ----------------------------------------------------------------------------
-- Core Tables
REVOKE ALL ON TABLE public.students FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.system_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.admit_cards FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.import_jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.admit_card_jobs FROM PUBLIC, anon, authenticated;

-- WhatsApp Queue / Worker Tables
REVOKE ALL ON TABLE public.message_jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.message_job_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.message_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.message_templates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.whatsapp_accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.worker_assignments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.worker_installations FROM PUBLIC, anon, authenticated;

-- Revoke Sequence and RPC privileges from untrusted roles
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- STEP 3: GRANT PRIVILEGES TO TRUSTED SERVER ROLE (SERVICE_ROLE)
-- ----------------------------------------------------------------------------
GRANT ALL ON TABLE public.students TO service_role;
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.system_settings TO service_role;
GRANT ALL ON TABLE public.admit_cards TO service_role;
GRANT ALL ON TABLE public.audit_logs TO service_role;
GRANT ALL ON TABLE public.import_jobs TO service_role;
GRANT ALL ON TABLE public.admit_card_jobs TO service_role;

GRANT ALL ON TABLE public.message_jobs TO service_role;
GRANT ALL ON TABLE public.message_job_items TO service_role;
GRANT ALL ON TABLE public.message_attempts TO service_role;
GRANT ALL ON TABLE public.message_templates TO service_role;
GRANT ALL ON TABLE public.whatsapp_accounts TO service_role;
GRANT ALL ON TABLE public.worker_assignments TO service_role;
GRANT ALL ON TABLE public.worker_installations TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ----------------------------------------------------------------------------
-- STEP 4: ENABLE AND FORCE ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students FORCE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admit_cards FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admit_card_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admit_card_jobs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.message_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_jobs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.message_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_job_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.message_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attempts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates FORCE ROW LEVEL SECURITY;

ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.worker_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.worker_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_installations FORCE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- STEP 5: CLEAN UP OBSOLETE POLICIES & CONFIGURE EXPLICIT LEAST-PRIVILEGE POLICIES
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  target_tables TEXT[] := ARRAY[
    'students', 'users', 'system_settings', 'admit_cards', 
    'audit_logs', 'import_jobs', 'admit_card_jobs',
    'message_jobs', 'message_job_items', 'message_attempts',
    'message_templates', 'whatsapp_accounts', 'worker_assignments',
    'worker_installations'
  ];
BEGIN
  FOREACH t IN ARRAY target_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Deny anon and authenticated all" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow service_role full access" ON public.%I;', t);
    
    -- Create explicit deny policy for anon & authenticated
    EXECUTE format('CREATE POLICY "Deny anon and authenticated all" ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);', t);
    
    -- Create explicit permissive defense policy for service_role
    EXECUTE format('CREATE POLICY "Allow service_role full access" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 6: DEFINE DEFAULT PRIVILEGES FOR ALL FUTURE OBJECTS
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- ----------------------------------------------------------------------------
-- STEP 7: POST-MIGRATION VERIFICATION QUERIES
-- ----------------------------------------------------------------------------
SELECT 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

SELECT 
  tablename, 
  policyname, 
  roles, 
  cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
