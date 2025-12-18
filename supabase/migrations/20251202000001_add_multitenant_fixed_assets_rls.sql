-- Multi-tenant RLS for fixed assets tables

-- Helper function must already exist:
-- public.has_tenant_access(target_user_id uuid)

-- Fixed Assets (Registro de activos)
alter table public.fixed_assets enable row level security;

drop policy if exists "fixed_assets_select" on public.fixed_assets;
drop policy if exists "fixed_assets_write" on public.fixed_assets;

create policy "fixed_assets_select" on public.fixed_assets
for select
using ( public.has_tenant_access(user_id) );

create policy "fixed_assets_write" on public.fixed_assets
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Fixed Asset Types (Tipos de activos)
alter table public.fixed_asset_types enable row level security;

drop policy if exists "fixed_asset_types_select" on public.fixed_asset_types;
drop policy if exists "fixed_asset_types_write" on public.fixed_asset_types;

create policy "fixed_asset_types_select" on public.fixed_asset_types
for select
using ( public.has_tenant_access(user_id) );

create policy "fixed_asset_types_write" on public.fixed_asset_types
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Fixed Asset Disposals (Bajas de activos)
alter table public.fixed_asset_disposals enable row level security;

drop policy if exists "fixed_asset_disposals_select" on public.fixed_asset_disposals;
drop policy if exists "fixed_asset_disposals_write" on public.fixed_asset_disposals;

create policy "fixed_asset_disposals_select" on public.fixed_asset_disposals
for select
using ( public.has_tenant_access(user_id) );

create policy "fixed_asset_disposals_write" on public.fixed_asset_disposals
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Fixed Asset Depreciation Types (Tipos de depreciación)
alter table public.fixed_asset_depreciation_types enable row level security;

drop policy if exists "fixed_asset_depreciation_types_select" on public.fixed_asset_depreciation_types;
drop policy if exists "fixed_asset_depreciation_types_write" on public.fixed_asset_depreciation_types;

create policy "fixed_asset_depreciation_types_select" on public.fixed_asset_depreciation_types
for select
using ( public.has_tenant_access(user_id) );

create policy "fixed_asset_depreciation_types_write" on public.fixed_asset_depreciation_types
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Fixed Asset Depreciations (Depreciaciones)
alter table public.fixed_asset_depreciations enable row level security;

drop policy if exists "fixed_asset_depreciations_select" on public.fixed_asset_depreciations;
drop policy if exists "fixed_asset_depreciations_write" on public.fixed_asset_depreciations;

create policy "fixed_asset_depreciations_select" on public.fixed_asset_depreciations
for select
using ( public.has_tenant_access(user_id) );

create policy "fixed_asset_depreciations_write" on public.fixed_asset_depreciations
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Fixed Asset Revaluations (Revaluaciones)
alter table public.fixed_asset_revaluations enable row level security;

drop policy if exists "fixed_asset_revaluations_select" on public.fixed_asset_revaluations;
drop policy if exists "fixed_asset_revaluations_write" on public.fixed_asset_revaluations;

create policy "fixed_asset_revaluations_select" on public.fixed_asset_revaluations
for select
using ( public.has_tenant_access(user_id) );

create policy "fixed_asset_revaluations_write" on public.fixed_asset_revaluations
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );
