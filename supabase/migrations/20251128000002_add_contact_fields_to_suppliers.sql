-- Add contact and extra info fields to suppliers (persona de contacto, fax, website)

alter table public.suppliers
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists fax text,
  add column if not exists website text;
