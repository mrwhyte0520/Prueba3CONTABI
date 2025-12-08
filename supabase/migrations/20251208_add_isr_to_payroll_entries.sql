-- Add ISR deductions column to payroll_entries to support income tax withholding per employee

ALTER TABLE public.payroll_entries
ADD COLUMN IF NOT EXISTS isr_deductions DECIMAL(15, 2) DEFAULT 0;

COMMENT ON COLUMN public.payroll_entries.isr_deductions IS 'Retención de ISR (impuesto sobre la renta) aplicada al empleado en el período.';

CREATE INDEX IF NOT EXISTS idx_payroll_entries_isr_deductions ON public.payroll_entries(isr_deductions);
