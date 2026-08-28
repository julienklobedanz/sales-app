-- Vergabeunterlagen gehören dem Eigentümer: Ausschreibung oder Los.
-- Eine Tabelle, zwei Eltern, CHECK genau eines. Kein Backfill, kein Rename, kein DROP.
-- Unique Anforderungen um deal_id, sonst kollidieren zwei Lose am selben Dokument.

ALTER TABLE public.deal_documents
  ADD COLUMN IF NOT EXISTS tender_id uuid REFERENCES public.tenders(id) ON DELETE CASCADE;

ALTER TABLE public.deal_documents
  ALTER COLUMN deal_id DROP NOT NULL;

ALTER TABLE public.deal_documents
  ADD CONSTRAINT deal_documents_one_owner
  CHECK (num_nonnulls(deal_id, tender_id) = 1);

CREATE INDEX IF NOT EXISTS idx_deal_documents_tender_created
  ON public.deal_documents (tender_id, created_at DESC);

COMMENT ON COLUMN public.deal_documents.tender_id IS
  'Eigentümer Ausschreibung; genau eines von deal_id und tender_id ist gesetzt.';

COMMENT ON TABLE public.deal_documents IS
  'Dateien am Los oder an der Ausschreibung. Storage: Bucket deal-documents; storage_path ist der Objektschlüssel, kein Ordner.';

DROP INDEX IF EXISTS public.deal_rfp_requirements_source_document_normalized_text_idx;

CREATE UNIQUE INDEX deal_rfp_requirements_deal_source_document_normalized_text_idx
  ON public.deal_rfp_requirements (deal_id, source_document_id, normalized_text);

COMMENT ON TABLE public.deal_rfp_requirements IS
  'RFP-Anforderungen je Deal-Dokument; Schlüssel (deal_id, source_document_id, normalized_text), id ist die Zeilen-UUID.';

-- RLS: Deal-Zweig wie bisher; Tender-Zweig Org-Manager oder SM/AM eines Loses dieser Ausschreibung.
-- Update WITH CHECK erlaubt den Wechsel Los ↔ Ausschreibung.

DROP POLICY IF EXISTS "deal_documents_insert_manageable" ON public.deal_documents;
CREATE POLICY "deal_documents_insert_manageable"
  ON public.deal_documents FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      (
        deal_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.deals d
          WHERE d.id = deal_documents.deal_id
            AND d.organization_id = public.current_user_organization_id()
            AND (
              public.current_user_can_manage_org_data()
              OR d.sales_manager_id = auth.uid()
              OR d.account_manager_id = auth.uid()
            )
        )
      )
      OR (
        tender_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.tenders t
          WHERE t.id = deal_documents.tender_id
            AND t.organization_id = public.current_user_organization_id()
            AND (
              public.current_user_can_manage_org_data()
              OR EXISTS (
                SELECT 1 FROM public.deals d
                WHERE d.tender_id = t.id
                  AND d.organization_id = public.current_user_organization_id()
                  AND (
                    d.sales_manager_id = auth.uid()
                    OR d.account_manager_id = auth.uid()
                  )
              )
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS "deal_documents_update_manageable" ON public.deal_documents;
CREATE POLICY "deal_documents_update_manageable"
  ON public.deal_documents FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      (
        deal_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.deals d
          WHERE d.id = deal_documents.deal_id
            AND d.organization_id = public.current_user_organization_id()
            AND (
              public.current_user_can_manage_org_data()
              OR d.sales_manager_id = auth.uid()
              OR d.account_manager_id = auth.uid()
            )
        )
      )
      OR (
        tender_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.tenders t
          WHERE t.id = deal_documents.tender_id
            AND t.organization_id = public.current_user_organization_id()
            AND (
              public.current_user_can_manage_org_data()
              OR EXISTS (
                SELECT 1 FROM public.deals d
                WHERE d.tender_id = t.id
                  AND d.organization_id = public.current_user_organization_id()
                  AND (
                    d.sales_manager_id = auth.uid()
                    OR d.account_manager_id = auth.uid()
                  )
              )
            )
        )
      )
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      (
        deal_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.deals d
          WHERE d.id = deal_documents.deal_id
            AND d.organization_id = public.current_user_organization_id()
            AND (
              public.current_user_can_manage_org_data()
              OR d.sales_manager_id = auth.uid()
              OR d.account_manager_id = auth.uid()
            )
        )
      )
      OR (
        tender_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.tenders t
          WHERE t.id = deal_documents.tender_id
            AND t.organization_id = public.current_user_organization_id()
            AND (
              public.current_user_can_manage_org_data()
              OR EXISTS (
                SELECT 1 FROM public.deals d
                WHERE d.tender_id = t.id
                  AND d.organization_id = public.current_user_organization_id()
                  AND (
                    d.sales_manager_id = auth.uid()
                    OR d.account_manager_id = auth.uid()
                  )
              )
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS "deal_documents_delete_manageable" ON public.deal_documents;
CREATE POLICY "deal_documents_delete_manageable"
  ON public.deal_documents FOR DELETE TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      (
        deal_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.deals d
          WHERE d.id = deal_documents.deal_id
            AND d.organization_id = public.current_user_organization_id()
            AND (
              public.current_user_can_manage_org_data()
              OR d.sales_manager_id = auth.uid()
              OR d.account_manager_id = auth.uid()
            )
        )
      )
      OR (
        tender_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.tenders t
          WHERE t.id = deal_documents.tender_id
            AND t.organization_id = public.current_user_organization_id()
            AND (
              public.current_user_can_manage_org_data()
              OR EXISTS (
                SELECT 1 FROM public.deals d
                WHERE d.tender_id = t.id
                  AND d.organization_id = public.current_user_organization_id()
                  AND (
                    d.sales_manager_id = auth.uid()
                    OR d.account_manager_id = auth.uid()
                  )
              )
            )
        )
      )
    )
  );
