-- Add discount fields and ITBIS to cost option to AP invoices

alter table public.ap_invoices
  add column if not exists discount_type text check (discount_type in ('percentage', 'fixed', null)),
  add column if not exists discount_value numeric(18,2) default 0,
  add column if not exists total_discount numeric(18,2) default 0,
  add column if not exists itbis_to_cost boolean default false;

comment on column public.ap_invoices.discount_type is 'Tipo de descuento: percentage (%) o fixed (monto fijo)';
comment on column public.ap_invoices.discount_value is 'Valor del descuento (porcentaje o monto según discount_type)';
comment on column public.ap_invoices.total_discount is 'Monto total del descuento aplicado';
comment on column public.ap_invoices.itbis_to_cost is 'Si true, el ITBIS se lleva al costo en vez de crédito fiscal';

-- Add discount and inventory fields to AP invoice lines
alter table public.ap_invoice_lines
  add column if not exists inventory_item_id uuid references public.inventory_items(id),
  add column if not exists discount_percentage numeric(8,2) default 0,
  add column if not exists discount_amount numeric(18,2) default 0;

comment on column public.ap_invoice_lines.inventory_item_id is 'Referencia opcional al ítem de inventario';
comment on column public.ap_invoice_lines.discount_percentage is 'Porcentaje de descuento aplicado a esta línea';
comment on column public.ap_invoice_lines.discount_amount is 'Monto de descuento aplicado a esta línea';
