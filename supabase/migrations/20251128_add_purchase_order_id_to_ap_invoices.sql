-- Link AP invoices to purchase orders (optional reference)

alter table public.ap_invoices
  add column if not exists purchase_order_id uuid references public.purchase_orders(id);

comment on column public.ap_invoices.purchase_order_id is 'Referencia opcional a la orden de compra de origen';
