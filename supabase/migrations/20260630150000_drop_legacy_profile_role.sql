-- Welle 5 T2: RLS/RPC von profiles.role lösen, dann Legacy-Spalten + Sync-Trigger entfernen.

-- ---------------------------------------------------------------------------
-- Helfer (entspricht profileCanManageOrgData / legacyAppRoleFrom in der App)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_can_manage_org_data()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    public.current_user_is_privileged()
    OR public.current_user_function_role() = 'account_manager'::public.function_role,
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.legacy_role_from_dimensions(
  p_system_role public.system_role,
  p_function_role public.function_role
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_function_role = 'account_manager'::public.function_role THEN 'account_manager'
    WHEN p_system_role IN ('owner'::public.system_role, 'admin'::public.system_role) THEN 'admin'
    ELSE 'sales'
  END
$$;

-- ---------------------------------------------------------------------------
-- RLS: nda_agreements (Admin + Account Manager)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Org staff manage nda_agreements" ON public.nda_agreements;
CREATE POLICY "Org staff manage nda_agreements"
  ON public.nda_agreements FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_can_manage_org_data()
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND public.current_user_can_manage_org_data()
  );

-- ---------------------------------------------------------------------------
-- RLS: compliance documents + document types (Admin)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Org admins manage compliance documents" ON public.organization_compliance_documents;
CREATE POLICY "Org admins manage compliance documents"
  ON public.organization_compliance_documents FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_is_privileged()
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND public.current_user_is_privileged()
  );

DROP POLICY IF EXISTS "Org admins manage compliance document types" ON public.organization_compliance_document_types;
CREATE POLICY "Org admins manage compliance document types"
  ON public.organization_compliance_document_types FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_is_privileged()
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND public.current_user_is_privileged()
  );

-- ---------------------------------------------------------------------------
-- Storage: compliance-documents (Admin)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "compliance_documents_insert_admin" ON storage.objects;
CREATE POLICY "compliance_documents_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND public.current_user_is_privileged()
  );

DROP POLICY IF EXISTS "compliance_documents_update_admin" ON storage.objects;
CREATE POLICY "compliance_documents_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND public.current_user_is_privileged()
  );

DROP POLICY IF EXISTS "compliance_documents_delete_admin" ON storage.objects;
CREATE POLICY "compliance_documents_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND public.current_user_is_privileged()
  );

-- ---------------------------------------------------------------------------
-- Storage: nda-documents (Admin + Account Manager)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "nda_documents_insert_staff" ON storage.objects;
CREATE POLICY "nda_documents_insert_staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'nda-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND public.current_user_can_manage_org_data()
  );

DROP POLICY IF EXISTS "nda_documents_update_staff" ON storage.objects;
CREATE POLICY "nda_documents_update_staff"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'nda-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND public.current_user_can_manage_org_data()
  );

DROP POLICY IF EXISTS "nda_documents_delete_staff" ON storage.objects;
CREATE POLICY "nda_documents_delete_staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'nda-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND public.current_user_can_manage_org_data()
  );

-- ---------------------------------------------------------------------------
-- RLS: CRM connections (Admin)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins read own org crm connections" ON public.organization_crm_connections;
CREATE POLICY "Admins read own org crm connections"
  ON public.organization_crm_connections FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_is_privileged()
  );

DROP POLICY IF EXISTS "Admins insert own org crm connections" ON public.organization_crm_connections;
CREATE POLICY "Admins insert own org crm connections"
  ON public.organization_crm_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND public.current_user_is_privileged()
  );

DROP POLICY IF EXISTS "Admins update own org crm connections" ON public.organization_crm_connections;
CREATE POLICY "Admins update own org crm connections"
  ON public.organization_crm_connections FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_is_privileged()
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND public.current_user_is_privileged()
  );

DROP POLICY IF EXISTS "Admins delete own org crm connections" ON public.organization_crm_connections;
CREATE POLICY "Admins delete own org crm connections"
  ON public.organization_crm_connections FOR DELETE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public.current_user_is_privileged()
  );

-- ---------------------------------------------------------------------------
-- Invite-RPCs: ohne organization_invites.role
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_organization_invite(
  p_email text,
  p_token text,
  p_role text,
  p_expires_at timestamptz,
  p_system_role public.system_role DEFAULT NULL,
  p_function_role public.function_role DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_uid uuid := auth.uid();
  v_resolved record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_org := public.current_user_organization_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'no organization';
  END IF;

  IF NOT public.current_user_is_privileged() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO v_resolved
  FROM public.resolve_invite_roles(p_role, p_system_role, p_function_role) AS t(
    o_system_role public.system_role,
    o_function_role public.function_role,
    o_legacy_role text
  );

  INSERT INTO public.organization_invites (
    organization_id,
    email,
    token,
    invited_by,
    system_role,
    function_role,
    expires_at
  )
  VALUES (
    v_org,
    lower(trim(p_email)),
    p_token,
    v_uid,
    v_resolved.o_system_role,
    v_resolved.o_function_role,
    p_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organization_invite_role(
  p_invite_id uuid,
  p_role text,
  p_system_role public.system_role DEFAULT NULL,
  p_function_role public.function_role DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_uid uuid := auth.uid();
  v_resolved record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.current_user_is_privileged() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_org := public.current_user_organization_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'no organization';
  END IF;

  SELECT * INTO v_resolved
  FROM public.resolve_invite_roles(p_role, p_system_role, p_function_role) AS t(
    o_system_role public.system_role,
    o_function_role public.function_role,
    o_legacy_role text
  );

  UPDATE public.organization_invites
  SET
    system_role = v_resolved.o_system_role,
    function_role = v_resolved.o_function_role
  WHERE id = p_invite_id
    AND organization_id = v_org
    AND expires_at > now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invite_by_token(invite_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'organization_id', i.organization_id,
    'organization_name', o.name,
    'role', public.legacy_role_from_dimensions(i.system_role, i.function_role),
    'system_role', i.system_role::text,
    'function_role', i.function_role::text
  ) INTO result
  FROM public.organization_invites i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = invite_token
    AND i.expires_at > now();
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_organization_pending_invites()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'email', i.email,
        'role', public.legacy_role_from_dimensions(i.system_role, i.function_role),
        'system_role', i.system_role::text,
        'function_role', i.function_role::text
      )
      ORDER BY i.created_at DESC NULLS LAST
    ),
    '[]'::jsonb
  )
  FROM public.organization_invites i
  WHERE i.organization_id = public.current_user_organization_id()
    AND i.expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.get_organization_invite_for_resend(p_invite_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'email', i.email,
    'token', i.token,
    'role', public.legacy_role_from_dimensions(i.system_role, i.function_role),
    'system_role', i.system_role::text,
    'function_role', i.function_role::text
  )
  FROM public.organization_invites i
  WHERE i.id = p_invite_id
    AND i.organization_id = public.current_user_organization_id()
    AND i.expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- Legacy-Spalten + Sync-Trigger entfernen
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sync_legacy_profile_role ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_legacy_profile_role();

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS role;

DROP TRIGGER IF EXISTS trg_sync_legacy_invite_role ON public.organization_invites;
DROP FUNCTION IF EXISTS public.sync_legacy_invite_role();

ALTER TABLE public.organization_invites
  DROP COLUMN IF EXISTS role;

DO $$
BEGIN
  PERFORM pg_catalog.pg_notify('pgrst', 'reload schema');
END $$;
