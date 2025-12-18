alter table public.supplier_types add column if not exists isr_withholding_rate numeric;

alter table public.supplier_types drop constraint if exists supplier_types_isr_withholding_rate_range;

alter table public.supplier_types add constraint supplier_types_isr_withholding_rate_range check (
  isr_withholding_rate is null or (isr_withholding_rate >= 0 and isr_withholding_rate <= 100)
);
