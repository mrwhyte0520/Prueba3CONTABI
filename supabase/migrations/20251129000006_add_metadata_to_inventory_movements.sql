-- Add metadata columns to inventory_movements for reporting

alter table public.inventory_movements
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists source_number text,
  add column if not exists store_id uuid references public.stores(id),
  add column if not exists from_warehouse_id uuid references public.warehouses(id),
  add column if not exists to_warehouse_id uuid references public.warehouses(id);

create index if not exists idx_inventory_movements_source_type on public.inventory_movements(source_type);
create index if not exists idx_inventory_movements_store_id on public.inventory_movements(store_id);
