-- Soll-Liste zur Einreichung: hängt an der Frist (Los oder Ausschreibung).
-- Bewusst ohne deal_/tender_-Präfix — die Frist ist der Eigentümer.

CREATE TABLE IF NOT EXISTS public.submission_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deadline_id uuid NOT NULL REFERENCES public.deal_deadlines(id) ON DELETE CASCADE,
  identifier text,
  title text NOT NULL,
  state text NOT NULL DEFAULT 'open'
    CHECK (state IN ('open', 'provided', 'not_applicable')),
  source text NOT NULL CHECK (source IN ('extracted', 'manual')),
  source_key text NOT NULL,
  document_id uuid REFERENCES public.deal_documents(id) ON DELETE SET NULL,
  not_applicable_at timestamptz,
  not_applicable_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS submission_items_extracted_source_key_idx
  ON public.submission_items (deadline_id, source_key)
  WHERE source = 'extracted';

CREATE INDEX IF NOT EXISTS idx_submission_items_deadline_id
  ON public.submission_items (deadline_id);

CREATE INDEX IF NOT EXISTS idx_submission_items_organization_id
  ON public.submission_items (organization_id);

COMMENT ON TABLE public.submission_items IS
  'Soll-Positionen einer Einreichung; Eigentümer ist die Abgabefrist.';

COMMENT ON COLUMN public.submission_items.identifier IS
  'Kennung aus der Unterlage (z. B. A1, A6a); NULL, wenn nicht nummeriert.';

COMMENT ON COLUMN public.submission_items.source_key IS
  'Stabiler Schlüssel: Kennung, sonst normalisierter Titel; Unique nur für extracted.';

-- ON CONFLICT-Prädikat muss exakt zum partiellen Unique-Index passen.
-- DO UPDATE ändert nie state / document_id / not_applicable_*.
CREATE OR REPLACE FUNCTION public.upsert_extracted_submission_item(
  p_organization_id uuid,
  p_deadline_id uuid,
  p_identifier text,
  p_title text,
  p_source_key text,
  p_sort_order int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.submission_items (
    organization_id,
    deadline_id,
    identifier,
    title,
    state,
    source,
    source_key,
    sort_order
  ) VALUES (
    p_organization_id,
    p_deadline_id,
    NULLIF(btrim(p_identifier), ''),
    p_title,
    'open',
    'extracted',
    p_source_key,
    COALESCE(p_sort_order, 0)
  )
  ON CONFLICT (deadline_id, source_key) WHERE source = 'extracted'
  DO UPDATE SET
    title = EXCLUDED.title,
    identifier = EXCLUDED.identifier,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_extracted_submission_item(uuid, uuid, text, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_extracted_submission_item(uuid, uuid, text, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_extracted_submission_item(uuid, uuid, text, text, text, int) TO service_role;

ALTER TABLE public.submission_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own org submission items" ON public.submission_items;
CREATE POLICY "Users see own org submission items"
  ON public.submission_items FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users insert own org submission items" ON public.submission_items;
CREATE POLICY "Users insert own org submission items"
  ON public.submission_items FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users update own org submission items" ON public.submission_items;
CREATE POLICY "Users update own org submission items"
  ON public.submission_items FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users delete own org submission items" ON public.submission_items;
CREATE POLICY "Users delete own org submission items"
  ON public.submission_items FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());
