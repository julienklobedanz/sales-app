-- Tracking für Kunden-Freigabe-E-Mails und 2-Wochen-Reminder an AM/Anfragenden.

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS approval_customer_last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_customer_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.references.approval_customer_last_sent_at IS
  'Zeitpunkt der letzten Freigabe-Anfrage-E-Mail an den Kunden (Resend).';
COMMENT ON COLUMN public.references.approval_customer_reminder_sent_at IS
  'Zeitpunkt des letzten internen Reminders (ausstehende Kundenfreigabe, z. B. nach 14 Tagen).';
