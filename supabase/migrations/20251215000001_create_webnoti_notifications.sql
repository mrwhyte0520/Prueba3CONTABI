-- Create table to persist WebNotiCenter webhook notifications

CREATE TABLE IF NOT EXISTS public.webnoti_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NULL,
  message TEXT NULL,
  event TEXT NOT NULL,
  raw JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webnoti_notifications_user_id ON public.webnoti_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_webnoti_notifications_created_at ON public.webnoti_notifications(created_at);
