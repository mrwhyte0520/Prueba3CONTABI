-- Add new deduction fields to payroll_entries table to support integrated deductions and absences

-- Add columns for detailed deductions tracking
ALTER TABLE payroll_entries
ADD COLUMN IF NOT EXISTS tss_deductions DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS periodic_deductions DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_deductions DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS absence_deductions DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS unpaid_absence_days INTEGER DEFAULT 0;

-- Add comments for new columns
COMMENT ON COLUMN payroll_entries.tss_deductions IS 'Deducciones TSS (SFS + AFP + Riesgos + INFOTEP) del empleado';
COMMENT ON COLUMN payroll_entries.periodic_deductions IS 'Total de deducciones periódicas (préstamos, pensión alimenticia, etc.)';
COMMENT ON COLUMN payroll_entries.other_deductions IS 'Total de otras deducciones eventuales (multas, adelantos, etc.)';
COMMENT ON COLUMN payroll_entries.absence_deductions IS 'Descuento por ausencias no pagadas';
COMMENT ON COLUMN payroll_entries.unpaid_absence_days IS 'Cantidad de días de ausencias no pagadas en el período';

-- Create index for performance on new fields
CREATE INDEX IF NOT EXISTS idx_payroll_entries_tss_deductions ON payroll_entries(tss_deductions);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_unpaid_absence_days ON payroll_entries(unpaid_absence_days);
