-- =====================================================
-- Multi-tenant RLS for Inventory and Location Tables
-- Date: 2024-12-01
-- Description: Row Level Security policies for stores, warehouses, inventory,
--              warehouse entries, and delivery notes using public.has_tenant_access
-- =====================================================

-- Helper function must already exist:
-- public.has_tenant_access(target_user_id uuid)

-- =====================================================
-- STORES (Tiendas/Sucursales)
-- =====================================================
alter table public.stores enable row level security;

drop policy if exists "stores_select" on public.stores;
drop policy if exists "stores_write" on public.stores;

create policy "stores_select" on public.stores
for select
using ( public.has_tenant_access(user_id) );

create policy "stores_write" on public.stores
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- WAREHOUSES (Almacenes)
-- =====================================================
alter table public.warehouses enable row level security;

drop policy if exists "warehouses_select" on public.warehouses;
drop policy if exists "warehouses_write" on public.warehouses;

create policy "warehouses_select" on public.warehouses
for select
using ( public.has_tenant_access(user_id) );

create policy "warehouses_write" on public.warehouses
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- INVENTORY ITEMS
-- =====================================================
alter table public.inventory_items enable row level security;

drop policy if exists "inventory_items_select" on public.inventory_items;
drop policy if exists "inventory_items_write" on public.inventory_items;

create policy "inventory_items_select" on public.inventory_items
for select
using ( public.has_tenant_access(user_id) );

create policy "inventory_items_write" on public.inventory_items
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- INVENTORY MOVEMENTS
-- =====================================================
alter table public.inventory_movements enable row level security;

drop policy if exists "inventory_movements_select" on public.inventory_movements;
drop policy if exists "inventory_movements_write" on public.inventory_movements;

create policy "inventory_movements_select" on public.inventory_movements
for select
using ( public.has_tenant_access(user_id) );

create policy "inventory_movements_write" on public.inventory_movements
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- WAREHOUSE ENTRIES (Entradas a Almacén)
-- =====================================================
alter table public.warehouse_entries enable row level security;

drop policy if exists "warehouse_entries_select" on public.warehouse_entries;
drop policy if exists "warehouse_entries_write" on public.warehouse_entries;

create policy "warehouse_entries_select" on public.warehouse_entries
for select
using ( public.has_tenant_access(user_id) );

create policy "warehouse_entries_write" on public.warehouse_entries
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- WAREHOUSE ENTRY LINES
-- =====================================================
alter table public.warehouse_entry_lines enable row level security;

drop policy if exists "warehouse_entry_lines_select" on public.warehouse_entry_lines;
drop policy if exists "warehouse_entry_lines_write" on public.warehouse_entry_lines;

create policy "warehouse_entry_lines_select" on public.warehouse_entry_lines
for select
using (
  exists (
    select 1 from public.warehouse_entries we
    where we.id = warehouse_entry_lines.entry_id
      and public.has_tenant_access(we.user_id)
  )
);

create policy "warehouse_entry_lines_write" on public.warehouse_entry_lines
for all
using (
  exists (
    select 1 from public.warehouse_entries we
    where we.id = warehouse_entry_lines.entry_id
      and public.has_tenant_access(we.user_id)
  )
)
with check (
  exists (
    select 1 from public.warehouse_entries we
    where we.id = warehouse_entry_lines.entry_id
      and public.has_tenant_access(we.user_id)
  )
);

-- =====================================================
-- DELIVERY NOTES (Conduces)
-- =====================================================
alter table public.delivery_notes enable row level security;

drop policy if exists "delivery_notes_select" on public.delivery_notes;
drop policy if exists "delivery_notes_write" on public.delivery_notes;

create policy "delivery_notes_select" on public.delivery_notes
for select
using ( public.has_tenant_access(user_id) );

create policy "delivery_notes_write" on public.delivery_notes
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- DELIVERY NOTE LINES
-- =====================================================
alter table public.delivery_note_lines enable row level security;

drop policy if exists "delivery_note_lines_select" on public.delivery_note_lines;
drop policy if exists "delivery_note_lines_write" on public.delivery_note_lines;

create policy "delivery_note_lines_select" on public.delivery_note_lines
for select
using (
  exists (
    select 1 from public.delivery_notes dn
    where dn.id = delivery_note_lines.delivery_note_id
      and public.has_tenant_access(dn.user_id)
  )
);

create policy "delivery_note_lines_write" on public.delivery_note_lines
for all
using (
  exists (
    select 1 from public.delivery_notes dn
    where dn.id = delivery_note_lines.delivery_note_id
      and public.has_tenant_access(dn.user_id)
  )
)
with check (
  exists (
    select 1 from public.delivery_notes dn
    where dn.id = delivery_note_lines.delivery_note_id
      and public.has_tenant_access(dn.user_id)
  )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
create index if not exists idx_stores_user_id on public.stores(user_id);
create index if not exists idx_warehouses_user_id on public.warehouses(user_id);
create index if not exists idx_inventory_items_user_id on public.inventory_items(user_id);
create index if not exists idx_inventory_movements_user_id on public.inventory_movements(user_id);
create index if not exists idx_warehouse_entries_user_id on public.warehouse_entries(user_id);
create index if not exists idx_warehouse_entry_lines_entry_id on public.warehouse_entry_lines(entry_id);
create index if not exists idx_delivery_notes_user_id on public.delivery_notes(user_id);
create index if not exists idx_delivery_note_lines_delivery_note_id on public.delivery_note_lines(delivery_note_id);

-- =====================================================
-- COMMENTS
-- =====================================================
comment on policy "stores_select" on public.stores is
  'Multi-tenant: Users can only view stores for their tenant (owner or sub-user)';

comment on policy "warehouses_select" on public.warehouses is
  'Multi-tenant: Users can only view warehouses for their tenant (owner or sub-user)';

comment on policy "inventory_items_select" on public.inventory_items is
  'Multi-tenant: Users can only view inventory items for their tenant (owner or sub-user)';

comment on policy "inventory_movements_select" on public.inventory_movements is
  'Multi-tenant: Users can only view inventory movements for their tenant (owner or sub-user)';

comment on policy "warehouse_entries_select" on public.warehouse_entries is
  'Multi-tenant: Users can only view warehouse entries for their tenant (owner or sub-user)';

comment on policy "warehouse_entry_lines_select" on public.warehouse_entry_lines is
  'Multi-tenant: Users can only view warehouse entry lines belonging to their tenant entries';

comment on policy "delivery_notes_select" on public.delivery_notes is
  'Multi-tenant: Users can only view delivery notes for their tenant (owner or sub-user)';

comment on policy "delivery_note_lines_select" on public.delivery_note_lines is
  'Multi-tenant: Users can only view delivery note lines belonging to their tenant notes';
