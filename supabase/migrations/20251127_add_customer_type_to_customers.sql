-- Add customer_type column to customers to link with customer_types catalog

alter table public.customers
  add column if not exists customer_type text;
