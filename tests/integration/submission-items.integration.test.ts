import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'

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

  it('keeps review dismissed across re-upsert and leaves provided state', async () => {
    const sourceKey = buildExtractedSubmissionItemSourceKey(documentId, {
      identifier: 'A7',
      title: 'Eigenerklärung',
    })
    const first = await asOrg.rpc('upsert_extracted_submission_item', {
      p_organization_id: fixtures.orgAId,
      p_source_document_id: documentId,
      p_identifier: 'A7',
      p_title: 'Eigenerklärung',
      p_source_key: sourceKey,
      p_sort_order: 6,
      p_confidence: 'low',
      p_match_source: 'pattern',
    })
    expect(first.error, first.error?.message).toBeNull()

    const { data: inserted } = await asOrg
      .from('submission_items')
      .select('id')
      .eq('source_document_id', documentId)
      .eq('source_key', sourceKey)
      .single()
    expect(inserted?.id).toBeTruthy()

    const { error: reviewError } = await asOrg
      .from('submission_items')
      .update({
        review: 'dismissed',
        reviewed_at: new Date().toISOString(),
        reviewed_by: fixtures.admin.id,
        state: 'provided',
      })
      .eq('id', inserted!.id)
    expect(reviewError, reviewError?.message).toBeNull()

    const second = await asOrg.rpc('upsert_extracted_submission_item', {
      p_organization_id: fixtures.orgAId,
      p_source_document_id: documentId,
      p_identifier: 'A7',
      p_title: 'Eigenerklärung (nachgeschärft)',
      p_source_key: sourceKey,
      p_sort_order: 6,
      p_confidence: 'low',
      p_match_source: 'model',
    })
    expect(second.error, second.error?.message).toBeNull()

    const { data: after } = await asOrg
      .from('submission_items')
      .select('review, state, title')
      .eq('id', inserted!.id)
      .single()
    expect(after?.review).toBe('dismissed')
    expect(after?.state).toBe('provided')
    expect(after?.title).toBe('Eigenerklärung (nachgeschärft)')
  })

  it('allows two is_submission_target deadlines on the same owner', async () => {
    const { error: firstMark } = await admin
      .from('deal_deadlines')
      .update({ is_submission_target: true })
      .eq('id', deadlineId)
    expect(firstMark, firstMark?.message).toBeNull()

    const second = await admin
      .from('deal_deadlines')
      .insert({
        deal_id: dealId,
        organization_id: fixtures.orgAId,
        kind: 'questions',
        label: 'Teilnahmeantrag',
        due_at: '2026-09-01T12:00:00.000Z',
        source: 'manual',
        source_key: `manual-${fixtures.runId}`,
        is_submission_target: true,
      })
      .select('id')
      .single()
    expect(second.error, second.error?.message).toBeNull()

    const { data: marked } = await admin
      .from('deal_deadlines')
      .select('id')
      .eq('deal_id', dealId)
      .eq('is_submission_target', true)
    expect(marked).toHaveLength(2)
  })

  it('inserts a manual item without source_document_id', async () => {
    const { data, error } = await asOrg
      .from('submission_items')
      .insert({
        organization_id: fixtures.orgAId,
        deadline_id: deadlineId,
        title: 'Zusatzlage',
        source: 'manual',
        source_key: `manual:${randomUUID()}`,
        confidence: 'high',
        source_document_id: null,
      })
      .select('id, source, source_document_id, confidence')
      .single()
    expect(error, error?.message).toBeNull()
    expect(data?.source).toBe('manual')
    expect(data?.source_document_id).toBeNull()
    expect(data?.confidence).toBe('high')
  })

  it('keeps the item when the source document is deleted', async () => {
    const extraDoc = await admin
      .from('deal_documents')
      .insert({
        deal_id: dealId,
        organization_id: fixtures.orgAId,
        file_name: 'rfp-extra.pdf',
        kind: 'ausschreibung',
        storage_path: `org/${fixtures.orgAId}/deals/${dealId}/rfp-extra.pdf`,
        mime_type: 'application/pdf',
      })
      .select('id')
      .single()
    expect(extraDoc.error, extraDoc.error?.message).toBeNull()
    const extraDocId = extraDoc.data!.id
    const sourceKey = buildExtractedSubmissionItemSourceKey(extraDocId, {
      identifier: 'A3',
      title: 'Handelsregister',
    })
    const upsert = await asOrg.rpc('upsert_extracted_submission_item', {
      p_organization_id: fixtures.orgAId,
      p_source_document_id: extraDocId,
      p_identifier: 'A3',
      p_title: 'Handelsregister',
      p_source_key: sourceKey,
      p_sort_order: 2,
      p_confidence: 'high',
      p_match_source: 'pattern',
    })
    expect(upsert.error, upsert.error?.message).toBeNull()

    const { data: inserted } = await asOrg
      .from('submission_items')
      .select('id')
      .eq('source_document_id', extraDocId)
      .single()
    expect(inserted?.id).toBeTruthy()

    const stampedAt = '2026-08-28T10:00:00.000Z'
    const { error: stampError } = await asOrg
      .from('submission_items')
      .update({
        review: 'confirmed',
        reviewed_at: stampedAt,
        reviewed_by: fixtures.admin.id,
        not_applicable_at: stampedAt,
        not_applicable_by: fixtures.admin.id,
        state: 'not_applicable',
      })
      .eq('id', inserted!.id)
    expect(stampError, stampError?.message).toBeNull()

    const { error: deleteError } = await admin
      .from('deal_documents')
      .delete()
      .eq('id', extraDocId)
    expect(deleteError, deleteError?.message).toBeNull()

    const { data: after } = await asOrg
      .from('submission_items')
      .select(
        'id, source_document_id, review, not_applicable_at, not_applicable_by, state',
      )
      .eq('id', inserted!.id)
      .maybeSingle()
    expect(after).toBeTruthy()
    expect(after?.source_document_id).toBeNull()
    expect(after?.review).toBe('confirmed')
    expect(after?.not_applicable_at).toBe(stampedAt)
    expect(after?.not_applicable_by).toBe(fixtures.admin.id)
    expect(after?.state).toBe('not_applicable')
  })
})
