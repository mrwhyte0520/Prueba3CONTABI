alter table public.supplier_types add column if not exists itbis_withholding_rate numeric;

alter table public.supplier_types drop constraint if exists supplier_types_itbis_withholding_rate_allowed;

alter table public.supplier_types add constraint supplier_types_itbis_withholding_rate_allowed check (
  itbis_withholding_rate is null or itbis_withholding_rate in (0, 30, 100)
);
