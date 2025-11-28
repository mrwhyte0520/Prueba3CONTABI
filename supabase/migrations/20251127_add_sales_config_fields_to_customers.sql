-- Add sales configuration fields to customers (payment terms, invoice type, NCF type)

alter table public.customers
  add column if not exists payment_terms text,
  add column if not exists invoice_type text,
  add column if not exists ncf_type text;
