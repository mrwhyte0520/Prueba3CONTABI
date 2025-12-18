-- =====================================================
-- Multi-tenant RLS for Petty Cash (Caja Chica) Module
-- Date: 2024-12-09
-- Description: Row Level Security policies for petty cash funds, expenses,
--              reimbursements, and categories using public.has_tenant_access
-- =====================================================

-- Helper function must already exist:
-- public.has_tenant_access(target_user_id uuid)

-- =====================================================
-- PETTY CASH FUNDS (Fondos de Caja Chica)
-- =====================================================
ALTER TABLE public.petty_cash_funds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "petty_cash_funds_select" ON public.petty_cash_funds;
DROP POLICY IF EXISTS "petty_cash_funds_write" ON public.petty_cash_funds;

CREATE POLICY "petty_cash_funds_select" ON public.petty_cash_funds
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "petty_cash_funds_write" ON public.petty_cash_funds
  FOR ALL
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

-- =====================================================
-- PETTY CASH EXPENSES (Gastos de Caja Chica)
-- =====================================================
ALTER TABLE public.petty_cash_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "petty_cash_expenses_select" ON public.petty_cash_expenses;
DROP POLICY IF EXISTS "petty_cash_expenses_write" ON public.petty_cash_expenses;

CREATE POLICY "petty_cash_expenses_select" ON public.petty_cash_expenses
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "petty_cash_expenses_write" ON public.petty_cash_expenses
  FOR ALL
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

-- =====================================================
-- PETTY CASH REIMBURSEMENTS (Reembolsos de Caja Chica)
-- =====================================================
ALTER TABLE public.petty_cash_reimbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "petty_cash_reimbursements_select" ON public.petty_cash_reimbursements;
DROP POLICY IF EXISTS "petty_cash_reimbursements_write" ON public.petty_cash_reimbursements;

CREATE POLICY "petty_cash_reimbursements_select" ON public.petty_cash_reimbursements
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "petty_cash_reimbursements_write" ON public.petty_cash_reimbursements
  FOR ALL
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

-- =====================================================
-- PETTY CASH CATEGORIES (Categorías de Caja Chica)
-- =====================================================
ALTER TABLE public.petty_cash_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "petty_cash_categories_select" ON public.petty_cash_categories;
DROP POLICY IF EXISTS "petty_cash_categories_write" ON public.petty_cash_categories;

CREATE POLICY "petty_cash_categories_select" ON public.petty_cash_categories
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "petty_cash_categories_write" ON public.petty_cash_categories
  FOR ALL
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

-- =====================================================
-- ACCOUNTING PERIODS (Períodos Contables)
-- =====================================================
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_periods_select" ON public.accounting_periods;
DROP POLICY IF EXISTS "accounting_periods_write" ON public.accounting_periods;

CREATE POLICY "accounting_periods_select" ON public.accounting_periods
  FOR SELECT
  USING (public.has_tenant_access(user_id));

CREATE POLICY "accounting_periods_write" ON public.accounting_periods
  FOR ALL
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_petty_cash_funds_user_id ON public.petty_cash_funds(user_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_user_id ON public.petty_cash_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_fund_id ON public.petty_cash_expenses(fund_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_reimbursements_user_id ON public.petty_cash_reimbursements(user_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_reimbursements_fund_id ON public.petty_cash_reimbursements(fund_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_categories_user_id ON public.petty_cash_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_user_id ON public.accounting_periods(user_id);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "petty_cash_funds_select" ON public.petty_cash_funds IS
  'Multi-tenant: Users can only view petty cash funds for their tenant (owner or sub-user)';

COMMENT ON POLICY "petty_cash_expenses_select" ON public.petty_cash_expenses IS
  'Multi-tenant: Users can only view petty cash expenses for their tenant (owner or sub-user)';

COMMENT ON POLICY "petty_cash_reimbursements_select" ON public.petty_cash_reimbursements IS
  'Multi-tenant: Users can only view petty cash reimbursements for their tenant (owner or sub-user)';

COMMENT ON POLICY "petty_cash_categories_select" ON public.petty_cash_categories IS
  'Multi-tenant: Users can only view petty cash categories for their tenant (owner or sub-user)';

COMMENT ON POLICY "accounting_periods_select" ON public.accounting_periods IS
  'Multi-tenant: Users can only view accounting periods for their tenant (owner or sub-user)';
