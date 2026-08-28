import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildExtractedSubmissionItemSourceKey } from '@/lib/deals/submission-item-source-key'
import { buildRfpDeadlineSourceKey } from '@/lib/deals/deadline-source-key'
import {
  cleanupIntegrationOrgFixtures,
  seedIntegrationOrgFixtures,
  type IntegrationOrgFixtures,
} from '@/lib/test/integration-fixtures'
import {
  createIntegrationServiceClient,
  isIntegrationSupabaseAvailable,
  signInIntegrationUser,
} from '@/lib/test/integration-supabase'

const describeIntegration = isIntegrationSupabaseAvailable() ? describe : describe.skip

describeIntegration('upsert_extracted_submission_item', () => {
  let fixtures: IntegrationOrgFixtures
  let admin: ReturnType<typeof createIntegrationServiceClient>
  let asOrg: Awaited<ReturnType<typeof signInIntegrationUser>>
  let dealId: string
  let deadlineId: string
  let documentId: string
  let itemId: string | null = null

  beforeAll(async () => {
    admin = createIntegrationServiceClient()
    fixtures = await seedIntegrationOrgFixtures(admin)
    asOrg = await signInIntegrationUser(fixtures.admin.email, fixtures.admin.password)

    const deal = await admin
      .from('deals')
      .insert({
        organization_id: fixtures.orgAId,
        company_id: fixtures.companyAId,
        title: `Einreichung ${fixtures.runId}`,
        status: 'open',
      })
      .select('id')
      .single()
    if (!deal.data?.id) throw new Error(deal.error?.message ?? 'Deal fehlgeschlagen')
    dealId = deal.data.id

    const dealDoc = await admin
      .from('deal_documents')
      .insert({
        deal_id: dealId,
        organization_id: fixtures.orgAId,
        file_name: 'rfp.pdf',
        kind: 'ausschreibung',
        storage_path: `org/${fixtures.orgAId}/deals/${dealId}/rfp-sub.pdf`,
        mime_type: 'application/pdf',
      })
      .select('id')
      .single()
    if (!dealDoc.data?.id) {
      throw new Error(dealDoc.error?.message ?? 'Dokument fehlgeschlagen')
    }
    documentId = dealDoc.data.id

    const deadline = await admin
      .from('deal_deadlines')
      .insert({
        deal_id: dealId,
        organization_id: fixtures.orgAId,
        kind: 'submission',
        label: 'Angebotsabgabe',
        due_at: '2026-10-15T12:00:00.000Z',
        source: 'rfp',
        source_key: buildRfpDeadlineSourceKey(dealId, 'submission'),
      })
      .select('id')
      .single()
    if (!deadline.data?.id) {
      throw new Error(deadline.error?.message ?? 'Frist fehlgeschlagen')
    }
    deadlineId = deadline.data.id
  }, 120_000)

  afterAll(async () => {
    if (dealId) await admin.from('deals').delete().eq('id', dealId)
    await cleanupIntegrationOrgFixtures(admin, fixtures)
  }, 120_000)

  it('inserts on the document, unique on source_key, and leaves state and deadline_id', async () => {
    const sourceKey = buildExtractedSubmissionItemSourceKey(documentId, {
      identifier: 'A1',
      title: 'Bewerbungsbogen',
    })

    const first = await asOrg.rpc('upsert_extracted_submission_item', {
      p_organization_id: fixtures.orgAId,
      p_source_document_id: documentId,
      p_identifier: 'A1',
      p_title: 'Bewerbungsbogen',
      p_source_key: sourceKey,
      p_sort_order: 0,
      p_confidence: 'high',
      p_match_source: 'pattern',
    })
    expect(first.error, first.error?.message).toBeNull()

    const { data: afterInsert, error: loadError } = await asOrg
      .from('submission_items')
      .select('id, title, state, identifier, deadline_id, confidence, match_source')
      .eq('source_document_id', documentId)
    expect(loadError, loadError?.message).toBeNull()
    expect(afterInsert).toHaveLength(1)
    expect(afterInsert?.[0]?.state).toBe('open')
    expect(afterInsert?.[0]?.deadline_id).toBeNull()
    expect(afterInsert?.[0]?.title).toBe('Bewerbungsbogen')
    itemId = afterInsert?.[0]?.id ?? null
    expect(itemId).toBeTruthy()

    const { error: assignError } = await asOrg
      .from('submission_items')
      .update({ state: 'provided', deadline_id: deadlineId })
      .eq('id', itemId!)
    expect(assignError, assignError?.message).toBeNull()

    const second = await asOrg.rpc('upsert_extracted_submission_item', {
      p_organization_id: fixtures.orgAId,
      p_source_document_id: documentId,
      p_identifier: 'A1',
      p_title: 'Bewerbungsbogen (nachgeschärft)',
      p_source_key: sourceKey,
      p_sort_order: 3,
      p_confidence: 'low',
      p_match_source: 'model',
    })
    expect(second.error, second.error?.message).toBeNull()

    const { data: afterUpdate } = await asOrg
      .from('submission_items')
      .select('id, title, state, sort_order, identifier, deadline_id, confidence')
      .eq('source_document_id', documentId)
    expect(afterUpdate).toHaveLength(1)
    expect(afterUpdate?.[0]?.id).toBe(itemId)
    expect(afterUpdate?.[0]?.title).toBe('Bewerbungsbogen (nachgeschärft)')
    expect(afterUpdate?.[0]?.state).toBe('provided')
    expect(afterUpdate?.[0]?.deadline_id).toBe(deadlineId)
    expect(afterUpdate?.[0]?.sort_order).toBe(3)
    expect(afterUpdate?.[0]?.confidence).toBe('low')
  })
})
