-- Add discount fields to sales invoices (AR)

alter table public.invoices
  add column if not exists discount_type text check (discount_type in ('percentage', 'fixed', null)),
  add column if not exists discount_value numeric(18,2) default 0,
  add column if not exists total_discount numeric(18,2) default 0;

comment on column public.invoices.discount_type is 'Tipo de descuento global: percentage (%) o fixed (monto fijo)';
comment on column public.invoices.discount_value is 'Valor del descuento global (porcentaje o monto según discount_type)';
comment on column public.invoices.total_discount is 'Monto total del descuento global aplicado a la factura';
