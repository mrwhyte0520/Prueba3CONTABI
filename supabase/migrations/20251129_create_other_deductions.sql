-- Create other_deductions table
CREATE TABLE IF NOT EXISTS other_deductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_id UUID REFERENCES payroll_periods(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  deduction_date DATE NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('multa', 'descuento', 'adelanto', 'dano_equipo', 'faltante', 'otro')),
  is_one_time BOOLEAN DEFAULT TRUE,
  status VARCHAR(50) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aplicada', 'cancelada')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_other_deductions_user_id ON other_deductions(user_id);
CREATE INDEX IF NOT EXISTS idx_other_deductions_employee_id ON other_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_other_deductions_status ON other_deductions(status);
CREATE INDEX IF NOT EXISTS idx_other_deductions_deduction_date ON other_deductions(deduction_date);

-- Enable RLS
ALTER TABLE other_deductions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own other deductions"
  ON other_deductions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own other deductions"
  ON other_deductions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own other deductions"
  ON other_deductions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own other deductions"
  ON other_deductions FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE other_deductions IS 'Deducciones eventuales y únicas (multas, descuentos, adelantos, etc.)';
