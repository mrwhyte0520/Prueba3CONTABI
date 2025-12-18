-- Add last purchase price, last purchase date and average cost to inventory_items

alter table if exists public.inventory_items
  add column if not exists last_purchase_price numeric,
  add column if not exists last_purchase_date date,
  add column if not exists average_cost numeric;

-- Initialize average_cost with existing cost_price where applicable
update public.inventory_items
set average_cost = cost_price
where average_cost is null;
