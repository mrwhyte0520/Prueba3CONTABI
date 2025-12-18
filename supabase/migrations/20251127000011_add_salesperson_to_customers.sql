-- Add salesperson column to customers (nombre libre del vendedor asignado)

alter table public.customers
  add column if not exists salesperson text;
