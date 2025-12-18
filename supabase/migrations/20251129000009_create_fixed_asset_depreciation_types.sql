-- Fixed asset depreciation types

create table if not exists public.fixed_asset_depreciation_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  method text, -- lineal, suma de dígitos, etc.
  useful_life_months integer,
  annual_rate numeric(10,4),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_fixed_asset_depr_types_user_code
  on public.fixed_asset_depreciation_types(user_id, code);
