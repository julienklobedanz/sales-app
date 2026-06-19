-- Welle 2: references.created_by, RLS-Helfer, scoped SELECT-Policy (B1)

-- ---------------------------------------------------------------------------
-- 1) created_by auf references
-- ---------------------------------------------------------------------------
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.references.created_by IS 'Ersteller der Referenz (auth.users.id); für Draft-Sichtbarkeit in RLS.';

-- Backfill: frühestes evidence_events.created_by pro Referenz, sonst approval_requested_by
UPDATE public.references r
SET created_by = sub.creator
FROM (
  SELECT DISTINCT ON (e.reference_id)
    e.reference_id,
    e.created_by AS creator
  FROM public.evidence_events e
  WHERE e.reference_id IS NOT NULL
    AND e.created_by IS NOT NULL
  ORDER BY e.reference_id, e.created_at ASC NULLS LAST
) sub
WHERE r.id = sub.reference_id
  AND r.created_by IS NULL;

UPDATE public.references r
SET created_by = r.approval_requested_by
WHERE r.created_by IS NULL
  AND r.approval_requested_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) RLS-Helfer (SECURITY DEFINER, search_path, STABLE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_function_role()
RETURNS public.function_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.function_role FROM public.profiles p WHERE p.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_privileged()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (
      SELECT p.system_role IN ('owner'::public.system_role, 'admin'::public.system_role)
      FROM public.profiles p
      WHERE p.id = auth.uid()
    ),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.org_roles_permissions()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(o.api_settings -> 'roles_permissions', '{}'::jsonb)
  FROM public.organizations o
  JOIN public.profiles p ON p.organization_id = o.id
  WHERE p.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.function_role_default_has_capability(
  p_function_role public.function_role,
  p_cap text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_function_role
    WHEN 'sales_rep'::public.function_role THEN
      p_cap = ANY (ARRAY['view_analytics_own']::text[])
    WHEN 'account_manager'::public.function_role THEN
      p_cap = ANY (
        ARRAY[
          'create_reference',
          'approve_internal',
          'start_customer_approval',
          'anonymize_reference',
          'see_draft_references',
          'see_confidential_references',
          'view_analytics_own'
        ]::text[]
      )
    WHEN 'sales_leader'::public.function_role THEN
      p_cap = ANY (ARRAY['view_analytics_all']::text[])
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.admin_default_has_capability(p_cap text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_cap = ANY (
    ARRAY[
      'create_reference',
      'edit_any_reference',
      'approve_internal',
      'start_customer_approval',
      'anonymize_reference',
      'see_draft_references',
      'see_confidential_references',
      'view_analytics_all',
      'manage_team',
      'manage_settings',
      'manage_integrations'
    ]::text[]
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_effective_capability(p_cap text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_system_role public.system_role;
  v_function_role public.function_role;
  v_capabilities jsonb;
  v_org_perms jsonb;
  v_role_caps jsonb;
  v_has boolean := false;
  v_override text;
BEGIN
  IF auth.uid() IS NULL OR p_cap IS NULL OR length(trim(p_cap)) = 0 THEN
    RETURN false;
  END IF;

  SELECT p.system_role, p.function_role, coalesce(p.capabilities, '{}'::jsonb)
  INTO v_system_role, v_function_role, v_capabilities
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_system_role IS NULL OR v_function_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_capabilities ? p_cap THEN
    v_override := v_capabilities ->> p_cap;
    IF v_override IS NOT NULL THEN
      BEGIN
        RETURN v_override::boolean;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  v_org_perms := public.org_roles_permissions();

  v_role_caps := v_org_perms -> 'function_role_capabilities' -> v_function_role::text;
  IF v_role_caps IS NOT NULL AND jsonb_typeof(v_role_caps) = 'array' THEN
    v_has := v_role_caps @> to_jsonb(p_cap);
  ELSE
    v_has := public.function_role_default_has_capability(v_function_role, p_cap);
  END IF;

  IF v_function_role = 'sales_rep'::public.function_role
     AND p_cap = 'see_draft_references'
     AND coalesce((v_org_perms ->> 'sales_sees_drafts')::boolean, false) THEN
    v_has := true;
  END IF;

  IF v_system_role IN ('owner'::public.system_role, 'admin'::public.system_role)
     AND public.admin_default_has_capability(p_cap) THEN
    v_has := true;
  END IF;

  RETURN v_has;
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_function_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_privileged() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.org_roles_permissions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.function_role_default_has_capability(public.function_role, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_default_has_capability(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_effective_capability(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_function_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_privileged() TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_roles_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.function_role_default_has_capability(public.function_role, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_default_has_capability(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_effective_capability(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Scoped SELECT-Policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users see references of own org" ON public.references;
DROP POLICY IF EXISTS "Users see references of own org (scoped)" ON public.references;

CREATE POLICY "Users see references of own org (scoped)"
  ON public.references FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      company_id IS NULL
      OR (
        SELECT c.organization_id
        FROM public.companies c
        WHERE c.id = public.references.company_id
      ) = public.current_user_organization_id()
    )
    AND (
      public.current_user_is_privileged()
      OR public.references.created_by = auth.uid()
      OR public.current_user_function_role() = 'account_manager'::public.function_role
      OR (
        public.references.status::text IN ('approved', 'external', 'anonymized', 'internal_only')
        AND public.references.is_nda_deal = false
        AND public.references.approval_scope_confidential_sales = false
      )
      OR (
        public.references.status::text = 'draft'
        AND public.current_user_effective_capability('see_draft_references')
      )
      OR (
        (public.references.is_nda_deal = true OR public.references.approval_scope_confidential_sales = true)
        AND public.current_user_effective_capability('see_confidential_references')
      )
    )
  );

DO $$
BEGIN
  PERFORM pg_catalog.pg_notify('pgrst', 'reload schema');
END $$;
