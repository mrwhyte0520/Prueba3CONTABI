ALTER TABLE public.accounting_settings
ADD COLUMN IF NOT EXISTS purchase_tax_account_id uuid REFERENCES public.chart_accounts(id);
