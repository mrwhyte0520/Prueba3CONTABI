-- Add payment_term_id to customers, quotes and invoices to reuse payment_terms in sales/billing

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS payment_term_id uuid REFERENCES public.payment_terms(id);

ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS payment_term_id uuid REFERENCES public.payment_terms(id);

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS payment_term_id uuid REFERENCES public.payment_terms(id);
