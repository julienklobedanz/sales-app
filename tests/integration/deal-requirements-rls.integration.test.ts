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

describeIntegration('deal_requirements RLS', () => {
  let fixtures: IntegrationOrgFixtures
  let admin: ReturnType<typeof createIntegrationServiceClient>
  let orgARequirementId: string
  let orgADealId: string

  beforeAll(async () => {
    admin = createIntegrationServiceClient()
    fixtures = await seedIntegrationOrgFixtures(admin)

    const { data: deal, error: dealError } = await admin
      .from('deals')
      .insert({
        organization_id: fixtures.orgAId,
        company_id: fixtures.companyAId,
        title: `RLS Deal ${fixtures.runId}`,
        status: 'active',
      })
      .select('id')
      .single()

    if (dealError || !deal?.id) {
      throw new Error(`Test-Deal konnte nicht angelegt werden: ${dealError?.message ?? 'unknown'}`)
    }
    orgADealId = deal.id

    const { data: req, error: reqError } = await admin
      .from('deal_requirements')
      .insert({
        deal_id: orgADealId,
        organization_id: fixtures.orgAId,
        label: `ISO 27001 ${fixtures.runId}`,
        sort_order: 0,
      })
      .select('id')
      .single()

    if (reqError || !req?.id) {
      throw new Error(
        `Test-Kriterium konnte nicht angelegt werden: ${reqError?.message ?? 'unknown'}`
      )
    }
    orgARequirementId = req.id
  }, 120_000)

  afterAll(async () => {
    if (orgADealId) {
      await admin.from('deal_requirements').delete().eq('deal_id', orgADealId)
      await admin.from('deals').delete().eq('id', orgADealId)
    }
    await cleanupIntegrationOrgFixtures(admin, fixtures)
  }, 120_000)

  it('Nutzer der eigenen Org sieht deal_requirements', async () => {
    const client = await signInIntegrationUser(fixtures.admin.email, fixtures.admin.password)
    const { data, error } = await client
      .from('deal_requirements')
      .select('id')
      .eq('id', orgARequirementId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data?.id).toBe(orgARequirementId)
  })

  it('fremde Org sieht keine deal_requirements von Org A', async () => {
    const otherEmail = `e3-other-${fixtures.runId}@refstack-integration.test`
    const password = `Test-${fixtures.runId}!Aa1`

    const { data: otherUser, error: userError } = await admin.auth.admin.createUser({
      email: otherEmail,
      password,
      email_confirm: true,
    })
    if (userError || !otherUser.user?.id) {
      throw new Error(`Test-User Org B konnte nicht angelegt werden: ${userError?.message}`)
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: otherUser.user.id,
      full_name: 'Org B User',
      organization_id: fixtures.orgBId,
      system_role: 'admin',
      function_role: 'sales_leader',
      capabilities: {},
    })
    if (profileError) {
      throw new Error(`Profil Org B konnte nicht angelegt werden: ${profileError.message}`)
    }

    try {
      const client = await signInIntegrationUser(otherEmail, password)
      const { data, error } = await client
        .from('deal_requirements')
        .select('id')
        .eq('organization_id', fixtures.orgAId)

      expect(error).toBeNull()
      expect(data ?? []).toHaveLength(0)

      const { data: byId } = await client
        .from('deal_requirements')
        .select('id')
        .eq('id', orgARequirementId)
        .maybeSingle()

      expect(byId).toBeNull()
    } finally {
      await admin.auth.admin.deleteUser(otherUser.user.id)
    }
  })
})
