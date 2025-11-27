-- Agregar columna para guardar el código de la cuenta contable de contrapartida de los créditos bancarios
alter table if exists public.bank_credits
  add column if not exists loan_account_code text;

comment on column public.bank_credits.loan_account_code is
  'Código de la cuenta contable de contrapartida (pasivo o general) asociado al crédito bancario';
