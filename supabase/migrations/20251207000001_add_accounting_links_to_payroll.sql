-- Agregar campos de cuentas contables a las tablas de nómina
-- Esto permite vincular los movimientos de nómina con el catálogo de cuentas
-- usando cuentas de pasivos (código 2.x)

-- Agregar campos a payroll_settings para configurar las cuentas por defecto
alter table public.payroll_settings
add column if not exists payroll_payable_account_id uuid references public.chart_accounts(id),
add column if not exists tss_payable_account_id uuid references public.chart_accounts(id),
add column if not exists other_deductions_payable_account_id uuid references public.chart_accounts(id),
add column if not exists salary_expense_account_id uuid references public.chart_accounts(id);

comment on column public.payroll_settings.payroll_payable_account_id is 'Cuenta de pasivo para Nómina por Pagar (ej: 2101)';
comment on column public.payroll_settings.tss_payable_account_id is 'Cuenta de pasivo para Retenciones TSS por Pagar (ej: 2102)';
comment on column public.payroll_settings.other_deductions_payable_account_id is 'Cuenta de pasivo para Otras Deducciones por Pagar (ej: 2103)';
comment on column public.payroll_settings.salary_expense_account_id is 'Cuenta de gasto para Gastos de Nómina (ej: 6101)';

-- Agregar campo a payroll_periods para vincular asiento contable generado
alter table public.payroll_periods
add column if not exists journal_entry_id uuid references public.journal_entries(id);

comment on column public.payroll_periods.journal_entry_id is 'Asiento contable generado al cerrar el período de nómina';

-- Agregar campo a periodic_deductions para vincular con cuenta contable específica
alter table public.periodic_deductions
add column if not exists payable_account_id uuid references public.chart_accounts(id);

comment on column public.periodic_deductions.payable_account_id is 'Cuenta de pasivo específica para esta deducción periódica';

-- Agregar campo a other_deductions para vincular con cuenta contable específica
alter table public.other_deductions
add column if not exists payable_account_id uuid references public.chart_accounts(id);

comment on column public.other_deductions.payable_account_id is 'Cuenta de pasivo específica para esta deducción puntual';

-- Crear índices para mejorar performance en consultas
create index if not exists idx_payroll_settings_payroll_payable on public.payroll_settings(payroll_payable_account_id);
create index if not exists idx_payroll_settings_tss_payable on public.payroll_settings(tss_payable_account_id);
create index if not exists idx_payroll_settings_other_deductions_payable on public.payroll_settings(other_deductions_payable_account_id);
create index if not exists idx_payroll_settings_salary_expense on public.payroll_settings(salary_expense_account_id);
create index if not exists idx_payroll_periods_journal_entry on public.payroll_periods(journal_entry_id);
create index if not exists idx_periodic_deductions_payable_account on public.periodic_deductions(payable_account_id);
create index if not exists idx_other_deductions_payable_account on public.other_deductions(payable_account_id);
