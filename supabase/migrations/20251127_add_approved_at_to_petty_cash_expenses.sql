-- Add approved_at column to petty_cash_expenses to track approval time

alter table public.petty_cash_expenses
  add column if not exists approved_at timestamptz;
