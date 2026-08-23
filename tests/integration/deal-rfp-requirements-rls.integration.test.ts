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

describeIntegration('deal_rfp_requirements RLS', () => {
  let fixtures: IntegrationOrgFixtures
  let admin: ReturnType<typeof createIntegrationServiceClient>
  let dealId: string
  let dealDocumentId: string
  let requirementId: string
  let orgBUser: { id: string; email: string; password: string }

  beforeAll(async () => {
    admin = createIntegrationServiceClient()
    fixtures = await seedIntegrationOrgFixtures(admin)

    const password = `Test-${fixtures.runId}!Aa1`
    const email = `e3-orgb-${fixtures.runId}@refstack-integration.test`
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
        title: `RFP-Anforderungen ${fixtures.runId}`,
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
        storage_path: `org/${fixtures.orgAId}/deals/${dealId}/rfp.pdf`,
        mime_type: 'application/pdf',
      })
      .select('id')
      .single()
    if (!dealDoc.data?.id) {
      throw new Error(dealDoc.error?.message ?? 'Deal-Dokument fehlgeschlagen')
    }
    dealDocumentId = dealDoc.data.id

    const requirement = await admin
      .from('deal_rfp_requirements')
      .insert({
        deal_id: dealId,
        organization_id: fixtures.orgAId,
        source_document_id: dealDocumentId,
        text: 'ISO 27001 Zertifikat',
        normalized_text: 'iso 27001 zertifikat',
      })
      .select('id')
      .single()
    if (!requirement.data?.id) {
      throw new Error(requirement.error?.message ?? 'Anforderung fehlgeschlagen')
    }
    requirementId = requirement.data.id
  }, 120_000)

  afterAll(async () => {
    if (requirementId) {
      await admin.from('deal_rfp_requirements').delete().eq('id', requirementId)
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

  it('Org-B-User sieht keine Anforderungen von Org A', async () => {
    const client = await signInIntegrationUser(orgBUser.email, orgBUser.password)
    const { data, error } = await client
      .from('deal_rfp_requirements')
      .select('id')
      .eq('id', requirementId)

    expect(error).toBeNull()
    expect(data ?? []).toEqual([])
  })

  it('Org-A-User sieht die Anforderung der eigenen Organisation', async () => {
    const client = await signInIntegrationUser(
      fixtures.admin.email,
      fixtures.admin.password,
    )
    const { data, error } = await client
      .from('deal_rfp_requirements')
      .select('id')
      .eq('id', requirementId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data?.id).toBe(requirementId)
  })
})
