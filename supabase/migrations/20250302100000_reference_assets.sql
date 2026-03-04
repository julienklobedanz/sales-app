-- Tabelle reference_assets: Dateien/Assets pro Referenz (mehrere Dateien pro Referenz möglich)
-- Ersetzt langfristig das einzelne file_path auf references.

CREATE TABLE IF NOT EXISTS public.reference_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.references(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text,
  file_type text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reference_assets_reference_id ON public.reference_assets(reference_id);

COMMENT ON TABLE public.reference_assets IS 'Datei-Assets pro Referenz (PDF, PPTX etc.); eine Referenz kann mehrere Assets haben.';

-- RLS: Sichtbarkeit wie bei references (über company → organization)
ALTER TABLE public.reference_assets ENABLE ROW LEVEL SECURITY;

-- Lesen: nur wenn die zugehörige Referenz über company zur Org des Users gehört
CREATE POLICY "Users see reference_assets of own org"
  ON public.reference_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.references r
      JOIN public.companies c ON c.id = r.company_id
      WHERE r.id = reference_assets.reference_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

-- Einfügen: nur wenn die Referenz zur Org des Users gehört
CREATE POLICY "Users insert reference_assets in own org"
  ON public.reference_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.references r
      JOIN public.companies c ON c.id = r.company_id
      WHERE r.id = reference_assets.reference_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

-- Aktualisieren/Löschen: nur eigene Org
CREATE POLICY "Users update reference_assets of own org"
  ON public.reference_assets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.references r
      JOIN public.companies c ON c.id = r.company_id
      WHERE r.id = reference_assets.reference_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users delete reference_assets of own org"
  ON public.reference_assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.references r
      JOIN public.companies c ON c.id = r.company_id
      WHERE r.id = reference_assets.reference_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

-- Optional: Spalte file_path in references entfernen (nach Migration der bestehenden Daten).
-- Erst ausführen, wenn alle Stellen auf reference_assets umgestellt sind.
-- ALTER TABLE public.references DROP COLUMN IF EXISTS file_path;
