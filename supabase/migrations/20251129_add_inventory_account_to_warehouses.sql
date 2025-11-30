-- Add inventory account to warehouses

alter table public.warehouses
  add column if not exists inventory_account_id uuid references public.chart_accounts(id);

create index if not exists idx_warehouses_inventory_account_id
  on public.warehouses(inventory_account_id);

comment on column public.warehouses.inventory_account_id is 'Cuenta contable principal para el inventario de este almacén';
