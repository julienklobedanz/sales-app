import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  buildManualDeadlineSourceKey,
  buildRfpDeadlineSourceKey,
} from '@/lib/deals/deadline-source-key'
import {
  cleanupIntegrationOrgFixtures,
  seedIntegrationOrgFixtures,
  type IntegrationOrgFixtures,
} from '@/lib/test/integration-fixtures'
import {
  createIntegrationServiceClient,
  isIntegrationSupabaseAvailable,
} from '@/lib/test/integration-supabase'
import {
  assignDealToExistingTender,
  createTenderAndAssignDeal,
  detachDealFromTender,
} from '@/lib/tenders/assign-deal'

const describeIntegration = isIntegrationSupabaseAvailable() ? describe : describe.skip

describeIntegration('tender deadline ownership', () => {
  let fixtures: IntegrationOrgFixtures
  let admin: ReturnType<typeof createIntegrationServiceClient>
  const dealIds: string[] = []
  let tenderId: string | null = null

  beforeAll(async () => {
    admin = createIntegrationServiceClient()
    fixtures = await seedIntegrationOrgFixtures(admin)
  }, 120_000)

  afterAll(async () => {
    if (dealIds.length) await admin.from('deals').delete().in('id', dealIds)
    if (tenderId) await admin.from('tenders').delete().eq('id', tenderId)
    await cleanupIntegrationOrgFixtures(admin, fixtures)
  }, 120_000)

  async function insertDeal(title: string) {
    const { data, error } = await admin
      .from('deals')
      .insert({
        organization_id: fixtures.orgAId,
        title,
        status: 'open',
      })
      .select('id')
      .single()
    if (!data?.id) throw new Error(error?.message ?? 'Deal fehlgeschlagen')
    dealIds.push(data.id)
    return data.id
  }

  async function insertRfpDeadline(args: {
    dealId: string
    pinned?: boolean
    suppressedAt?: string | null
  }) {
    const { error } = await admin.from('deal_deadlines').insert({
      deal_id: args.dealId,
      organization_id: fixtures.orgAId,
      kind: 'submission',
      label: 'Angebotsabgabe',
      due_at: '2026-09-01T12:00:00.000Z',
      source: 'rfp',
      source_key: buildRfpDeadlineSourceKey(args.dealId, 'submission'),
      pinned: args.pinned ?? false,
      suppressed_at: args.suppressedAt ?? null,
    })
    if (error) throw new Error(error.message)
  }

  it('assigns rfp deadlines to the tender, keeps manual/suppressed, pins, then demotes on last detach', async () => {
    const deal1 = await insertDeal(`Los 1 ${fixtures.runId}`)
    const deal5 = await insertDeal(`Los 5 ${fixtures.runId}`)
    const deal7 = await insertDeal(`Los 7 ${fixtures.runId}`)

    await insertRfpDeadline({ dealId: deal1, pinned: true })
    await insertRfpDeadline({ dealId: deal5 })
    await insertRfpDeadline({ dealId: deal7 })
    const { error: manualError } = await admin.from('deal_deadlines').insert({
      deal_id: deal1,
      organization_id: fixtures.orgAId,
      kind: 'custom',
      label: 'Interner Review',
      source: 'manual',
      source_key: buildManualDeadlineSourceKey(),
    })
    if (manualError) throw new Error(manualError.message)
    const { error: suppressedError } = await admin.from('deal_deadlines').insert({
      deal_id: deal1,
      organization_id: fixtures.orgAId,
      kind: 'custom',
      label: 'Alte Frist',
      source: 'rfp',
      source_key: buildRfpDeadlineSourceKey(deal1, 'custom', 'Alte Frist'),
      suppressed_at: new Date().toISOString(),
    })
    if (suppressedError) throw new Error(suppressedError.message)

    const created = await createTenderAndAssignDeal(admin, {
      organizationId: fixtures.orgAId,
      dealId: deal1,
      title: `BMI ${fixtures.runId}`,
    })
    expect(created.success).toBe(true)
    tenderId = created.tenderId ?? null
    expect(tenderId).toBeTruthy()

    const assigned5 = await assignDealToExistingTender(admin, {
      organizationId: fixtures.orgAId,
      dealId: deal5,
      tenderId: tenderId!,
    })
    const assigned7 = await assignDealToExistingTender(admin, {
      organizationId: fixtures.orgAId,
      dealId: deal7,
      tenderId: tenderId!,
    })
    expect(assigned5.success).toBe(true)
    expect(assigned7.success).toBe(true)

    const { count: afterAssign } = await admin
      .from('deal_deadlines')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', fixtures.orgAId)
      .or(`deal_id.in.(${deal1},${deal5},${deal7}),tender_id.eq.${tenderId}`)

    const { data: tenderRows } = await admin
      .from('deal_deadlines')
      .select('id, source, pinned, suppressed_at, deal_id, tender_id')
      .eq('tender_id', tenderId!)
    expect(tenderRows).toHaveLength(1)
    expect(tenderRows![0]).toMatchObject({
      source: 'rfp',
      pinned: true,
      deal_id: null,
    })

    const { data: lot1Rows } = await admin
      .from('deal_deadlines')
      .select('id, source, suppressed_at, kind')
      .eq('deal_id', deal1)
    expect(lot1Rows?.some((row) => row.source === 'manual')).toBe(true)
    expect(lot1Rows?.some((row) => row.source === 'rfp' && row.suppressed_at)).toBe(true)
    expect(lot1Rows?.some((row) => row.source === 'rfp' && !row.suppressed_at)).toBe(
      false,
    )

    const { count: beforeDetach } = await admin
      .from('deal_deadlines')
      .select('id', { count: 'exact', head: true })
      .or(`deal_id.in.(${deal1},${deal5},${deal7}),tender_id.eq.${tenderId}`)

    expect(afterAssign).toBe(beforeDetach)

    const detachNonLast = await detachDealFromTender(admin, {
      organizationId: fixtures.orgAId,
      dealId: deal5,
    })
    expect(detachNonLast.success).toBe(true)
    const { data: tenderStill } = await admin
      .from('tenders')
      .select('id')
      .eq('id', tenderId!)
      .maybeSingle()
    expect(tenderStill?.id).toBe(tenderId)
    const { data: tenderRowsAfter } = await admin
      .from('deal_deadlines')
      .select('id')
      .eq('tender_id', tenderId!)
    expect(tenderRowsAfter).toHaveLength(1)

    const detachSecond = await detachDealFromTender(admin, {
      organizationId: fixtures.orgAId,
      dealId: deal7,
    })
    expect(detachSecond.success).toBe(true)
    const detachLast = await detachDealFromTender(admin, {
      organizationId: fixtures.orgAId,
      dealId: deal1,
    })
    expect(detachLast.success).toBe(true)

    const { data: gone } = await admin
      .from('tenders')
      .select('id')
      .eq('id', tenderId!)
      .maybeSingle()
    expect(gone).toBeNull()
    tenderId = null

    const { data: onLot } = await admin
      .from('deal_deadlines')
      .select('id, source, deal_id, tender_id')
      .in('deal_id', [deal1, deal5, deal7])
    expect(onLot?.some((row) => row.source === 'manual' && row.deal_id === deal1)).toBe(
      true,
    )
    expect(onLot?.every((row) => row.tender_id == null)).toBe(true)
    const { count: afterDetach } = await admin
      .from('deal_deadlines')
      .select('id', { count: 'exact', head: true })
      .in('deal_id', [deal1, deal5, deal7])
    expect(afterDetach).toBe(beforeDetach)
  })
})
