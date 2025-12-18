-- Add contact fields to customers for persona de contacto

alter table public.customers
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text;
