-- Add store/sucursal field to sales invoices (AR)

alter table public.invoices
  add column if not exists store_name text;

comment on column public.invoices.store_name is 'Nombre de la tienda o sucursal donde se emite la factura de venta';
