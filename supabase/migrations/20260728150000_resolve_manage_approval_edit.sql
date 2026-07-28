-- Manage-Ansicht: Freigabe-Bearbeiten-URL per gültigem Sperrlink (ohne Service-Role)

CREATE OR REPLACE FUNCTION public.resolve_manage_approval_edit(
  p_slug text,
  p_manage_token text,
  p_reference_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.shared_portfolios%ROWTYPE;
  v_manage_trim text;
  v_ref public.references%ROWTYPE;
  v_token uuid;
BEGIN
  v_manage_trim := nullif(trim(coalesce(p_manage_token, '')), '');
  IF v_manage_trim IS NULL OR p_reference_id IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT * INTO v_row FROM public.shared_portfolios WHERE slug = p_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  IF v_row.customer_manage_token_hash IS NULL
     OR v_row.customer_manage_token_hash <> encode(digest(v_manage_trim, 'sha256'::text), 'hex') THEN
    RETURN json_build_object('found', false);
  END IF;

  IF NOT (p_reference_id = ANY (v_row.reference_ids)) THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT * INTO v_ref FROM public.references WHERE id = p_reference_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  IF v_ref.approval_token IS NOT NULL THEN
    RETURN json_build_object('found', true, 'approval_token', v_ref.approval_token::text);
  END IF;

  -- Gültiger Manage-Token + Referenz im Portfolio → Token wiederherstellen
  v_token := gen_random_uuid();
  UPDATE public.references
  SET
    approval_token = v_token,
    customer_approval_status = CASE
      WHEN coalesce(trim(customer_approval_status), '') = ''
           AND lower(coalesce(status, '')) IN ('external', 'approved')
        THEN 'approved'
      WHEN coalesce(trim(customer_approval_status), '') = ''
           AND lower(coalesce(status, '')) = 'pending'
        THEN 'pending'
      ELSE customer_approval_status
    END
  WHERE id = p_reference_id;

  RETURN json_build_object('found', true, 'approval_token', v_token::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_manage_approval_edit(text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_manage_approval_edit(text, text, uuid) TO authenticated;
