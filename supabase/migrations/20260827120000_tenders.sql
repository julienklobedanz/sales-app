-- Ausschreibung als optionale Ebene über dem Los (Deal).
-- Kein Backfill: Deals ohne tender_id bleiben unverändert.
-- ON DELETE SET NULL: das Los überlebt eine gelöschte Klammer.

CREATE TABLE IF NOT EXISTS public.tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  procedure_type text
    CHECK (procedure_type IS NULL OR procedure_type IN (
      'open',
      'restricted',
      'negotiated_with_competition',
      'negotiated_without_competition',
      'competitive_dialogue',
      'innovation_partnership'
    )),
  reference_number text,
  total_volume text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenders_organization_id
  ON public.tenders (organization_id);

CREATE INDEX IF NOT EXISTS idx_tenders_company_id
  ON public.tenders (company_id);

COMMENT ON TABLE public.tenders IS
  'Ausschreibung als Klammer über Lose (deals); erscheint in der Liste erst ab zwei Losen.';

COMMENT ON COLUMN public.tenders.procedure_type IS
  'Verfahrensart (englische Codes); Label ist Sache der Oberfläche.';

COMMENT ON COLUMN public.tenders.total_volume IS
  'Höchstwert als Freitext wie deals.volume — keine Autosumme über Lose.';

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS tender_id uuid REFERENCES public.tenders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_tender_id
  ON public.deals (tender_id);

COMMENT ON COLUMN public.deals.tender_id IS
  'Optionale Zuordnung zum Elternobjekt Ausschreibung; NULL = Los steht für sich.';

CREATE OR REPLACE FUNCTION public.set_tenders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenders_updated_at ON public.tenders;
CREATE TRIGGER tenders_updated_at
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenders_updated_at();

ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenders_select_own_org" ON public.tenders;
CREATE POLICY "tenders_select_own_org"
  ON public.tenders FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "tenders_insert_own_org" ON public.tenders;
CREATE POLICY "tenders_insert_own_org"
  ON public.tenders FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "tenders_update_own_org" ON public.tenders;
CREATE POLICY "tenders_update_own_org"
  ON public.tenders FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "tenders_delete_own_org" ON public.tenders;
CREATE POLICY "tenders_delete_own_org"
  ON public.tenders FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());
