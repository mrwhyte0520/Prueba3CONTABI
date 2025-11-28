-- Add store/sucursal, sales rep and notes fields to sales quotes (AR)

alter table public.quotes
  add column if not exists store_name text,
  add column if not exists sales_rep_id uuid references public.sales_reps(id),
  add column if not exists notes text;

comment on column public.quotes.store_name is 'Nombre de la tienda o sucursal donde se emite la cotización de venta';
comment on column public.quotes.sales_rep_id is 'Vendedor asociado a la cotización de venta';
comment on column public.quotes.notes is 'Notas o términos y condiciones de la cotización de venta';
