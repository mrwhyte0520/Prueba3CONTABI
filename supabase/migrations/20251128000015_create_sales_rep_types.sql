-- Create table for Sales Rep Types and link to sales_reps

create table if not exists public.sales_rep_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  description text,
  default_commission_rate numeric,
  max_discount_percent numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sales_rep_types_user_id on public.sales_rep_types(user_id);

alter table public.sales_reps
  add column if not exists sales_rep_type_id uuid references public.sales_rep_types(id);

comment on table public.sales_rep_types is 'Tipos de vendedor para clasificar vendedores y definir condiciones generales';
comment on column public.sales_rep_types.default_commission_rate is 'Porcentaje de comisión sugerido para este tipo de vendedor';
comment on column public.sales_rep_types.max_discount_percent is 'Porcentaje máximo de descuento sugerido para este tipo de vendedor';
comment on column public.sales_reps.sales_rep_type_id is 'Tipo de vendedor asociado a este vendedor';
