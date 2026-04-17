-- Epic 15: Event-Tracking (Referenz angesehen, Match, Export, Share, KI-Entwurf)
-- + references.organization_id (denormalisiert aus companies) für RPCs und Events

-- ---------------------------------------------------------------------------
-- 1) references.organization_id: Spalte, Backfill, Trigger
-- ---------------------------------------------------------------------------
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_references_organization_id
  ON public.references(organization_id)
  WHERE organization_id IS NOT NULL;

UPDATE public.references r
SET organization_id = c.organization_id
FROM public.companies c
WHERE r.company_id = c.id
  AND (r.organization_id IS NULL OR r.organization_id IS DISTINCT FROM c.organization_id);

CREATE OR REPLACE FUNCTION public.set_references_organization_from_company()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT c.organization_id INTO NEW.organization_id
    FROM public.companies c
    WHERE c.id = NEW.company_id;
  ELSE
    NEW.organization_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_references_org_from_company ON public.references;
CREATE TRIGGER trg_references_org_from_company
  BEFORE INSERT OR UPDATE OF company_id ON public.references
  FOR EACH ROW
  EXECUTE FUNCTION public.set_references_organization_from_company();

-- ---------------------------------------------------------------------------
-- 2) evidence_events: erlaubte event_type-Werte
-- ---------------------------------------------------------------------------
ALTER TABLE public.evidence_events
  DROP CONSTRAINT IF EXISTS evidence_events_event_type_check;

ALTER TABLE public.evidence_events
  ADD CONSTRAINT evidence_events_event_type_check
  CHECK (
    event_type IN (
      'deal_won',
      'deal_lost',
      'deal_withdrawn',
      'reference_helped',
      'share_link_viewed',
      'reference_approval_responded',
      'reference_viewed',
      'reference_matched',
      'reference_exported',
      'reference_shared',
      'ki_entwurf_generated'
    )
  );
