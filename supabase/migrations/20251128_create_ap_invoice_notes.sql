-- Notas de Débito / Crédito para facturas de suplidor (AP)

create table if not exists public.ap_invoice_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  ap_invoice_id uuid not null references public.ap_invoices(id) on delete cascade,
  note_type text not null check (note_type in ('debit', 'credit')),
  note_date date not null default current_date,
  currency text not null default 'DOP',
  amount numeric(18,2) not null check (amount > 0),
  account_id uuid references public.chart_accounts(id),
  reason text,
  status text not null default 'posted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ap_invoice_notes is 'Notas de débito/crédito aplicadas a facturas de suplidor (AP)';
comment on column public.ap_invoice_notes.note_type is 'debit = Nota de Débito (aumenta saldo), credit = Nota de Crédito (disminuye saldo)';
