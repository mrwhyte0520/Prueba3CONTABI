-- ================================================================
-- Migración: Agregar cuenta de Caja/Efectivo a accounting_settings
-- Fecha: 2025-12-14
-- Descripción: Permite configurar una cuenta contable de Caja/Efectivo
--              para usarla en movimientos en efectivo (cobros, anticipos,
--              etc.) cuando no se selecciona un banco específico.
-- ================================================================

-- 1. Agregar columna cash_account_id a accounting_settings
ALTER TABLE public.accounting_settings 
ADD COLUMN IF NOT EXISTS cash_account_id uuid REFERENCES public.chart_accounts(id);

-- 2. Comentario descriptivo
COMMENT ON COLUMN public.accounting_settings.cash_account_id IS 
'Cuenta contable de Caja/Efectivo usada para movimientos en efectivo (cobros, anticipos, etc.) cuando no se selecciona una cuenta bancaria específica.';
