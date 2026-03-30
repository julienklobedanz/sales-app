-- Epic 4 / Phase B: RFP-Analysen pro Deal + Storage-Bucket rfp-documents

-- ---------------------------------------------------------------------------
-- 1) Tabelle: Analyse-Läufe (ein Eintrag pro Analyse-Request)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_rfp_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  storage_path text,
  source_file_name text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  coverage_report jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_rfp_analyses_deal ON public.deal_rfp_analyses(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_rfp_analyses_org_created
  ON public.deal_rfp_analyses(organization_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_deal_rfp_analyses_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deal_rfp_analyses_updated_at ON public.deal_rfp_analyses;
CREATE TRIGGER deal_rfp_analyses_updated_at
  BEFORE UPDATE ON public.deal_rfp_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_deal_rfp_analyses_updated_at();

ALTER TABLE public.deal_rfp_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_rfp_analyses_select_own_org" ON public.deal_rfp_analyses;
CREATE POLICY "deal_rfp_analyses_select_own_org"
  ON public.deal_rfp_analyses FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_analyses_insert_own_org" ON public.deal_rfp_analyses;
CREATE POLICY "deal_rfp_analyses_insert_own_org"
  ON public.deal_rfp_analyses FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_analyses_update_own_org" ON public.deal_rfp_analyses;
CREATE POLICY "deal_rfp_analyses_update_own_org"
  ON public.deal_rfp_analyses FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

-- ---------------------------------------------------------------------------
-- 2) Storage: Bucket + Policies (Pfad: {organization_id}/{deal_id}/{filename})
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('rfp-documents', 'rfp-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "rfp_documents_select_own_org" ON storage.objects;
DROP POLICY IF EXISTS "rfp_documents_insert_own_org" ON storage.objects;
DROP POLICY IF EXISTS "rfp_documents_update_own_org" ON storage.objects;
DROP POLICY IF EXISTS "rfp_documents_delete_own_org" ON storage.objects;

-- Erstes Pfadsegment = organization_id des Users
CREATE POLICY "rfp_documents_select_own_org"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "rfp_documents_insert_own_org"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "rfp_documents_update_own_org"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "rfp_documents_delete_own_org"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );
