-- Create tables for delivery notes (Conduces)

create table if not exists public.delivery_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  customer_id uuid not null references public.customers(id),
  warehouse_id uuid references public.warehouses(id),
  store_id uuid references public.stores(id),
  sales_rep_id uuid references public.sales_reps(id),
  document_number text,
  status text not null default 'draft', -- draft | posted | invoiced | cancelled
  delivery_date date not null default current_date,
  subtotal numeric,
  discount_total numeric,
  tax_total numeric,
  total_amount numeric,
  currency text,
  exchange_rate numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_note_lines (
  id uuid primary key default gen_random_uuid(),
  delivery_note_id uuid not null references public.delivery_notes(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id),
  description text,
  quantity numeric not null,
  unit_price numeric not null,
  discount_rate numeric,
  discount_amount numeric,
  tax_rate numeric,
  tax_amount numeric,
  line_total numeric,
  invoiced_quantity numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_delivery_notes_user_id on public.delivery_notes(user_id);
create index if not exists idx_delivery_notes_customer_id on public.delivery_notes(customer_id);
create index if not exists idx_delivery_notes_status on public.delivery_notes(status);
create index if not exists idx_delivery_note_lines_delivery_note_id on public.delivery_note_lines(delivery_note_id);
create index if not exists idx_delivery_note_lines_inventory_item_id on public.delivery_note_lines(inventory_item_id);

-- Optional relationship from invoice_lines to delivery notes for traceability
alter table if exists public.invoice_lines
  add column if not exists delivery_note_id uuid references public.delivery_notes(id),
  add column if not exists delivery_note_line_id uuid references public.delivery_note_lines(id);

comment on table public.delivery_notes is 'Conduces / notas de entrega para despacho de mercancías no facturadas.';
comment on table public.delivery_note_lines is 'Líneas de productos despachados en un conduce.';
