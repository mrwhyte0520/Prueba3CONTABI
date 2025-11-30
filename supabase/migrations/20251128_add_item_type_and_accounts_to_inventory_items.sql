-- Add item type, income/asset accounts and commission flag to inventory_items

alter table public.inventory_items
  add column if not exists item_type text not null default 'inventory',
  add column if not exists income_account_id uuid references public.chart_accounts(id),
  add column if not exists asset_account_id uuid references public.chart_accounts(id),
  add column if not exists is_commissionable boolean not null default true;

create index if not exists idx_inventory_items_item_type on public.inventory_items(item_type);
create index if not exists idx_inventory_items_income_account_id on public.inventory_items(income_account_id);
create index if not exists idx_inventory_items_asset_account_id on public.inventory_items(asset_account_id);
