-- Add global discount fields to sales quotes (AR)

alter table public.quotes
  add column if not exists discount_type text check (discount_type in ('percentage', 'fixed', null)),
  add column if not exists discount_value numeric(18,2) default 0,
  add column if not exists total_discount numeric(18,2) default 0;

comment on column public.quotes.discount_type is 'Tipo de descuento global en la cotización: percentage (%) o fixed (monto fijo)';
comment on column public.quotes.discount_value is 'Valor del descuento global (porcentaje o monto según discount_type) en la cotización';
comment on column public.quotes.total_discount is 'Monto total del descuento global aplicado a la cotización';
