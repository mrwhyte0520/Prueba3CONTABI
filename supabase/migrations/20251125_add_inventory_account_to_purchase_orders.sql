-- Add inventory_account_id to purchase_orders so each PO can specify a single inventory account
alter table if exists public.purchase_orders
  add column if not exists inventory_account_id uuid references public.chart_accounts(id);
