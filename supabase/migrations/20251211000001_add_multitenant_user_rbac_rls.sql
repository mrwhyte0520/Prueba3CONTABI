-- =====================================================
-- Multi-tenant RLS for User RBAC Module
-- Date: 2025-12-11
-- Description: Row Level Security policies for roles, role_permissions
--              and user_roles to isolate data by tenant (owner_user_id)
-- =====================================================

-- Helper function must already exist:
-- public.has_tenant_access(target_user_id uuid)

-- =====================================================
-- ROLES
-- =====================================================

alter table public.roles enable row level security;

drop policy if exists "roles_select" on public.roles;
drop policy if exists "roles_write" on public.roles;

-- Los usuarios (owner + subusuarios) del mismo tenant pueden ver los roles
create policy "roles_select" on public.roles
for select
using ( public.has_tenant_access(owner_user_id::uuid) );

-- Solo el owner del tenant puede crear/editar/eliminar roles
create policy "roles_write" on public.roles
for all
using ( owner_user_id::uuid = auth.uid() )
with check ( owner_user_id::uuid = auth.uid() );

-- =====================================================
-- ROLE PERMISSIONS
-- =====================================================

alter table public.role_permissions enable row level security;

drop policy if exists "role_permissions_owner_manage" on public.role_permissions;
drop policy if exists "role_permissions_user_view" on public.role_permissions;

-- Solo el owner del tenant puede administrar los permisos de los roles
create policy "role_permissions_owner_manage" on public.role_permissions
for all
using ( owner_user_id::uuid = auth.uid() )
with check ( owner_user_id::uuid = auth.uid() );

-- Cualquier usuario del tenant puede leer los permisos de los roles
-- a los que pertenece (vía user_roles) para evaluar acceso por módulo
create policy "role_permissions_user_view" on public.role_permissions
for select
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.role_id = role_permissions.role_id
      and (
        ur.user_id::uuid = auth.uid()
        or ur.owner_user_id::uuid = auth.uid()
      )
  )
);

-- =====================================================
-- USER ROLES
-- =====================================================

alter table public.user_roles enable row level security;

drop policy if exists "user_roles_owner_manage" on public.user_roles;
drop policy if exists "user_roles_user_view" on public.user_roles;

-- Solo el owner del tenant puede asignar o revocar roles
create policy "user_roles_owner_manage" on public.user_roles
for all
using ( owner_user_id::uuid = auth.uid() )
with check ( owner_user_id::uuid = auth.uid() );

-- Cada usuario puede ver sus propias asignaciones de rol
create policy "user_roles_user_view" on public.user_roles
for select
using (
  user_id::uuid = auth.uid()
);
