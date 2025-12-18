-- =====================================================
-- Multi-tenant RLS for Application Users
-- Date: 2025-12-12
-- Description: Row Level Security policies for public.users so that
--              each tenant (owner + subusuarios) solo ve y gestiona
--              sus propios usuarios.
-- =====================================================

-- Supuestos:
-- - Tabla public.users existe y usa id UUID (vinculado a auth.users.id)
-- - Relación tenant-usuario se hace vía public.user_roles
--   (owner_user_id = id del owner del tenant, user_id = id del usuario)
-- - Función helper: public.has_tenant_access(target_user_id uuid)

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas si existen
DROP POLICY IF EXISTS users_self_select ON public.users;
DROP POLICY IF EXISTS users_self_update ON public.users;
DROP POLICY IF EXISTS users_tenant_select ON public.users;
DROP POLICY IF EXISTS users_owner_manage ON public.users;

-- 1) Cada usuario puede ver su propio registro
CREATE POLICY users_self_select ON public.users
FOR SELECT
USING ( id::uuid = auth.uid() );

-- 2) Cada usuario puede actualizar su propio perfil (nombre, teléfono, etc.)
CREATE POLICY users_self_update ON public.users
FOR UPDATE
USING ( id::uuid = auth.uid() )
WITH CHECK ( id::uuid = auth.uid() );

-- 3) Usuarios del mismo tenant pueden ver a los usuarios de su tenant
--    (para listados en settings/users, etc.)
CREATE POLICY users_tenant_select ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id::uuid = public.users.id::uuid
      AND public.has_tenant_access(ur.owner_user_id::uuid)
  )
);

-- 4) Solo el owner del tenant puede gestionar (actualizar estado, etc.)
CREATE POLICY users_owner_manage ON public.users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id::uuid = public.users.id::uuid
      AND ur.owner_user_id::uuid = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id::uuid = public.users.id::uuid
      AND ur.owner_user_id::uuid = auth.uid()
  )
);
