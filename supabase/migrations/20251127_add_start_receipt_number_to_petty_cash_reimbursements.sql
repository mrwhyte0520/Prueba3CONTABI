-- Add start_receipt_number column to petty_cash_reimbursements to track initial receipt number for petty cash replenishments

alter table public.petty_cash_reimbursements
  add column if not exists start_receipt_number text;
