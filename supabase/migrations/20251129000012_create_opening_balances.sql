-- Create opening_balances table for initial account balances
CREATE TABLE IF NOT EXISTS opening_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_accounts(id) ON DELETE CASCADE,
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  balance DECIMAL(15, 2) DEFAULT 0,
  balance_type VARCHAR(20) CHECK (balance_type IN ('debit', 'credit')),
  fiscal_year INTEGER NOT NULL,
  opening_date DATE NOT NULL,
  notes TEXT,
  is_posted BOOLEAN DEFAULT FALSE,
  posted_at TIMESTAMP WITH TIME ZONE,
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_account_fiscal_year UNIQUE(user_id, account_id, fiscal_year)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_opening_balances_user_id ON opening_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_opening_balances_account_id ON opening_balances(account_id);
CREATE INDEX IF NOT EXISTS idx_opening_balances_fiscal_year ON opening_balances(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_opening_balances_is_posted ON opening_balances(is_posted);
CREATE INDEX IF NOT EXISTS idx_opening_balances_opening_date ON opening_balances(opening_date);

-- Enable RLS
ALTER TABLE opening_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own opening balances"
  ON opening_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own opening balances"
  ON opening_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opening balances"
  ON opening_balances FOR UPDATE
  USING (auth.uid() = user_id AND is_posted = false);

CREATE POLICY "Users can delete their own opening balances"
  ON opening_balances FOR DELETE
  USING (auth.uid() = user_id AND is_posted = false);

-- Add comment
COMMENT ON TABLE opening_balances IS 'Registro de balances iniciales/de apertura por cuenta contable para inicio de ejercicio fiscal';
COMMENT ON COLUMN opening_balances.is_posted IS 'Indica si el balance ya fue contabilizado en el diario general';
COMMENT ON COLUMN opening_balances.journal_entry_id IS 'Referencia al asiento de diario generado al contabilizar los balances';
