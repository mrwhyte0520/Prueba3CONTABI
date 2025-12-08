-- Agregar cuenta contable para ISR de nómina por pagar en payroll_settings

alter table public.payroll_settings
add column if not exists isr_payable_account_id uuid references public.chart_accounts(id);

comment on column public.payroll_settings.isr_payable_account_id is 'Cuenta de pasivo para ISR de nómina por pagar (ej: 2104)';

create index if not exists idx_payroll_settings_isr_payable on public.payroll_settings(isr_payable_account_id);
