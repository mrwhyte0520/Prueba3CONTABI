-- Add default inventory accounts to accounting_settings

alter table if exists public.accounting_settings
  add column if not exists default_inventory_asset_account_id uuid references public.chart_accounts(id),
  add column if not exists default_inventory_income_account_id uuid references public.chart_accounts(id),
  add column if not exists default_inventory_cogs_account_id uuid references public.chart_accounts(id);
