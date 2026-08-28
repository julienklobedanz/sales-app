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

describeIntegration('tenders RLS', () => {
  let fixtures: IntegrationOrgFixtures
  let admin: ReturnType<typeof createIntegrationServiceClient>
  let tenderId: string
  let dealId: string
  let orgBUser: { id: string; email: string; password: string }

  beforeAll(async () => {
    admin = createIntegrationServiceClient()
    fixtures = await seedIntegrationOrgFixtures(admin)

    const password = `Test-${fixtures.runId}!Aa1`
    const email = `e3-tender-orgb-${fixtures.runId}@refstack-integration.test`
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

    const tender = await admin
      .from('tenders')
      .insert({
        organization_id: fixtures.orgAId,
        title: `Tender ${fixtures.runId}`,
        company_id: fixtures.companyAId,
      })
      .select('id')
      .single()
    if (!tender.data?.id) {
      throw new Error(tender.error?.message ?? 'Ausschreibung fehlgeschlagen')
    }
    tenderId = tender.data.id

    const deal = await admin
      .from('deals')
      .insert({
        organization_id: fixtures.orgAId,
        title: `Los ${fixtures.runId}`,
        status: 'open',
        tender_id: tenderId,
      })
      .select('id')
      .single()
    if (!deal.data?.id) throw new Error(deal.error?.message ?? 'Deal fehlgeschlagen')
    dealId = deal.data.id
  }, 120_000)

  afterAll(async () => {
    if (dealId) await admin.from('deals').delete().eq('id', dealId)
    if (tenderId) await admin.from('tenders').delete().eq('id', tenderId)
    if (orgBUser?.id) await admin.auth.admin.deleteUser(orgBUser.id)
    await cleanupIntegrationOrgFixtures(admin, fixtures)
  }, 120_000)

  it('Org-A-User sieht die eigene Ausschreibung', async () => {
    const client = await signInIntegrationUser(
      fixtures.salesRep.email,
      fixtures.salesRep.password,
    )
    const { data, error } = await client.from('tenders').select('id').eq('id', tenderId)
    expect(error).toBeNull()
    expect(data?.map((row) => row.id)).toContain(tenderId)
  })

  it('Org-B-User sieht keine Ausschreibung von Org A', async () => {
    const client = await signInIntegrationUser(orgBUser.email, orgBUser.password)
    const { data, error } = await client.from('tenders').select('id').eq('id', tenderId)
    expect(error).toBeNull()
    expect(data ?? []).toEqual([])
  })

  it('ON DELETE SET NULL lässt das Los stehen', async () => {
    const orphan = await admin
      .from('tenders')
      .insert({
        organization_id: fixtures.orgAId,
        title: `Orphan ${fixtures.runId}`,
      })
      .select('id')
      .single()
    if (!orphan.data?.id) throw new Error(orphan.error?.message ?? 'Orphan-Tender')

    const lot = await admin
      .from('deals')
      .insert({
        organization_id: fixtures.orgAId,
        title: `Orphan-Los ${fixtures.runId}`,
        status: 'open',
        tender_id: orphan.data.id,
      })
      .select('id, tender_id')
      .single()
    if (!lot.data?.id) throw new Error(lot.error?.message ?? 'Orphan-Los')

    const { error: deleteError } = await admin
      .from('tenders')
      .delete()
      .eq('id', orphan.data.id)
    expect(deleteError).toBeNull()

    const { data: remaining } = await admin
      .from('deals')
      .select('id, tender_id')
      .eq('id', lot.data.id)
      .single()
    expect(remaining?.id).toBe(lot.data.id)
    expect(remaining?.tender_id).toBeNull()

    await admin.from('deals').delete().eq('id', lot.data.id)
  })
})
