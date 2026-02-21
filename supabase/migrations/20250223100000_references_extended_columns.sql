-- Referenzen: neue Spalten für Tags, Projektstatus, Projektstart/-ende
-- Im Supabase SQL Editor ausführen.

-- Tags (kommasepariert oder einzeln; als Text gespeichert)
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS tags text;

-- Projektstatus: aktiv / abgeschlossen
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS project_status text
  CHECK (project_status IS NULL OR project_status IN ('active', 'completed'));

-- Projektstart und Projektende (nur Datum)
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS project_start date;

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS project_end date;

-- updated_at sollte bereits existieren; falls nicht:
-- ALTER TABLE public.references ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger: updated_at bei UPDATE setzen (falls noch nicht vorhanden)
CREATE OR REPLACE FUNCTION public.set_references_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS references_updated_at ON public.references;
CREATE TRIGGER references_updated_at
  BEFORE UPDATE ON public.references
  FOR EACH ROW
  EXECUTE FUNCTION public.set_references_updated_at();

COMMENT ON COLUMN public.references.tags IS 'Kommagetrennte Tags, z. B. "Cloud, ERP, SAP"';
COMMENT ON COLUMN public.references.project_status IS 'active = aktiv, completed = abgeschlossen';
COMMENT ON COLUMN public.references.project_start IS 'Projektstartdatum';
COMMENT ON COLUMN public.references.project_end IS 'Projektendedatum';
