-- Public Sharing: shared_portfolios für Kundenlinks (Slug, Referenzen, Killswitch)
-- Explizit im Schema public, damit PostgREST die Tabelle findet
CREATE TABLE IF NOT EXISTS public.shared_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  reference_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_portfolios_slug ON shared_portfolios(slug);
CREATE INDEX IF NOT EXISTS idx_shared_portfolios_is_active ON shared_portfolios(is_active) WHERE is_active = true;

COMMENT ON TABLE shared_portfolios IS 'Öffentlich geteilte Portfolio-Links; Slug im Format xxx-xxxx-xxx. Kunden-Killswitch setzt is_active auf false.';

-- RLS
ALTER TABLE shared_portfolios ENABLE ROW LEVEL SECURITY;

-- Anon: Nur aktive Einträge lesen (für Public Page)
CREATE POLICY "shared_portfolios_anon_select_active"
  ON shared_portfolios FOR SELECT
  TO anon
  USING (is_active = true);

-- Authentifizierte User: Insert (Link-Generierung) und Select (bestehende Links prüfen)
CREATE POLICY "shared_portfolios_auth_insert"
  ON shared_portfolios FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "shared_portfolios_auth_select"
  ON shared_portfolios FOR SELECT
  TO authenticated
  USING (true);

-- Erhöhung der Aufrufzahl nur über RPC (kein direktes UPDATE für anon)
-- Deaktivierung nur über RPC deactivate_portfolio (anon ausführbar)

-- RPC: Öffentliches Portfolio inkl. Referenz-Daten laden (SECURITY DEFINER um references lesen zu dürfen)
CREATE OR REPLACE FUNCTION get_public_portfolio(p_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row shared_portfolios%ROWTYPE;
  v_refs json;
BEGIN
  SELECT * INTO v_row FROM shared_portfolios WHERE slug = p_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', r.id, 'title', r.title, 'summary', r.summary, 'industry', r.industry, 'country', r.country,
      'status', r.status, 'company_name', c.name, 'company_logo_url', c.logo_url,
      'website', r.website, 'employee_count', r.employee_count, 'volume_eur', r.volume_eur,
      'contract_type', r.contract_type, 'incumbent_provider', r.incumbent_provider, 'competitors', r.competitors,
      'customer_challenge', r.customer_challenge, 'our_solution', r.our_solution, 'tags', r.tags,
      'project_status', r.project_status, 'project_start', r.project_start, 'project_end', r.project_end,
      'duration_months', NULL
    )
  ) INTO v_refs
  FROM references r
  LEFT JOIN companies c ON c.id = r.company_id
  WHERE r.id = ANY(v_row.reference_ids) AND r.deleted_at IS NULL;

  RETURN json_build_object(
    'found', true,
    'slug', v_row.slug,
    'reference_ids', v_row.reference_ids,
    'view_count', v_row.view_count,
    'references', COALESCE(v_refs, '[]'::json)
  );
END;
$$;

-- RPC: Aufrufzähler erhöhen (anon ausführbar)
CREATE OR REPLACE FUNCTION increment_portfolio_views(p_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE shared_portfolios SET view_count = view_count + 1 WHERE slug = p_slug AND is_active = true;
$$;

-- RPC: Link sofort sperren (Kunden-Killswitch; anon ausführbar)
CREATE OR REPLACE FUNCTION deactivate_portfolio(p_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE shared_portfolios SET is_active = false WHERE slug = p_slug;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_portfolio(text) TO anon;
GRANT EXECUTE ON FUNCTION get_public_portfolio(text) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_portfolio_views(text) TO anon;
GRANT EXECUTE ON FUNCTION deactivate_portfolio(text) TO anon;
