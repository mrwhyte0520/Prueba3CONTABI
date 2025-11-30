-- Add default accounts per item type to inventory_settings

alter table if exists public.inventory_settings
  add column if not exists default_inventory_inventory_account_id uuid references public.chart_accounts(id),
  add column if not exists default_inventory_income_account_id uuid references public.chart_accounts(id),
  add column if not exists default_inventory_cogs_account_id uuid references public.chart_accounts(id),
  add column if not exists default_service_income_account_id uuid references public.chart_accounts(id),
  add column if not exists default_fixed_asset_account_id uuid references public.chart_accounts(id);
