-- Crear tabla de almacenes (warehouses) si no existe
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  code text not null,
  location text,
  address text,
  description text,
  manager text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Asegurar que existan las columnas requeridas aunque la tabla sea antigua
alter table public.warehouses
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists location text,
  add column if not exists address text,
  add column if not exists description text,
  add column if not exists manager text,
  add column if not exists phone text,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Índices de ayuda
create index if not exists idx_warehouses_user_id on public.warehouses(user_id);
create index if not exists idx_warehouses_code_user on public.warehouses(user_id, code);
