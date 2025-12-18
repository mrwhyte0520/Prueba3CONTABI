 -- RBAC: roles, permissions, role_permissions y user_roles

-- Tabla de roles por tenant (owner_user_id)
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_roles_owner_name
  on public.roles(owner_user_id, name);

-- Permisos de aplicación (por módulo y acción)
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null
);

create index if not exists idx_permissions_module_action
  on public.permissions(module, action);

-- Relación rol -> permisos
create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_role_permissions_role_perm_owner
  on public.role_permissions(role_id, permission_id, owner_user_id);

-- Relación usuarios -> roles dentro de un tenant (owner_user_id)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_roles_user
  on public.user_roles(user_id);

create index if not exists idx_user_roles_owner
  on public.user_roles(owner_user_id);

-- Semilla de permisos base para cada módulo (acción: access)
insert into public.permissions (module, action) values
  ('dashboard', 'access'),
  ('accounting', 'access'),
  ('pos', 'access'),
  ('sales', 'access'),
  ('products', 'access'),
  ('inventory', 'access'),
  ('fixed-assets', 'access'),
  ('accounts-receivable', 'access'),
  ('accounts-payable', 'access'),
  ('billing', 'access'),
  ('taxes', 'access'),
  ('plans', 'access'),
  ('settings', 'access'),
  ('customers', 'access'),
  ('users', 'access')
on conflict do nothing;
