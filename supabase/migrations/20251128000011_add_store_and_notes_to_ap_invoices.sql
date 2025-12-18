-- Add store and notes fields to AP invoices header

alter table public.ap_invoices
  add column if not exists store_name text,
  add column if not exists notes text;
