-- Multi-tenant RLS for payroll and HR tables

-- Helper function must already exist:
-- public.has_tenant_access(target_user_id uuid)

-- Employees
alter table public.employees enable row level security;

drop policy if exists "employees_select" on public.employees;
drop policy if exists "employees_write" on public.employees;

create policy "employees_select" on public.employees
for select
using ( public.has_tenant_access(user_id) );

create policy "employees_write" on public.employees
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Departments
alter table public.departments enable row level security;

drop policy if exists "departments_select" on public.departments;
drop policy if exists "departments_write" on public.departments;

create policy "departments_select" on public.departments
for select
using ( public.has_tenant_access(user_id) );

create policy "departments_write" on public.departments
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Positions
alter table public.positions enable row level security;

drop policy if exists "positions_select" on public.positions;
drop policy if exists "positions_write" on public.positions;

create policy "positions_select" on public.positions
for select
using ( public.has_tenant_access(user_id) );

create policy "positions_write" on public.positions
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Employee Types
alter table public.employee_types enable row level security;

drop policy if exists "employee_types_select" on public.employee_types;
drop policy if exists "employee_types_write" on public.employee_types;

create policy "employee_types_select" on public.employee_types
for select
using ( public.has_tenant_access(user_id) );

create policy "employee_types_write" on public.employee_types
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Salary Types
alter table public.salary_types enable row level security;

drop policy if exists "salary_types_select" on public.salary_types;
drop policy if exists "salary_types_write" on public.salary_types;

create policy "salary_types_select" on public.salary_types
for select
using ( public.has_tenant_access(user_id) );

create policy "salary_types_write" on public.salary_types
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Commission Types
alter table public.commission_types enable row level security;

drop policy if exists "commission_types_select" on public.commission_types;
drop policy if exists "commission_types_write" on public.commission_types;

create policy "commission_types_select" on public.commission_types
for select
using ( public.has_tenant_access(user_id) );

create policy "commission_types_write" on public.commission_types
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Vacations
alter table public.vacations enable row level security;

drop policy if exists "vacations_select" on public.vacations;
drop policy if exists "vacations_write" on public.vacations;

create policy "vacations_select" on public.vacations
for select
using ( public.has_tenant_access(user_id) );

create policy "vacations_write" on public.vacations
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Holidays
alter table public.holidays enable row level security;

drop policy if exists "holidays_select" on public.holidays;
drop policy if exists "holidays_write" on public.holidays;

create policy "holidays_select" on public.holidays
for select
using ( public.has_tenant_access(user_id) );

create policy "holidays_write" on public.holidays
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Bonuses
alter table public.bonuses enable row level security;

drop policy if exists "bonuses_select" on public.bonuses;
drop policy if exists "bonuses_write" on public.bonuses;

create policy "bonuses_select" on public.bonuses
for select
using ( public.has_tenant_access(user_id) );

create policy "bonuses_write" on public.bonuses
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Royalties
alter table public.royalties enable row level security;

drop policy if exists "royalties_select" on public.royalties;
drop policy if exists "royalties_write" on public.royalties;

create policy "royalties_select" on public.royalties
for select
using ( public.has_tenant_access(user_id) );

create policy "royalties_write" on public.royalties
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Overtime Records
alter table public.overtime_records enable row level security;

drop policy if exists "overtime_records_select" on public.overtime_records;
drop policy if exists "overtime_records_write" on public.overtime_records;

create policy "overtime_records_select" on public.overtime_records
for select
using ( public.has_tenant_access(user_id) );

create policy "overtime_records_write" on public.overtime_records
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Payroll Periods
alter table public.payroll_periods enable row level security;

drop policy if exists "payroll_periods_select" on public.payroll_periods;
drop policy if exists "payroll_periods_write" on public.payroll_periods;

create policy "payroll_periods_select" on public.payroll_periods
for select
using ( public.has_tenant_access(user_id) );

create policy "payroll_periods_write" on public.payroll_periods
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Payroll Entries
alter table public.payroll_entries enable row level security;

drop policy if exists "payroll_entries_select" on public.payroll_entries;
drop policy if exists "payroll_entries_write" on public.payroll_entries;

create policy "payroll_entries_select" on public.payroll_entries
for select
using ( public.has_tenant_access(user_id) );

create policy "payroll_entries_write" on public.payroll_entries
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Periodic Deductions
alter table public.periodic_deductions enable row level security;

-- Drop old single-tenant policies if they exist
drop policy if exists "Users can view their own periodic deductions" on public.periodic_deductions;
drop policy if exists "Users can insert their own periodic deductions" on public.periodic_deductions;
drop policy if exists "Users can update their own periodic deductions" on public.periodic_deductions;
drop policy if exists "Users can delete their own periodic deductions" on public.periodic_deductions;

drop policy if exists "periodic_deductions_select" on public.periodic_deductions;
drop policy if exists "periodic_deductions_write" on public.periodic_deductions;

create policy "periodic_deductions_select" on public.periodic_deductions
for select
using ( public.has_tenant_access(user_id) );

create policy "periodic_deductions_write" on public.periodic_deductions
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Other Deductions
alter table public.other_deductions enable row level security;

-- Drop old single-tenant policies if they exist
drop policy if exists "Users can view their own other deductions" on public.other_deductions;
drop policy if exists "Users can insert their own other deductions" on public.other_deductions;
drop policy if exists "Users can update their own other deductions" on public.other_deductions;
drop policy if exists "Users can delete their own other deductions" on public.other_deductions;

drop policy if exists "other_deductions_select" on public.other_deductions;
drop policy if exists "other_deductions_write" on public.other_deductions;

create policy "other_deductions_select" on public.other_deductions
for select
using ( public.has_tenant_access(user_id) );

create policy "other_deductions_write" on public.other_deductions
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Employee Absences
alter table public.employee_absences enable row level security;

-- Drop old single-tenant policies if they exist
drop policy if exists "Users can view their own employee absences" on public.employee_absences;
drop policy if exists "Users can insert their own employee absences" on public.employee_absences;
drop policy if exists "Users can update their own employee absences" on public.employee_absences;
drop policy if exists "Users can delete their own employee absences" on public.employee_absences;

drop policy if exists "employee_absences_select" on public.employee_absences;
drop policy if exists "employee_absences_write" on public.employee_absences;

create policy "employee_absences_select" on public.employee_absences
for select
using ( public.has_tenant_access(user_id) );

create policy "employee_absences_write" on public.employee_absences
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Payroll Settings
alter table public.payroll_settings enable row level security;

drop policy if exists "payroll_settings_select" on public.payroll_settings;
drop policy if exists "payroll_settings_write" on public.payroll_settings;

create policy "payroll_settings_select" on public.payroll_settings
for select
using ( public.has_tenant_access(user_id) );

create policy "payroll_settings_write" on public.payroll_settings
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

-- Payroll Concepts
alter table public.payroll_concepts enable row level security;

drop policy if exists "payroll_concepts_select" on public.payroll_concepts;
drop policy if exists "payroll_concepts_write" on public.payroll_concepts;

create policy "payroll_concepts_select" on public.payroll_concepts
for select
using ( public.has_tenant_access(user_id) );

create policy "payroll_concepts_write" on public.payroll_concepts
for all
using ( public.has_tenant_access(user_id) )
with check ( public.has_tenant_access(user_id) );

