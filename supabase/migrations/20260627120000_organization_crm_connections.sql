-- HubSpot / CRM Sync: Verbindungen pro Organisation + generische CRM-Fremdschlüssel

CREATE TABLE IF NOT EXISTS public.organization_crm_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'connected',
  access_token_enc text NOT NULL,
  refresh_token_enc text,
  expires_at timestamptz,
  external_account_id text,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_crm_connections_provider_check
    CHECK (provider IN ('hubspot', 'pipedrive', 'salesforce', 'zoho')),
  CONSTRAINT organization_crm_connections_status_check
    CHECK (status IN ('connected', 'disconnected', 'error')),
  CONSTRAINT organization_crm_connections_org_provider_unique
    UNIQUE (organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_organization_crm_connections_org
  ON public.organization_crm_connections(organization_id);

COMMENT ON TABLE public.organization_crm_connections IS
  'CRM-OAuth-Verbindungen pro Organisation (Tokens nur für Admins via RLS).';
COMMENT ON COLUMN public.organization_crm_connections.access_token_enc IS
  'Access Token (MVP: Klartext; später verschlüsseln).';
COMMENT ON COLUMN public.organization_crm_connections.external_account_id IS
  'Externe Portal-/Org-ID (z. B. HubSpot hub_id).';

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS crm_provider text,
  ADD COLUMN IF NOT EXISTS crm_account_id text;

COMMENT ON COLUMN public.companies.crm_provider IS
  'CRM-Quelle des Accounts: hubspot, salesforce, …';
COMMENT ON COLUMN public.companies.crm_account_id IS
  'Externe Account-/Company-ID im CRM.';

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS crm_opportunity_id text;

COMMENT ON COLUMN public.deals.crm_opportunity_id IS
  'Generische externe Opportunity-/Deal-ID (provider-agnostisch).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_org_crm_account
  ON public.companies(organization_id, crm_provider, crm_account_id)
  WHERE crm_account_id IS NOT NULL AND crm_provider IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_org_crm_opportunity
  ON public.deals(organization_id, crm_source, crm_opportunity_id)
  WHERE crm_opportunity_id IS NOT NULL AND crm_source IS NOT NULL;

ALTER TABLE public.organization_crm_connections ENABLE ROW LEVEL SECURITY;

-- Admin-Check: funktioniert vor und nach dem Rollenmodell (profiles.role vs. system_role).
CREATE OR REPLACE FUNCTION public._migration_profile_is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'system_role'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = p_user_id
        AND p.system_role IN ('owner'::public.system_role, 'admin'::public.system_role)
    );
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id AND p.role::text = 'admin'
  );
END;
$$;

DROP POLICY IF EXISTS "Admins read own org crm connections" ON public.organization_crm_connections;
CREATE POLICY "Admins read own org crm connections"
  ON public.organization_crm_connections FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public._migration_profile_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins insert own org crm connections" ON public.organization_crm_connections;
CREATE POLICY "Admins insert own org crm connections"
  ON public.organization_crm_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND public._migration_profile_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins update own org crm connections" ON public.organization_crm_connections;
CREATE POLICY "Admins update own org crm connections"
  ON public.organization_crm_connections FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public._migration_profile_is_admin(auth.uid())
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND public._migration_profile_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins delete own org crm connections" ON public.organization_crm_connections;
CREATE POLICY "Admins delete own org crm connections"
  ON public.organization_crm_connections FOR DELETE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND public._migration_profile_is_admin(auth.uid())
  );
