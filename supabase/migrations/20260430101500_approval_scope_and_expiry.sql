-- Approval workflow: structured scope, owner and expiry metadata
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS approval_owner_name text,
  ADD COLUMN IF NOT EXISTS approval_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_scope_named_mention boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_scope_anonymous_mention boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_scope_reference_call boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_scope_logo_use boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_scope_press_release boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.references.approval_owner_name IS 'Interner Verantwortlicher zum Zeitpunkt der Freigabe-Anfrage.';
COMMENT ON COLUMN public.references.approval_expires_at IS 'Ablaufzeitpunkt für die externe Freigabe-Anfrage.';
COMMENT ON COLUMN public.references.approval_scope_named_mention IS 'Erlaubt namentliche Nennung in Referenzmaterial.';
COMMENT ON COLUMN public.references.approval_scope_anonymous_mention IS 'Erlaubt anonymisierte Nennung.';
COMMENT ON COLUMN public.references.approval_scope_reference_call IS 'Erlaubt Referenz-Call durch Vertrieb.';
COMMENT ON COLUMN public.references.approval_scope_logo_use IS 'Erlaubt Nutzung von Kundenlogo in Referenzmaterial.';
COMMENT ON COLUMN public.references.approval_scope_press_release IS 'Erlaubt Pressemeldung oder öffentliches Zitat.';
