-- ================================================================
-- Migración: Control de seed único del catálogo de cuentas
-- Fecha: 2025-11-23
-- Descripción: Agregar campo para controlar que el catálogo
--              de cuentas predeterminado solo se cargue una vez
--              por usuario, y no se vuelva a cargar si lo borra.
-- ================================================================

-- 1. Agregar columna chart_accounts_seeded a accounting_settings
ALTER TABLE public.accounting_settings 
ADD COLUMN IF NOT EXISTS chart_accounts_seeded boolean DEFAULT false;

-- 2. Agregar comentario para documentación
COMMENT ON COLUMN public.accounting_settings.chart_accounts_seeded IS 
'Indica si el catálogo de cuentas predeterminado ya fue sembrado para este usuario. Una vez true, no se vuelve a cargar automáticamente, incluso si el usuario borra todas las cuentas.';

-- 3. Si hay usuarios que ya tienen cuentas, marcarlos como "ya sembrados"
--    para evitar que se les vuelva a cargar la plantilla
UPDATE public.accounting_settings
SET chart_accounts_seeded = true
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM public.chart_accounts
);

-- 4. Verificar el resultado
SELECT 
  user_id, 
  chart_accounts_seeded,
  updated_at
FROM public.accounting_settings
ORDER BY updated_at DESC
LIMIT 10;
