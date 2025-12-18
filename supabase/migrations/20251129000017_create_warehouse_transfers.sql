-- Warehouse transfers (warehouse to warehouse movements)

create table if not exists public.warehouse_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_warehouse_id uuid not null references public.warehouses(id),
  to_warehouse_id uuid not null references public.warehouses(id),
  document_number text,
  transfer_date date not null default current_date,
  description text,
  status text not null default 'draft', -- draft | posted | cancelled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.warehouse_transfer_lines (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.warehouse_transfers(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id),
  quantity numeric(18,4) not null,
  notes text
);

create index if not exists idx_warehouse_transfers_user_id on public.warehouse_transfers(user_id);
create index if not exists idx_warehouse_transfers_from_warehouse_id on public.warehouse_transfers(from_warehouse_id);
create index if not exists idx_warehouse_transfers_to_warehouse_id on public.warehouse_transfers(to_warehouse_id);
create index if not exists idx_warehouse_transfer_lines_transfer_id on public.warehouse_transfer_lines(transfer_id);
