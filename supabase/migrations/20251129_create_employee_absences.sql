-- Create employee_absences table
CREATE TABLE IF NOT EXISTS employee_absences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  absence_type VARCHAR(50) NOT NULL CHECK (absence_type IN ('enfermedad', 'permiso_personal', 'licencia_maternidad', 'licencia_paternidad', 'vacaciones', 'suspension', 'otro')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL DEFAULT 1,
  is_paid BOOLEAN DEFAULT TRUE,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobada', 'rechazada')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_employee_absences_user_id ON employee_absences(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_absences_employee_id ON employee_absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_absences_status ON employee_absences(status);
CREATE INDEX IF NOT EXISTS idx_employee_absences_dates ON employee_absences(start_date, end_date);

-- Enable RLS
ALTER TABLE employee_absences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own employee absences"
  ON employee_absences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own employee absences"
  ON employee_absences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own employee absences"
  ON employee_absences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own employee absences"
  ON employee_absences FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE employee_absences IS 'Registro de ausencias y permisos de empleados con sistema de aprobación';
