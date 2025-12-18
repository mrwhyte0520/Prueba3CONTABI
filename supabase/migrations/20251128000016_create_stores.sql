-- Create stores/branches table for multi-location businesses

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  code text,
  address text,
  city text,
  phone text,
  email text,
  manager_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stores_user_id on public.stores(user_id);
create index if not exists idx_stores_code on public.stores(code);

comment on table public.stores is 'Tiendas/sucursales para empresas con múltiples ubicaciones';
comment on column public.stores.name is 'Nombre de la tienda o sucursal';
comment on column public.stores.code is 'Código único de la tienda';
comment on column public.stores.address is 'Dirección completa de la tienda';
comment on column public.stores.manager_name is 'Nombre del gerente o responsable';

-- Add store_id foreign key to invoices (replacing store_name)
alter table public.invoices
  add column if not exists store_id uuid references public.stores(id);

comment on column public.invoices.store_id is 'Tienda/sucursal donde se emite la factura';

-- Add store_id foreign key to quotes (replacing store_name)
alter table public.quotes
  add column if not exists store_id uuid references public.stores(id);

comment on column public.quotes.store_id is 'Tienda/sucursal donde se emite la cotización';

-- Add store_id foreign key to ap_invoices (replacing store_name)
alter table public.ap_invoices
  add column if not exists store_id uuid references public.stores(id);

comment on column public.ap_invoices.store_id is 'Tienda/sucursal asociada a la factura de compra';
