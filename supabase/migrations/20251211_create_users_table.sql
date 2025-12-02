-- =====================================================
-- Create public.users table for application user profiles
-- Date: 2025-12-11
-- Description: Tabla de perfiles de usuarios de la aplicación
--              vinculada a auth.users
-- =====================================================

-- Crear tabla de usuarios si no existe
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'República Dominicana',
  status TEXT DEFAULT 'active',
  role TEXT DEFAULT 'user',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columna status si no existe (para tablas creadas anteriormente)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.users ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Agregar constraint de status si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_status_check'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Trigger para sincronizar email de auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger en auth.users para auto-crear perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comentario
COMMENT ON TABLE public.users IS 'Perfiles de usuarios de la aplicación vinculados a auth.users';
