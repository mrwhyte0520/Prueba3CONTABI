-- Add expense_type_606 field to AP invoices for tax compliance (Form 606)

alter table public.ap_invoices
  add column if not exists expense_type_606 text;

comment on column public.ap_invoices.expense_type_606 is 'Tipo de gasto según formulario 606 de la DGII (11 tipos)';
