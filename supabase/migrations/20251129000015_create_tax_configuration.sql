-- Tax configuration for Dominican taxes and TSS parameters

create table if not exists public.tax_configuration (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- General taxes
  itbis_rate numeric(10,4) not null default 18.00,
  isr_rates jsonb not null default '{}'::jsonb,
  withholding_rates jsonb not null default '{}'::jsonb,
  -- TSS / Social security configuration (SFS, AFP, SRL, INFOTEP, salary ceilings, etc.)
  tss_rates jsonb not null default '{}'::jsonb,
  other_tax_rates jsonb not null default '{}'::jsonb,
  -- Other general fiscal params
  fiscal_year_start integer not null default 1,
  auto_generate_ncf boolean not null default true,
  ncf_validation boolean not null default true,
  report_frequency text not null default 'monthly',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tax_configuration_user
  on public.tax_configuration(user_id);
