-- Inventory cost revaluations (average cost adjustments per item)

create table if not exists public.inventory_cost_revaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  revaluation_date date not null default current_date,
  description text,
  status text not null default 'draft', -- draft | posted | cancelled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_cost_revaluation_lines (
  id uuid primary key default gen_random_uuid(),
  revaluation_id uuid not null references public.inventory_cost_revaluations(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id),
  warehouse_id uuid references public.warehouses(id),
  quantity_on_hand numeric(18,4) not null default 0,
  previous_cost numeric(18,4) not null default 0,
  new_cost numeric(18,4) not null default 0,
  unit_difference numeric(18,4) not null default 0,
  total_previous_value numeric(18,4) not null default 0,
  total_new_value numeric(18,4) not null default 0,
  total_difference numeric(18,4) not null default 0,
  notes text
);

create index if not exists idx_inventory_cost_revaluations_user_id on public.inventory_cost_revaluations(user_id);
create index if not exists idx_inventory_cost_revaluation_lines_revaluation_id on public.inventory_cost_revaluation_lines(revaluation_id);
create index if not exists idx_inventory_cost_revaluation_lines_inventory_item_id on public.inventory_cost_revaluation_lines(inventory_item_id);
