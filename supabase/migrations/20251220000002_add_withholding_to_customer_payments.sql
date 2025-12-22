alter table if exists public.customer_payments
add column if not exists itbis_withheld numeric null,
add column if not exists isr_withheld numeric null;
