-- Create periodic_deductions table
CREATE TABLE IF NOT EXISTS periodic_deductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('fijo', 'porcentaje')),
  amount DECIMAL(15, 2) DEFAULT 0,
  percentage DECIMAL(5, 2) DEFAULT 0,
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('semanal', 'quincenal', 'mensual')),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('prestamo', 'pension_alimenticia', 'seguro', 'sindicato', 'cooperativa', 'otro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_periodic_deductions_user_id ON periodic_deductions(user_id);
CREATE INDEX IF NOT EXISTS idx_periodic_deductions_employee_id ON periodic_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_periodic_deductions_is_active ON periodic_deductions(is_active);

-- Enable RLS
ALTER TABLE periodic_deductions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own periodic deductions"
  ON periodic_deductions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own periodic deductions"
  ON periodic_deductions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own periodic deductions"
  ON periodic_deductions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own periodic deductions"
  ON periodic_deductions FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE periodic_deductions IS 'Deducciones periódicas recurrentes por empleado (préstamos, pensión alimenticia, etc.)';
