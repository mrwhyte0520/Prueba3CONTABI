-- Add other taxes support to AP invoices
-- Allows applying additional taxes beyond ITBIS (e.g., selective consumption, luxury tax, etc.)

alter table public.ap_invoices
  add column if not exists other_taxes jsonb default '[]'::jsonb,
  add column if not exists total_other_taxes numeric(18,2) default 0;

comment on column public.ap_invoices.other_taxes is 'Array de otros impuestos aplicados: [{name: string, rate: number, amount: number}]';
comment on column public.ap_invoices.total_other_taxes is 'Suma total de otros impuestos aplicados';

-- Example structure for other_taxes field:
-- [
--   {"name": "Impuesto Selectivo al Consumo", "rate": 10, "amount": 100.00},
--   {"name": "Impuesto de Lujo", "rate": 5, "amount": 50.00}
-- ]
