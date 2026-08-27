import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

describeIntegration('deal_rfp_eligibility_criteria RLS', () => {
  let fixtures: IntegrationOrgFixtures
  let admin: ReturnType<typeof createIntegrationServiceClient>
  let dealId: string
  let dealDocumentId: string
  let criterionId: string
  let complianceDocumentId: string
  let linkId: string
  let orgBUser: { id: string; email: string; password: string }

  beforeAll(async () => {
    admin = createIntegrationServiceClient()
    fixtures = await seedIntegrationOrgFixtures(admin)

    const password = `Test-${fixtures.runId}!Aa1`
    const email = `e3-elig-orgb-${fixtures.runId}@refstack-integration.test`
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (!created.data.user?.id) {
      throw new Error(created.error?.message ?? 'Org-B-User fehlgeschlagen')
    }
    orgBUser = { id: created.data.user.id, email, password }
    const { error: profileError } = await admin.from('profiles').upsert({
      id: orgBUser.id,
      full_name: 'Org B Sales',
      organization_id: fixtures.orgBId,
      system_role: 'member',
      function_role: 'sales_rep',
      capabilities: {},
    })
    if (profileError) throw new Error(profileError.message)

    const deal = await admin
      .from('deals')
      .insert({
        organization_id: fixtures.orgAId,
        title: `RFP-Eignung ${fixtures.runId}`,
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
        storage_path: `org/${fixtures.orgAId}/deals/${dealId}/rfp-elig.pdf`,
        mime_type: 'application/pdf',
      })
      .select('id')
      .single()
    if (!dealDoc.data?.id) {
      throw new Error(dealDoc.error?.message ?? 'Deal-Dokument fehlgeschlagen')
    }
    dealDocumentId = dealDoc.data.id

    const criterion = await admin
      .from('deal_rfp_eligibility_criteria')
      .insert({
        deal_id: dealId,
        organization_id: fixtures.orgAId,
        source_document_id: dealDocumentId,
        dimension: 'certification',
        label: 'STQC',
        operator: 'contains',
        value: 'STQC',
        mandatory: true,
        confidence: 'high',
      })
      .select('id')
      .single()
    if (!criterion.data?.id) {
      throw new Error(criterion.error?.message ?? 'Kriterium fehlgeschlagen')
    }
    criterionId = criterion.data.id

    const compliance = await admin
      .from('organization_compliance_documents')
      .insert({
        organization_id: fixtures.orgAId,
        title: 'STQC-Zertifikat',
        document_type: 'iso_27001',
      })
      .select('id')
      .single()
    if (!compliance.data?.id) {
      throw new Error(compliance.error?.message ?? 'Nachweis fehlgeschlagen')
    }
    complianceDocumentId = compliance.data.id

    const link = await admin
      .from('deal_rfp_eligibility_criterion_documents')
      .insert({
        criterion_id: criterionId,
        document_id: complianceDocumentId,
        organization_id: fixtures.orgAId,
        linked_by: fixtures.admin.id,
      })
      .select('id')
      .single()
    if (!link.data?.id) {
      throw new Error(link.error?.message ?? 'Verknüpfung fehlgeschlagen')
    }
    linkId = link.data.id
  }, 120_000)

  afterAll(async () => {
    if (linkId) {
      await admin
        .from('deal_rfp_eligibility_criterion_documents')
        .delete()
        .eq('id', linkId)
    }
    if (complianceDocumentId) {
      await admin
        .from('organization_compliance_documents')
        .delete()
        .eq('id', complianceDocumentId)
    }
    if (criterionId) {
      await admin.from('deal_rfp_eligibility_criteria').delete().eq('id', criterionId)
    }
    if (dealDocumentId) {
      await admin.from('deal_documents').delete().eq('id', dealDocumentId)
    }
    if (dealId) {
      await admin.from('deals').delete().eq('id', dealId)
    }
    if (orgBUser?.id) {
      await admin.auth.admin.deleteUser(orgBUser.id)
    }
    await cleanupIntegrationOrgFixtures(admin, fixtures)
  }, 120_000)

  it('Org-B-User sieht keine Eignungskriterien von Org A', async () => {
    const client = await signInIntegrationUser(orgBUser.email, orgBUser.password)
    const { data, error } = await client
      .from('deal_rfp_eligibility_criteria')
      .select('id')
      .eq('id', criterionId)

    expect(error).toBeNull()
    expect(data ?? []).toEqual([])
  })

  it('Org-A-User sieht das Kriterium der eigenen Organisation', async () => {
    const client = await signInIntegrationUser(
      fixtures.admin.email,
      fixtures.admin.password,
    )
    const { data, error } = await client
      .from('deal_rfp_eligibility_criteria')
      .select('id')
      .eq('id', criterionId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data?.id).toBe(criterionId)
  })

  it('Org-B-User sieht keine Verknüpfungen von Org A', async () => {
    const client = await signInIntegrationUser(orgBUser.email, orgBUser.password)
    const { data, error } = await client
      .from('deal_rfp_eligibility_criterion_documents')
      .select('id')
      .eq('id', linkId)

    expect(error).toBeNull()
    expect(data ?? []).toEqual([])
  })
})
