import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getCachedAccountProofMemory, loadAccountProofMemory } from '@/lib/accounts/account-proof-memory'
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

import { fetchAccountProofMemoryAction } from '@/app/dashboard/accounts/account-proof-memory-actions'

const describeIntegration = isIntegrationSupabaseAvailable() ? describe : describe.skip

describeIntegration('account proof memory ownership & visibility', () => {
  let fixtures: IntegrationOrgFixtures
  let admin: ReturnType<typeof createIntegrationServiceClient>
  let dealId: string
  let approvedRefId: string
  let draftRefId: string

  beforeAll(async () => {
    admin = createIntegrationServiceClient()
    fixtures = await seedIntegrationOrgFixtures(admin)

    approvedRefId = fixtures.references.approvedId
    draftRefId = fixtures.references.draftByAdminId

    const { data: deal, error: dealError } = await admin
      .from('deals')
      .insert({
        organization_id: fixtures.orgAId,
        company_id: fixtures.companyAId,
        title: `Memory Deal ${fixtures.runId}`,
        status: 'won',
        account_manager_id: fixtures.salesRep.id,
        decisive_reference_id: approvedRefId,
        outcome_reason: 'Referenz überzeugte Economic Buyer',
      })
      .select('id')
      .single()

    if (dealError || !deal?.id) {
      throw new Error(`Test-Deal konnte nicht angelegt werden: ${dealError?.message ?? 'unknown'}`)
    }
    dealId = deal.id

    await admin.from('deal_references').insert([
      { deal_id: dealId, reference_id: approvedRefId },
      { deal_id: dealId, reference_id: draftRefId },
    ])

    await admin.from('evidence_events').insert({
      organization_id: fixtures.orgAId,
      deal_id: dealId,
      reference_id: approvedRefId,
      event_type: 'deal_won',
      payload: {
        outcome_reason: 'Referenz überzeugte Economic Buyer',
        decisive_reference_id: approvedRefId,
      },
      created_by: fixtures.admin.id,
    })
  }, 120_000)

  afterAll(async () => {
    if (dealId) {
      await admin.from('evidence_events').delete().eq('deal_id', dealId)
      await admin.from('deal_references').delete().eq('deal_id', dealId)
      await admin.from('deals').delete().eq('id', dealId)
    }
    await cleanupIntegrationOrgFixtures(admin, fixtures)
  }, 120_000)

  it('behält Historie nach Rep-Wechsel (account_manager_id = NULL)', async () => {
    const before = await getCachedAccountProofMemory({
      organizationId: fixtures.orgAId,
      companyId: fixtures.companyAId,
      salesVisibleOnly: false,
    })

    expect(before.impact.some((row) => row.referenceId === approvedRefId)).toBe(true)
    expect(before.impact.some((row) => row.referenceId === draftRefId)).toBe(true)

    const { error: clearErr } = await admin
      .from('deals')
      .update({ account_manager_id: null })
      .eq('id', dealId)
    expect(clearErr).toBeNull()

    const after = await getCachedAccountProofMemory({
      organizationId: fixtures.orgAId,
      companyId: fixtures.companyAId,
      salesVisibleOnly: false,
    })

    expect(after.impact).toEqual(before.impact)
    expect(after.history.length).toBeGreaterThanOrEqual(before.history.length)
  })

  it('sales_rep sieht keine Draft-Referenz im Account-Gedächtnis', async () => {
    const client = await signInIntegrationUser(fixtures.salesRep.email, fixtures.salesRep.password)

    const { data: visibleDraft } = await client
      .from('references')
      .select('id')
      .eq('id', draftRefId)
      .maybeSingle()
    expect(visibleDraft).toBeNull()

    const memory = await loadAccountProofMemory(client, {
      organizationId: fixtures.orgAId,
      companyId: fixtures.companyAId,
      salesVisibleOnly: true,
    })

    expect(memory.impact.some((row) => row.referenceId === approvedRefId)).toBe(true)
    expect(memory.impact.some((row) => row.referenceId === draftRefId)).toBe(false)
    expect(memory.impact.find((row) => row.referenceId === approvedRefId)?.decisiveCount).toBe(1)
  })

  it('fremde Org erhält keinen Zugriff auf Account-Gedächtnis', async () => {
    const otherEmail = `e3-memory-${fixtures.runId}@refstack-integration.test`
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
      full_name: 'Org B Memory User',
      organization_id: fixtures.orgBId,
      system_role: 'admin',
      function_role: 'sales_leader',
      capabilities: {},
    })
    if (profileError) {
      throw new Error(`Profil Org B konnte nicht angelegt werden: ${profileError.message}`)
    }

    try {
      await signInIntegrationUser(otherEmail, password)
      const result = await fetchAccountProofMemoryAction(fixtures.companyAId)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toMatch(/nicht gefunden|Berechtigung/i)
      }
    } finally {
      await admin.auth.admin.deleteUser(otherUser.user.id)
    }
  })
})
