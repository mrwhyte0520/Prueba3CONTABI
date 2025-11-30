-- Inventory physical counts (stocktaking sessions)

create table if not exists public.inventory_physical_counts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  warehouse_id uuid references public.warehouses(id),
  count_date date not null default current_date,
  description text,
  status text not null default 'draft', -- draft | posted | cancelled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_physical_count_lines (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.inventory_physical_counts(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id),
  warehouse_id uuid references public.warehouses(id),
  theoretical_qty numeric(18,4) not null default 0,
  counted_qty numeric(18,4) not null default 0,
  difference_qty numeric(18,4) not null default 0,
  unit_cost numeric(18,4),
  total_theoretical_cost numeric(18,4),
  total_counted_cost numeric(18,4),
  cost_difference numeric(18,4),
  notes text
);

create index if not exists idx_inventory_physical_counts_user_id on public.inventory_physical_counts(user_id);
create index if not exists idx_inventory_physical_counts_warehouse_id on public.inventory_physical_counts(warehouse_id);
create index if not exists idx_inventory_physical_count_lines_count_id on public.inventory_physical_count_lines(count_id);
create index if not exists idx_inventory_physical_count_lines_inventory_item_id on public.inventory_physical_count_lines(inventory_item_id);
