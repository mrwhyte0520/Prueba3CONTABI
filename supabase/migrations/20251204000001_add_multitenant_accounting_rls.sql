-- =====================================================
-- Multi-tenant RLS for Accounting/Dashboard Module
-- Date: 2024-12-04
-- Description: Row Level Security policies for chart_accounts, accounting_settings,
--              journal_entries, and journal_entry_lines using public.has_tenant_access
-- =====================================================

-- =====================================================
-- 1. CHART_ACCOUNTS TABLE
-- =====================================================

-- Enable RLS on chart_accounts
ALTER TABLE public.chart_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "chart_accounts_select_policy" ON public.chart_accounts;
DROP POLICY IF EXISTS "chart_accounts_insert_policy" ON public.chart_accounts;
DROP POLICY IF EXISTS "chart_accounts_update_policy" ON public.chart_accounts;
DROP POLICY IF EXISTS "chart_accounts_delete_policy" ON public.chart_accounts;

-- Create new multi-tenant policies
CREATE POLICY "chart_accounts_select_policy" ON public.chart_accounts
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "chart_accounts_insert_policy" ON public.chart_accounts
  FOR INSERT
  WITH CHECK (public.has_tenant_access(user_id));

CREATE POLICY "chart_accounts_update_policy" ON public.chart_accounts
  FOR UPDATE
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

CREATE POLICY "chart_accounts_delete_policy" ON public.chart_accounts
  FOR DELETE
  USING (public.has_tenant_access(user_id));

-- =====================================================
-- 2. ACCOUNTING_SETTINGS TABLE
-- =====================================================

-- Enable RLS on accounting_settings
ALTER TABLE public.accounting_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "accounting_settings_select_policy" ON public.accounting_settings;
DROP POLICY IF EXISTS "accounting_settings_insert_policy" ON public.accounting_settings;
DROP POLICY IF EXISTS "accounting_settings_update_policy" ON public.accounting_settings;
DROP POLICY IF EXISTS "accounting_settings_delete_policy" ON public.accounting_settings;

-- Create new multi-tenant policies
CREATE POLICY "accounting_settings_select_policy" ON public.accounting_settings
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "accounting_settings_insert_policy" ON public.accounting_settings
  FOR INSERT
  WITH CHECK (public.has_tenant_access(user_id));

CREATE POLICY "accounting_settings_update_policy" ON public.accounting_settings
  FOR UPDATE
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

CREATE POLICY "accounting_settings_delete_policy" ON public.accounting_settings
  FOR DELETE
  USING (public.has_tenant_access(user_id));

-- =====================================================
-- 3. JOURNAL_ENTRIES TABLE
-- =====================================================

-- Enable RLS on journal_entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "journal_entries_select_policy" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert_policy" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_update_policy" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete_policy" ON public.journal_entries;

-- Create new multi-tenant policies
CREATE POLICY "journal_entries_select_policy" ON public.journal_entries
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "journal_entries_insert_policy" ON public.journal_entries
  FOR INSERT
  WITH CHECK (public.has_tenant_access(user_id));

CREATE POLICY "journal_entries_update_policy" ON public.journal_entries
  FOR UPDATE
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

CREATE POLICY "journal_entries_delete_policy" ON public.journal_entries
  FOR DELETE
  USING (public.has_tenant_access(user_id));

-- =====================================================
-- 4. JOURNAL_ENTRY_LINES TABLE
-- =====================================================

-- Enable RLS on journal_entry_lines
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "journal_entry_lines_select_policy" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_insert_policy" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_update_policy" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "journal_entry_lines_delete_policy" ON public.journal_entry_lines;

-- Create new multi-tenant policies for journal_entry_lines
-- These policies join with journal_entries to check tenant access via the parent entry's user_id
CREATE POLICY "journal_entry_lines_select_policy" ON public.journal_entry_lines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
        AND public.has_tenant_access(je.user_id)
    )
  );

CREATE POLICY "journal_entry_lines_insert_policy" ON public.journal_entry_lines
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
        AND public.has_tenant_access(je.user_id)
    )
  );

CREATE POLICY "journal_entry_lines_update_policy" ON public.journal_entry_lines
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
        AND public.has_tenant_access(je.user_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
        AND public.has_tenant_access(je.user_id)
    )
  );

CREATE POLICY "journal_entry_lines_delete_policy" ON public.journal_entry_lines
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
        AND public.has_tenant_access(je.user_id)
    )
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes on user_id columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_chart_accounts_user_id ON public.chart_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_settings_user_id ON public.accounting_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_entry_id ON public.journal_entry_lines(journal_entry_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "chart_accounts_select_policy" ON public.chart_accounts IS
  'Multi-tenant: Users can only view chart of accounts for their tenant (owner or sub-user)';

COMMENT ON POLICY "accounting_settings_select_policy" ON public.accounting_settings IS
  'Multi-tenant: Users can only view accounting settings for their tenant (owner or sub-user)';

COMMENT ON POLICY "journal_entries_select_policy" ON public.journal_entries IS
  'Multi-tenant: Users can only view journal entries for their tenant (owner or sub-user)';

COMMENT ON POLICY "journal_entry_lines_select_policy" ON public.journal_entry_lines IS
  'Multi-tenant: Users can only view journal entry lines belonging to their tenant journal entries';
