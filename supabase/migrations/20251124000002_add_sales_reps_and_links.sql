-- Tabla de vendedores (sales reps) vinculada al usuario
CREATE TABLE IF NOT EXISTS public.sales_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  code text,
  email text,
  phone text,
  commission_rate numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_sales_reps_user_id ON public.sales_reps(user_id);

-- Relación opcional de vendedor en clientes
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS sales_rep_id uuid REFERENCES public.sales_reps(id);

-- Relación opcional de vendedor en facturas de venta
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sales_rep_id uuid REFERENCES public.sales_reps(id);
