-- Agregar columna de moneda a las cotizaciones de ventas
alter table if exists public.quotes
  add column if not exists currency text;

comment on column public.quotes.currency is
  'Código de moneda (ej. DOP, USD, EUR) en la que se emite la cotización';
