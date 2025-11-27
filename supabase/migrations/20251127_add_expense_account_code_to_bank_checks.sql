-- Add expense_account_code column to bank_checks for linking checks to expense/AP accounts by code
ALTER TABLE public.bank_checks
ADD COLUMN IF NOT EXISTS expense_account_code text;
