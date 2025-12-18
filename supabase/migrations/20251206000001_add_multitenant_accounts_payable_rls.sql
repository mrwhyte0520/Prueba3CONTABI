-- =====================================================
-- Multi-tenant RLS for Accounts Payable (CxP) Module
-- Date: 2024-12-06
-- Description: Row Level Security policies for suppliers, AP invoices, payments,
--              and purchase orders using public.has_tenant_access
-- =====================================================

-- Helper function must already exist:
-- public.has_tenant_access(target_user_id uuid)

-- =====================================================
-- SUPPLIERS (Proveedores)
-- =====================================================
alter table public.suppliers enable row level security;

drop policy if exists "suppliers_select" on public.suppliers;
drop policy if exists "suppliers_write" on public.suppliers;

create policy "suppliers_select" on public.suppliers
for select
using ( public.has_tenant_access(user_id) );

create policy "suppliers_write" on public.suppliers
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- AP INVOICES (Facturas de Proveedores / CxP)
-- =====================================================
alter table public.ap_invoices enable row level security;

drop policy if exists "ap_invoices_select" on public.ap_invoices;
drop policy if exists "ap_invoices_write" on public.ap_invoices;

create policy "ap_invoices_select" on public.ap_invoices
for select
using ( public.has_tenant_access(user_id) );

create policy "ap_invoices_write" on public.ap_invoices
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- AP INVOICE LINES (Líneas de Facturas CxP)
-- =====================================================
alter table public.ap_invoice_lines enable row level security;

drop policy if exists "ap_invoice_lines_select" on public.ap_invoice_lines;
drop policy if exists "ap_invoice_lines_write" on public.ap_invoice_lines;

create policy "ap_invoice_lines_select" on public.ap_invoice_lines
for select
using (
  exists (
    select 1 from public.ap_invoices api
    where api.id = ap_invoice_lines.ap_invoice_id
      and public.has_tenant_access(api.user_id)
  )
);

create policy "ap_invoice_lines_write" on public.ap_invoice_lines
for all
using (
  exists (
    select 1 from public.ap_invoices api
    where api.id = ap_invoice_lines.ap_invoice_id
      and public.has_tenant_access(api.user_id)
  )
)
with check (
  exists (
    select 1 from public.ap_invoices api
    where api.id = ap_invoice_lines.ap_invoice_id
      and public.has_tenant_access(api.user_id)
  )
);

-- =====================================================
-- AP INVOICE NOTES (Notas de Crédito CxP)
-- =====================================================
alter table public.ap_invoice_notes enable row level security;

drop policy if exists "ap_invoice_notes_select" on public.ap_invoice_notes;
drop policy if exists "ap_invoice_notes_write" on public.ap_invoice_notes;

create policy "ap_invoice_notes_select" on public.ap_invoice_notes
for select
using ( public.has_tenant_access(user_id) );

create policy "ap_invoice_notes_write" on public.ap_invoice_notes
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- SUPPLIER PAYMENTS (Pagos a Proveedores)
-- =====================================================
alter table public.supplier_payments enable row level security;

drop policy if exists "supplier_payments_select" on public.supplier_payments;
drop policy if exists "supplier_payments_write" on public.supplier_payments;

create policy "supplier_payments_select" on public.supplier_payments
for select
using ( public.has_tenant_access(user_id) );

create policy "supplier_payments_write" on public.supplier_payments
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- SUPPLIER ADVANCES (Anticipos a Proveedores)
-- =====================================================
alter table public.ap_supplier_advances enable row level security;

drop policy if exists "supplier_advances_select" on public.ap_supplier_advances;
drop policy if exists "supplier_advances_write" on public.ap_supplier_advances;

create policy "supplier_advances_select" on public.ap_supplier_advances
for select
using ( public.has_tenant_access(user_id) );

create policy "supplier_advances_write" on public.ap_supplier_advances
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- PURCHASE ORDERS (Órdenes de Compra)
-- =====================================================
alter table public.purchase_orders enable row level security;

drop policy if exists "purchase_orders_select" on public.purchase_orders;
drop policy if exists "purchase_orders_write" on public.purchase_orders;

