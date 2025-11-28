-- Add document_type column to customers (tipo de documento del cliente)

alter table public.customers
  add column if not exists document_type text;
