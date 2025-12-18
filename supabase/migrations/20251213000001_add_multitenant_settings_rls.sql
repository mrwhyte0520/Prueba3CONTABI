-- =====================================================
-- Multi-tenant RLS for Settings/Configuration Module
-- Date: 2025-12-13
-- Description: Row Level Security para tablas de configuración
--              (company_info, accounting_settings, tax_settings,
--               inventory_settings, payroll_settings)
-- =====================================================

-- Suposición: Todas las tablas de settings tienen columna user_id (UUID)
-- y deben ser aisladas por tenant usando public.has_tenant_access

-- ===========================================
-- 1. company_info
-- ===========================================

ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_info_select ON public.company_info;
DROP POLICY IF EXISTS company_info_write ON public.company_info;

CREATE POLICY company_info_select ON public.company_info
FOR SELECT
USING ( public.has_tenant_access(user_id::uuid) );

CREATE POLICY company_info_write ON public.company_info
FOR ALL
USING ( public.has_tenant_access(user_id::uuid) )
WITH CHECK ( public.has_tenant_access(user_id::uuid) );

-- ===========================================
-- 2. accounting_settings
-- ===========================================

ALTER TABLE public.accounting_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_settings_select ON public.accounting_settings;
DROP POLICY IF EXISTS accounting_settings_write ON public.accounting_settings;

CREATE POLICY accounting_settings_select ON public.accounting_settings
FOR SELECT
USING ( public.has_tenant_access(user_id::uuid) );

CREATE POLICY accounting_settings_write ON public.accounting_settings
FOR ALL
USING ( public.has_tenant_access(user_id::uuid) )
WITH CHECK ( public.has_tenant_access(user_id::uuid) );

-- ===========================================
-- 3. tax_settings
-- ===========================================

ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_settings_select ON public.tax_settings;
DROP POLICY IF EXISTS tax_settings_write ON public.tax_settings;

CREATE POLICY tax_settings_select ON public.tax_settings
FOR SELECT
USING ( public.has_tenant_access(user_id::uuid) );

CREATE POLICY tax_settings_write ON public.tax_settings
FOR ALL
USING ( public.has_tenant_access(user_id::uuid) )
WITH CHECK ( public.has_tenant_access(user_id::uuid) );

-- ===========================================
-- 4. inventory_settings
-- ===========================================

ALTER TABLE public.inventory_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_settings_select ON public.inventory_settings;
DROP POLICY IF EXISTS inventory_settings_write ON public.inventory_settings;

CREATE POLICY inventory_settings_select ON public.inventory_settings
FOR SELECT
USING ( public.has_tenant_access(user_id::uuid) );

CREATE POLICY inventory_settings_write ON public.inventory_settings
FOR ALL
USING ( public.has_tenant_access(user_id::uuid) )
WITH CHECK ( public.has_tenant_access(user_id::uuid) );

-- ===========================================
-- 5. payroll_settings
-- ===========================================

ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payroll_settings_select ON public.payroll_settings;
DROP POLICY IF EXISTS payroll_settings_write ON public.payroll_settings;

CREATE POLICY payroll_settings_select ON public.payroll_settings
FOR SELECT
USING ( public.has_tenant_access(user_id::uuid) );

CREATE POLICY payroll_settings_write ON public.payroll_settings
FOR ALL
USING ( public.has_tenant_access(user_id::uuid) )
WITH CHECK ( public.has_tenant_access(user_id::uuid) );
