-- Add payment tracking fields to AP invoices
ALTER TABLE public.ap_invoices
ADD COLUMN IF NOT EXISTS paid_amount numeric(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_amount numeric(18,2) DEFAULT 0;

-- Initialize existing rows: assume unpaid, full balance = total_to_pay
UPDATE public.ap_invoices
SET paid_amount = COALESCE(paid_amount, 0),
    balance_amount = COALESCE(balance_amount, total_to_pay)
WHERE balance_amount IS NULL;
