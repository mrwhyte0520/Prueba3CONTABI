-- Warehouse entries (manual warehouse receipts)

create table if not exists public.warehouse_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id),
  source_type text, -- conduce_suplidor | devolucion_cliente | otros
  related_invoice_id uuid references public.invoices(id),
  related_delivery_note_id uuid references public.delivery_notes(id),
  issuer_name text, -- nombre del emisor del documento recibido
  document_number text,
  document_date date,
  description text,
  status text not null default 'draft', -- draft | posted | cancelled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.warehouse_entry_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.warehouse_entries(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id),
  quantity numeric(18,4) not null,
  unit_cost numeric(18,4),
  notes text
);

create index if not exists idx_warehouse_entries_user_id on public.warehouse_entries(user_id);
create index if not exists idx_warehouse_entries_warehouse_id on public.warehouse_entries(warehouse_id);
create index if not exists idx_warehouse_entry_lines_entry_id on public.warehouse_entry_lines(entry_id);
