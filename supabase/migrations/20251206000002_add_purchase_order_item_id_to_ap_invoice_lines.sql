-- Link AP invoice lines to purchase order items for partial conversion control

alter table if exists public.ap_invoice_lines
  add column if not exists purchase_order_item_id uuid
    references public.purchase_order_items(id)
    on delete set null;

create index if not exists idx_ap_invoice_lines_po_item_id
  on public.ap_invoice_lines(purchase_order_item_id);
