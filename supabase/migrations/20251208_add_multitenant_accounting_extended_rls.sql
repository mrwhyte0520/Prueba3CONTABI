-- =====================================================
-- Multi-tenant RLS for Extended Accounting Module Tables
-- Date: 2024-12-08
-- Description: Row Level Security policies for financial_statements, bank_accounts,
--              bank_reconciliations, bank_reconciliation_items, and opening_balances
--              using public.has_tenant_access
-- =====================================================

-- Helper function must already exist:
-- public.has_tenant_access(target_user_id uuid)

-- =====================================================
-- FINANCIAL STATEMENTS
-- =====================================================
ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_statements_select" ON public.financial_statements;
DROP POLICY IF EXISTS "financial_statements_write" ON public.financial_statements;

CREATE POLICY "financial_statements_select" ON public.financial_statements
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "financial_statements_write" ON public.financial_statements
  FOR ALL
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

-- =====================================================
-- BANK ACCOUNTS
-- =====================================================
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_accounts_select" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_write" ON public.bank_accounts;

CREATE POLICY "bank_accounts_select" ON public.bank_accounts
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "bank_accounts_write" ON public.bank_accounts
  FOR ALL
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

-- =====================================================
-- BANK RECONCILIATIONS
-- =====================================================
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_reconciliations_select" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "bank_reconciliations_write" ON public.bank_reconciliations;

CREATE POLICY "bank_reconciliations_select" ON public.bank_reconciliations
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "bank_reconciliations_write" ON public.bank_reconciliations
  FOR ALL
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

-- =====================================================
-- BANK RECONCILIATION ITEMS
-- =====================================================
ALTER TABLE public.bank_reconciliation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_reconciliation_items_select" ON public.bank_reconciliation_items;
DROP POLICY IF EXISTS "bank_reconciliation_items_write" ON public.bank_reconciliation_items;

CREATE POLICY "bank_reconciliation_items_select" ON public.bank_reconciliation_items
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "bank_reconciliation_items_write" ON public.bank_reconciliation_items
  FOR ALL
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

-- =====================================================
-- OPENING BALANCES
-- =====================================================
ALTER TABLE public.opening_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opening_balances_select" ON public.opening_balances;
DROP POLICY IF EXISTS "opening_balances_write" ON public.opening_balances;

CREATE POLICY "opening_balances_select" ON public.opening_balances
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "opening_balances_write" ON public.opening_balances
  FOR ALL
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_financial_statements_user_id ON public.financial_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_user_id ON public.bank_reconciliations(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_items_user_id ON public.bank_reconciliation_items(user_id);
CREATE INDEX IF NOT EXISTS idx_opening_balances_user_id ON public.opening_balances(user_id);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "financial_statements_select" ON public.financial_statements IS
  'Multi-tenant: Users can only view financial statements for their tenant (owner or sub-user)';

COMMENT ON POLICY "bank_accounts_select" ON public.bank_accounts IS
  'Multi-tenant: Users can only view bank accounts for their tenant (owner or sub-user)';

COMMENT ON POLICY "bank_reconciliations_select" ON public.bank_reconciliations IS
  'Multi-tenant: Users can only view bank reconciliations for their tenant (owner or sub-user)';

COMMENT ON POLICY "bank_reconciliation_items_select" ON public.bank_reconciliation_items IS
  'Multi-tenant: Users can only view bank reconciliation items for their tenant (owner or sub-user)';

COMMENT ON POLICY "opening_balances_select" ON public.opening_balances IS
  'Multi-tenant: Users can only view opening balances for their tenant (owner or sub-user)';
