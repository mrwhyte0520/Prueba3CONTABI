-- Add ITBIS withheld tracking to AP invoices

alter table public.ap_invoices
  add column if not exists total_itbis_withheld numeric(18,2) default 0;

comment on column public.ap_invoices.total_itbis_withheld is 'Monto total de ITBIS retenido al suplidor en esta factura';
