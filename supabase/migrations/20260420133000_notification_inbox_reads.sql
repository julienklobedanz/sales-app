-- Inbox-Notifications (mehrere Quellen): Read-Tracking über generischen Schlüssel

CREATE TABLE IF NOT EXISTS public.notification_inbox_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_key text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_inbox_reads_user
  ON public.notification_inbox_reads(user_id, read_at DESC);

ALTER TABLE public.notification_inbox_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notification_inbox_reads" ON public.notification_inbox_reads;
CREATE POLICY "Users read own notification_inbox_reads"
  ON public.notification_inbox_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own notification_inbox_reads" ON public.notification_inbox_reads;
CREATE POLICY "Users insert own notification_inbox_reads"
  ON public.notification_inbox_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own notification_inbox_reads" ON public.notification_inbox_reads;
CREATE POLICY "Users delete own notification_inbox_reads"
  ON public.notification_inbox_reads FOR DELETE TO authenticated
  USING (user_id = auth.uid());
