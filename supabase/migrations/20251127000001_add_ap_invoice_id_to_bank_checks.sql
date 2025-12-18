-- Link bank checks to AP invoices (optional)
ALTER TABLE public.bank_checks
ADD COLUMN IF NOT EXISTS ap_invoice_id uuid REFERENCES public.ap_invoices(id);
