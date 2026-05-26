-- Deal Desk: Demo-Projekte für alle in der Org sichtbar (nur Seeder bearbeitbar),
-- hochgeladene RFPs nur für den Ersteller (created_by).

CREATE OR REPLACE FUNCTION public.is_desk_org_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'account_manager')
  );
$$;

-- ---------------------------------------------------------------------------
-- deal_desk_projects
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "deal_desk_projects_select_own_org" ON public.deal_desk_projects;
DROP POLICY IF EXISTS "deal_desk_projects_insert_own_org" ON public.deal_desk_projects;
DROP POLICY IF EXISTS "deal_desk_projects_update_own_org" ON public.deal_desk_projects;
DROP POLICY IF EXISTS "deal_desk_projects_delete_own_org" ON public.deal_desk_projects;

CREATE POLICY "deal_desk_projects_select_visible"
  ON public.deal_desk_projects FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      analysis_source = 'mock'
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "deal_desk_projects_insert_own"
  ON public.deal_desk_projects FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND created_by = auth.uid()
  );

CREATE POLICY "deal_desk_projects_update_visible"
  ON public.deal_desk_projects FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND created_by = auth.uid()
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND created_by = auth.uid()
  );

CREATE POLICY "deal_desk_projects_delete_visible"
  ON public.deal_desk_projects FOR DELETE TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      created_by = auth.uid()
      OR public.is_desk_org_staff()
    )
  );

-- ---------------------------------------------------------------------------
-- deal_desk_documents (über Parent-Projekt)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "deal_desk_documents_select_own_org" ON public.deal_desk_documents;
DROP POLICY IF EXISTS "deal_desk_documents_insert_own_org" ON public.deal_desk_documents;
DROP POLICY IF EXISTS "deal_desk_documents_update_own_org" ON public.deal_desk_documents;
DROP POLICY IF EXISTS "deal_desk_documents_delete_own_org" ON public.deal_desk_documents;

CREATE POLICY "deal_desk_documents_select_visible"
  ON public.deal_desk_documents FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1
      FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_documents.project_id
        AND (
          p.analysis_source = 'mock'
          OR p.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "deal_desk_documents_insert_visible"
  ON public.deal_desk_documents FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1
      FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_documents.project_id
        AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "deal_desk_documents_update_visible"
  ON public.deal_desk_documents FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1
      FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_documents.project_id
        AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1
      FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_documents.project_id
        AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "deal_desk_documents_delete_visible"
  ON public.deal_desk_documents FOR DELETE TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1
      FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_documents.project_id
        AND (
          p.created_by = auth.uid()
          OR public.is_desk_org_staff()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage rfp-documents: Deal-Desk strenger; übrige Org-Pfade wie bisher
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "rfp_documents_select_own_org" ON storage.objects;
DROP POLICY IF EXISTS "rfp_documents_insert_own_org" ON storage.objects;
DROP POLICY IF EXISTS "rfp_documents_update_own_org" ON storage.objects;
DROP POLICY IF EXISTS "rfp_documents_delete_own_org" ON storage.objects;

CREATE POLICY "rfp_documents_select_own_org"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
    AND split_part(name, '/', 2) IS DISTINCT FROM 'deal-desk'
  );

CREATE POLICY "rfp_documents_insert_own_org"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
    AND split_part(name, '/', 2) IS DISTINCT FROM 'deal-desk'
  );

CREATE POLICY "rfp_documents_update_own_org"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
    AND split_part(name, '/', 2) IS DISTINCT FROM 'deal-desk'
  );

CREATE POLICY "rfp_documents_delete_own_org"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
    AND split_part(name, '/', 2) IS DISTINCT FROM 'deal-desk'
  );

CREATE POLICY "rfp_documents_select_deal_desk_visible"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
    AND split_part(name, '/', 2) = 'deal-desk'
    AND EXISTS (
      SELECT 1
      FROM public.deal_desk_projects p
      WHERE p.id = (split_part(name, '/', 3))::uuid
        AND p.organization_id = public.current_user_organization_id()
        AND (
          p.analysis_source = 'mock'
          OR p.created_by = auth.uid()
        )
    )
  );

CREATE POLICY "rfp_documents_insert_deal_desk_own_project"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
    AND split_part(name, '/', 2) = 'deal-desk'
    AND EXISTS (
      SELECT 1
      FROM public.deal_desk_projects p
      WHERE p.id = (split_part(name, '/', 3))::uuid
        AND p.organization_id = public.current_user_organization_id()
        AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "rfp_documents_update_deal_desk_own_project"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
    AND split_part(name, '/', 2) = 'deal-desk'
    AND EXISTS (
      SELECT 1
      FROM public.deal_desk_projects p
      WHERE p.id = (split_part(name, '/', 3))::uuid
        AND p.organization_id = public.current_user_organization_id()
        AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "rfp_documents_delete_deal_desk_visible"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'rfp-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
    AND split_part(name, '/', 2) = 'deal-desk'
    AND EXISTS (
      SELECT 1
      FROM public.deal_desk_projects p
      WHERE p.id = (split_part(name, '/', 3))::uuid
        AND p.organization_id = public.current_user_organization_id()
        AND (
          p.created_by = auth.uid()
          OR public.is_desk_org_staff()
        )
    )
  );
