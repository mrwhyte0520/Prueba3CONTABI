-- =====================================================
-- Multi-tenant RLS for Quotes and Credit/Debit Notes (CxC)
-- Date: 2025-12-10
-- Description: Row Level Security policies for quotes, quote_lines and
--              credit_debit_notes using public.has_tenant_access
-- =====================================================

-- Helper function must already exist:
-- public.has_tenant_access(target_user_id uuid)

-- =====================================================
-- CREDIT / DEBIT NOTES
-- =====================================================

alter table public.credit_debit_notes enable row level security;

drop policy if exists "credit_debit_notes_select" on public.credit_debit_notes;
drop policy if exists "credit_debit_notes_write" on public.credit_debit_notes;

create policy "credit_debit_notes_select" on public.credit_debit_notes
for select
using ( public.has_tenant_access(user_id) );

create policy "credit_debit_notes_write" on public.credit_debit_notes
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

create index if not exists idx_credit_debit_notes_user_id
  on public.credit_debit_notes(user_id);

-- =====================================================
-- QUOTES (Cotizaciones de Ventas - CxC)
-- =====================================================

alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;

-- Eliminar políticas anteriores basadas en auth.uid()

drop policy if exists quotes_select_own on public.quotes;
drop policy if exists quotes_insert_own on public.quotes;
drop policy if exists quotes_update_own on public.quotes;
drop policy if exists quotes_delete_own on public.quotes;

drop policy if exists quote_lines_select_by_parent on public.quote_lines;
drop policy if exists quote_lines_insert_by_parent on public.quote_lines;
drop policy if exists quote_lines_update_by_parent on public.quote_lines;
drop policy if exists quote_lines_delete_by_parent on public.quote_lines;

-- Políticas multi-tenant basadas en public.has_tenant_access

create policy "quotes_select" on public.quotes
for select
using ( public.has_tenant_access(user_id) );

create policy "quotes_write" on public.quotes
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

create policy "quote_lines_select" on public.quote_lines
for select
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_lines.quote_id
      and public.has_tenant_access(q.user_id)
  )
);

create policy "quote_lines_write" on public.quote_lines
for all
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_lines.quote_id
      and public.has_tenant_access(q.user_id)
  )
)
with check (
  exists (
    select 1 from public.quotes q
    where q.id = quote_lines.quote_id
      and public.has_tenant_access(q.user_id)
  )
);

create index if not exists quotes_user_idx on public.quotes(user_id);
create index if not exists quote_lines_quote_idx on public.quote_lines(quote_id);
