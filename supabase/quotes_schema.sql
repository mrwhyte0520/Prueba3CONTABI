-- Quotes module schema for Supabase
-- Run this in Supabase SQL editor

-- Table: quotes
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  customer_id uuid,
  customer_name text,
  customer_email text,
  project text,
  date date not null default now(),
  valid_until date,
  probability int2 default 0 check (probability between 0 and 100),
  amount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','under_review','rejected','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table: quote_lines
create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  price numeric(14,2) not null default 0 check (price >= 0),
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indices
create index if not exists quotes_user_idx on public.quotes(user_id);
create index if not exists quotes_created_idx on public.quotes(created_at desc);
create index if not exists quote_lines_quote_idx on public.quote_lines(quote_id);

-- RLS
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;

-- Policies for quotes
drop policy if exists quotes_select_own on public.quotes;
create policy quotes_select_own on public.quotes
for select using (auth.uid() = user_id);

drop policy if exists quotes_insert_own on public.quotes;
create policy quotes_insert_own on public.quotes
for insert with check (auth.uid() = user_id);

drop policy if exists quotes_update_own on public.quotes;
create policy quotes_update_own on public.quotes
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists quotes_delete_own on public.quotes;
create policy quotes_delete_own on public.quotes
for delete using (auth.uid() = user_id);

-- Policies for quote_lines
drop policy if exists quote_lines_select_by_parent on public.quote_lines;
create policy quote_lines_select_by_parent on public.quote_lines
for select using (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = auth.uid()));

drop policy if exists quote_lines_insert_by_parent on public.quote_lines;
create policy quote_lines_insert_by_parent on public.quote_lines
for insert with check (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = auth.uid()));

drop policy if exists quote_lines_update_by_parent on public.quote_lines;
create policy quote_lines_update_by_parent on public.quote_lines
for update using (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = auth.uid()))
with check (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = auth.uid()));

drop policy if exists quote_lines_delete_by_parent on public.quote_lines;
create policy quote_lines_delete_by_parent on public.quote_lines
for delete using (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = auth.uid()));

-- Triggers: compute line total
create or replace function public.quote_line_set_total()
returns trigger language plpgsql as $$
begin
  new.total := coalesce(new.quantity,0) * coalesce(new.price,0);
  return new;
end $$;

drop trigger if exists trg_quote_line_total on public.quote_lines;
create trigger trg_quote_line_total
before insert or update on public.quote_lines
for each row execute function public.quote_line_set_total();

-- Aggregate totals on parent quote after line changes
create or replace function public.quote_aggregate_totals()
returns trigger language plpgsql as $$
declare
  v_amount numeric(14,2);
  v_tax numeric(14,2);
  v_total numeric(14,2);
begin
  select coalesce(sum(total),0) into v_amount from public.quote_lines where quote_id = coalesce(new.quote_id, old.quote_id);
  v_tax := round(v_amount * 0.18, 2);
  v_total := v_amount + v_tax;
  update public.quotes
    set amount = v_amount,
        tax = v_tax,
        total = v_total,
        updated_at = now()
    where id = coalesce(new.quote_id, old.quote_id);
  return null;
end $$;

drop trigger if exists trg_quote_after_line on public.quote_lines;
create trigger trg_quote_after_line
after insert or update or delete on public.quote_lines
for each row execute function public.quote_aggregate_totals();
