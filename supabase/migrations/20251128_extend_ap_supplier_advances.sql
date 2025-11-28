-- Extend ap_supplier_advances with payment details for supplier advances (AP)

alter table public.ap_supplier_advances
  add column if not exists payment_method text check (payment_method in ('cash','check','transfer','petty_cash')),
  add column if not exists transaction_date date,
  add column if not exists bank_id uuid references public.bank_accounts(id),
  add column if not exists document_number text,
  add column if not exists document_date date,
  add column if not exists account_id uuid references public.chart_accounts(id);

comment on column public.ap_supplier_advances.payment_method is 'Tipo de pago del anticipo: cash, check, transfer, petty_cash';
comment on column public.ap_supplier_advances.transaction_date is 'Fecha efectiva de la transacción de anticipo (editable)';
comment on column public.ap_supplier_advances.bank_id is 'Banco/cuenta bancaria usada para egresar el anticipo';
comment on column public.ap_supplier_advances.document_number is 'Número de cheque/transferencia u otro documento soporte';
comment on column public.ap_supplier_advances.document_date is 'Fecha del cheque/transferencia u otro documento soporte';
comment on column public.ap_supplier_advances.account_id is 'Cuenta contable de anticipo a proveedores (activo) usada en el asiento';
