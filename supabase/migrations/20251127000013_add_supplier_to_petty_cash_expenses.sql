-- Add supplier information to petty_cash_expenses for petty cash expenses with NCF
-- This allows reporting these expenses properly in Report 606.

alter table public.petty_cash_expenses
  add column if not exists supplier_tax_id text,
  add column if not exists supplier_name text;
