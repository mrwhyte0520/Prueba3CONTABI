-- =====================================================
-- Multi-tenant RLS for Accounts Receivable (CxC) Module
-- Date: 2024-12-05
-- Description: Row Level Security policies for customers, invoices, receipts,
--              and related AR tables using public.has_tenant_access
-- =====================================================

-- Helper function must already exist:
-- public.has_tenant_access(target_user_id uuid)

-- =====================================================
-- CUSTOMERS
-- =====================================================
alter table public.customers enable row level security;

drop policy if exists "customers_select" on public.customers;
drop policy if exists "customers_write" on public.customers;

create policy "customers_select" on public.customers
for select
using ( public.has_tenant_access(user_id) );

create policy "customers_write" on public.customers
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- INVOICES (Facturas de Venta / CxC)
-- =====================================================
alter table public.invoices enable row level security;

drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_write" on public.invoices;

create policy "invoices_select" on public.invoices
for select
using ( public.has_tenant_access(user_id) );

create policy "invoices_write" on public.invoices
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- INVOICE LINES
-- =====================================================
alter table public.invoice_lines enable row level security;

drop policy if exists "invoice_lines_select" on public.invoice_lines;
drop policy if exists "invoice_lines_write" on public.invoice_lines;

create policy "invoice_lines_select" on public.invoice_lines
for select
using (
  exists (
    select 1 from public.invoices inv
    where inv.id = invoice_lines.invoice_id
      and public.has_tenant_access(inv.user_id)
  )
);

create policy "invoice_lines_write" on public.invoice_lines
for all
using (
  exists (
    select 1 from public.invoices inv
    where inv.id = invoice_lines.invoice_id
      and public.has_tenant_access(inv.user_id)
  )
)
with check (
  exists (
    select 1 from public.invoices inv
    where inv.id = invoice_lines.invoice_id
      and public.has_tenant_access(inv.user_id)
  )
);

-- =====================================================
-- RECEIPTS (Recibos de Cobro)
-- =====================================================
alter table public.receipts enable row level security;

drop policy if exists "receipts_select" on public.receipts;
drop policy if exists "receipts_write" on public.receipts;

create policy "receipts_select" on public.receipts
for select
using ( public.has_tenant_access(user_id) );

create policy "receipts_write" on public.receipts
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- RECEIPT APPLICATIONS (Aplicación de Recibos a Facturas)
-- =====================================================
alter table public.receipt_applications enable row level security;

drop policy if exists "receipt_applications_select" on public.receipt_applications;
drop policy if exists "receipt_applications_write" on public.receipt_applications;

create policy "receipt_applications_select" on public.receipt_applications
for select
using ( public.has_tenant_access(user_id) );

create policy "receipt_applications_write" on public.receipt_applications
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- CUSTOMER PAYMENTS (Pagos de Clientes)
-- =====================================================
alter table public.customer_payments enable row level security;

drop policy if exists "customer_payments_select" on public.customer_payments;
drop policy if exists "customer_payments_write" on public.customer_payments;

create policy "customer_payments_select" on public.customer_payments
for select
using ( public.has_tenant_access(user_id) );

create policy "customer_payments_write" on public.customer_payments
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- CUSTOMER ADVANCES (Anticipos de Clientes)
-- =====================================================
alter table public.customer_advances enable row level security;

drop policy if exists "customer_advances_select" on public.customer_advances;
drop policy if exists "customer_advances_write" on public.customer_advances;

create policy "customer_advances_select" on public.customer_advances
for select
using ( public.has_tenant_access(user_id) );

create policy "customer_advances_write" on public.customer_advances
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- CUSTOMER TYPES (Tipos de Cliente)
-- =====================================================
alter table public.customer_types enable row level security;

drop policy if exists "customer_types_select" on public.customer_types;
drop policy if exists "customer_types_write" on public.customer_types;

create policy "customer_types_select" on public.customer_types
for select
using ( public.has_tenant_access(user_id) );

create policy "customer_types_write" on public.customer_types
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
create index if not exists idx_customers_user_id on public.customers(user_id);
create index if not exists idx_invoices_user_id on public.invoices(user_id);
create index if not exists idx_invoices_customer_id on public.invoices(customer_id);
create index if not exists idx_invoice_lines_invoice_id on public.invoice_lines(invoice_id);
create index if not exists idx_receipts_user_id on public.receipts(user_id);
create index if not exists idx_receipts_customer_id on public.receipts(customer_id);
create index if not exists idx_receipt_applications_user_id on public.receipt_applications(user_id);
create index if not exists idx_receipt_applications_invoice_id on public.receipt_applications(invoice_id);
create index if not exists idx_receipt_applications_receipt_id on public.receipt_applications(receipt_id);
create index if not exists idx_customer_payments_user_id on public.customer_payments(user_id);
create index if not exists idx_customer_payments_customer_id on public.customer_payments(customer_id);
create index if not exists idx_customer_payments_invoice_id on public.customer_payments(invoice_id);
create index if not exists idx_customer_advances_user_id on public.customer_advances(user_id);
create index if not exists idx_customer_advances_customer_id on public.customer_advances(customer_id);
create index if not exists idx_customer_types_user_id on public.customer_types(user_id);

-- =====================================================
-- COMMENTS
-- =====================================================
comment on policy "customers_select" on public.customers is
  'Multi-tenant: Users can only view customers for their tenant (owner or sub-user)';

comment on policy "invoices_select" on public.invoices is
  'Multi-tenant: Users can only view invoices for their tenant (owner or sub-user)';

comment on policy "invoice_lines_select" on public.invoice_lines is
  'Multi-tenant: Users can only view invoice lines belonging to their tenant invoices';

comment on policy "receipts_select" on public.receipts is
  'Multi-tenant: Users can only view receipts for their tenant (owner or sub-user)';

comment on policy "receipt_applications_select" on public.receipt_applications is
  'Multi-tenant: Users can only view receipt applications for their tenant (owner or sub-user)';

comment on policy "customer_payments_select" on public.customer_payments is
  'Multi-tenant: Users can only view customer payments for their tenant (owner or sub-user)';

comment on policy "customer_advances_select" on public.customer_advances is
  'Multi-tenant: Users can only view customer advances for their tenant (owner or sub-user)';

comment on policy "customer_types_select" on public.customer_types is
  'Multi-tenant: Users can only view customer types for their tenant (owner or sub-user)';
