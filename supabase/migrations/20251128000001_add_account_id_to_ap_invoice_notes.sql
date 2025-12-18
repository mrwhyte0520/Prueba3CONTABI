-- Ensure account_id column exists on ap_invoice_notes (for contable account of the note)

alter table public.ap_invoice_notes
  add column if not exists account_id uuid references public.chart_accounts(id);
