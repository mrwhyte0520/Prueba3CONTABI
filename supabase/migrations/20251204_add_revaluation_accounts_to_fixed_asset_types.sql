-- Add revaluation gain/loss account fields to fixed asset types
alter table public.fixed_asset_types
  add column if not exists revaluation_gain_account text,
  add column if not exists revaluation_loss_account text;
