-- =====================================================
-- Multi-tenant RLS for POS Cash Closings
-- Date: 2024-12-07
-- Description: Row Level Security policies for cash_closings using
--              public.has_tenant_access(user_id) so owner and sub-users
--              share the same tenant data.
-- =====================================================

-- Helper function must already exist:
-- public.has_tenant_access(target_user_id uuid)

-- =====================================================
-- CASH CLOSINGS (Arqueos / Cierres de Caja)
-- =====================================================
alter table public.cash_closings enable row level security;

-- Drop existing policies if any
DROP POLICY IF EXISTS "cash_closings_select" ON public.cash_closings;
DROP POLICY IF EXISTS "cash_closings_insert" ON public.cash_closings;
DROP POLICY IF EXISTS "cash_closings_update" ON public.cash_closings;
DROP POLICY IF EXISTS "cash_closings_delete" ON public.cash_closings;

-- Allow users to see only closings for tenants they have access to
CREATE POLICY "cash_closings_select" ON public.cash_closings
  FOR SELECT
  USING (public.has_tenant_access(user_id));

-- Inserts must belong to a tenant the user can access
CREATE POLICY "cash_closings_insert" ON public.cash_closings
  FOR INSERT
  WITH CHECK (public.has_tenant_access(user_id));

-- Updates only within same tenant
CREATE POLICY "cash_closings_update" ON public.cash_closings
  FOR UPDATE
  USING (public.has_tenant_access(user_id))
  WITH CHECK (public.has_tenant_access(user_id));

-- Deletes only within same tenant
CREATE POLICY "cash_closings_delete" ON public.cash_closings
  FOR DELETE
  USING (public.has_tenant_access(user_id));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cash_closings_user_id ON public.cash_closings(user_id);

-- Comment for clarity
COMMENT ON POLICY "cash_closings_select" ON public.cash_closings IS
  'Multi-tenant: Users can only view cash closings for their tenant (owner or sub-user)';