create policy "purchase_orders_select" on public.purchase_orders
for select
using ( public.has_tenant_access(user_id) );

create policy "purchase_orders_write" on public.purchase_orders
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- PURCHASE ORDER ITEMS (Líneas de Órdenes de Compra)
-- =====================================================
alter table public.purchase_order_items enable row level security;

drop policy if exists "purchase_order_items_select" on public.purchase_order_items;
drop policy if exists "purchase_order_items_write" on public.purchase_order_items;

create policy "purchase_order_items_select" on public.purchase_order_items
for select
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and public.has_tenant_access(po.user_id)
  )
);

create policy "purchase_order_items_write" on public.purchase_order_items
for all
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and public.has_tenant_access(po.user_id)
  )
)
with check (
  exists (
    select 1 from public.purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and public.has_tenant_access(po.user_id)
  )
);

-- =====================================================
-- SUPPLIER TYPES (Tipos de Proveedor)
-- =====================================================
alter table public.supplier_types enable row level security;

drop policy if exists "supplier_types_select" on public.supplier_types;
drop policy if exists "supplier_types_write" on public.supplier_types;

create policy "supplier_types_select" on public.supplier_types
for select
using ( public.has_tenant_access(user_id) );

create policy "supplier_types_write" on public.supplier_types
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
create index if not exists idx_suppliers_user_id on public.suppliers(user_id);
create index if not exists idx_ap_invoices_user_id on public.ap_invoices(user_id);
create index if not exists idx_ap_invoices_supplier_id on public.ap_invoices(supplier_id);
create index if not exists idx_ap_invoice_lines_ap_invoice_id on public.ap_invoice_lines(ap_invoice_id);
create index if not exists idx_ap_invoice_notes_user_id on public.ap_invoice_notes(user_id);
create index if not exists idx_supplier_payments_user_id on public.supplier_payments(user_id);
create index if not exists idx_supplier_payments_supplier_id on public.supplier_payments(supplier_id);
create index if not exists idx_supplier_advances_user_id on public.ap_supplier_advances(user_id);
create index if not exists idx_supplier_advances_supplier_id on public.ap_supplier_advances(supplier_id);
create index if not exists idx_purchase_orders_user_id on public.purchase_orders(user_id);
create index if not exists idx_purchase_orders_supplier_id on public.purchase_orders(supplier_id);
create index if not exists idx_purchase_order_items_purchase_order_id on public.purchase_order_items(purchase_order_id);
create index if not exists idx_supplier_types_user_id on public.supplier_types(user_id);

-- =====================================================
-- COMMENTS
-- =====================================================
comment on policy "suppliers_select" on public.suppliers is
  'Multi-tenant: Users can only view suppliers for their tenant (owner or sub-user)';

comment on policy "ap_invoices_select" on public.ap_invoices is
  'Multi-tenant: Users can only view AP invoices for their tenant (owner or sub-user)';

comment on policy "ap_invoice_lines_select" on public.ap_invoice_lines is
  'Multi-tenant: Users can only view AP invoice lines belonging to their tenant invoices';

comment on policy "ap_invoice_notes_select" on public.ap_invoice_notes is
  'Multi-tenant: Users can only view AP invoice notes for their tenant (owner or sub-user)';

comment on policy "supplier_payments_select" on public.supplier_payments is
  'Multi-tenant: Users can only view supplier payments for their tenant (owner or sub-user)';

comment on policy "supplier_advances_select" on public.ap_supplier_advances is
  'Multi-tenant: Users can only view supplier advances for their tenant (owner or sub-user)';

comment on policy "purchase_orders_select" on public.purchase_orders is
  'Multi-tenant: Users can only view purchase orders for their tenant (owner or sub-user)';

comment on policy "purchase_order_items_select" on public.purchase_order_items is
  'Multi-tenant: Users can only view purchase order items belonging to their tenant orders';

comment on policy "supplier_types_select" on public.supplier_types is
  'Multi-tenant: Users can only view supplier types for their tenant (owner or sub-user)';
