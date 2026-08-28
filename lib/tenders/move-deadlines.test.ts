import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { buildRfpDeadlineSourceKey } from '@/lib/deals/deadline-source-key'
import {
  demoteTenderDeadlinesToDeal,
  promoteActiveRfpDeadlinesToTender,
} from '@/lib/tenders/move-deadlines'
import type { Database } from '@/lib/database.types'

type Row = Database['public']['Tables']['deal_deadlines']['Row']

function baseRow(overrides: Partial<Row>): Row {
  return {
    id: randomUUID(),
    deal_id: 'deal-1',
    tender_id: null,
    organization_id: 'org-1',
    kind: 'submission',
    label: 'Angebotsabgabe',
    due_at: '2026-09-01T12:00:00.000Z',
    due_text: null,
    is_approximate: false,
    source: 'rfp',
    source_key: buildRfpDeadlineSourceKey('deal-1', 'submission'),
    pinned: false,
    suppressed_at: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function matches(
  row: Row,
  filters: Array<{ col: string; op: 'eq' | 'is'; val: unknown }>,
) {
  return filters.every((filter) => {
    const value = row[filter.col as keyof Row]
    if (filter.op === 'is')
      return filter.val === null ? value == null : value === filter.val
    return value === filter.val
  })
}

function createMemoryClient(rows: Row[]) {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []

  function upsertRfp(args: {
    dealId?: string | null
    tenderId?: string | null
    organizationId: string
    kind: Row['kind']
    label: string
    dueAt: string | null
    dueText: string | null
    isApproximate: boolean
    sourceKey: string
  }) {
    const existing = rows.find(
      (row) =>
        row.source === 'rfp' &&
        row.source_key === args.sourceKey &&
        (args.tenderId ? row.tender_id === args.tenderId : row.deal_id === args.dealId),
    )
    if (existing) {
      if (!existing.pinned && !existing.suppressed_at) {
        existing.kind = args.kind
        existing.label = args.label
        existing.due_at = args.dueAt
        existing.due_text = args.dueText
        existing.is_approximate = args.isApproximate
      }
      return
    }
    rows.push(
      baseRow({
        deal_id: args.dealId ?? null,
        tender_id: args.tenderId ?? null,
        organization_id: args.organizationId,
        kind: args.kind,
        label: args.label,
        due_at: args.dueAt,
        due_text: args.dueText,
        is_approximate: args.isApproximate,
        source_key: args.sourceKey,
        pinned: false,
        suppressed_at: null,
      }),
    )
  }

  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args })
      if (name === 'upsert_tender_rfp_deadline') {
        upsertRfp({
          tenderId: args.p_tender_id as string,
          organizationId: args.p_organization_id as string,
          kind: args.p_kind as Row['kind'],
          label: args.p_label as string,
          dueAt: (args.p_due_at as string | null) ?? null,
          dueText: (args.p_due_text as string | null) ?? null,
          isApproximate: Boolean(args.p_is_approximate),
          sourceKey: args.p_source_key as string,
        })
      }
      if (name === 'upsert_deal_rfp_deadline') {
        upsertRfp({
          dealId: args.p_deal_id as string,
          organizationId: args.p_organization_id as string,
          kind: args.p_kind as Row['kind'],
          label: args.p_label as string,
          dueAt: (args.p_due_at as string | null) ?? null,
          dueText: (args.p_due_text as string | null) ?? null,
          isApproximate: Boolean(args.p_is_approximate),
          sourceKey: args.p_source_key as string,
        })
      }
      return { error: null }
    },
    from: (table: string) => {
      if (table !== 'deal_deadlines') throw new Error(`unexpected table ${table}`)
      const filters: Array<{ col: string; op: 'eq' | 'is'; val: unknown }> = []
      let mode: 'select' | 'update' | 'delete' | 'insert' = 'select'
      let patch: Record<string, unknown> = {}
      const chain = {
        select() {
          mode = 'select'
          return chain
        },
        insert(row: Partial<Row>) {
          mode = 'insert'
          rows.push(
            baseRow({
              id: randomUUID(),
              ...row,
            }),
          )
          return Promise.resolve({ error: null })
        },
        update(next: Record<string, unknown>) {
          mode = 'update'
          patch = next
          return chain
        },
        delete() {
          mode = 'delete'
          return chain
        },
        eq(col: string, val: unknown) {
          filters.push({ col, op: 'eq', val })
          return chain
        },
        is(col: string, val: unknown) {
          filters.push({ col, op: 'is', val })
          return chain
        },
        then(
          onFulfilled: (v: { data: Row[]; error: null }) => unknown,
          onRejected?: (e: unknown) => unknown,
        ) {
          const matched = rows.filter((row) => matches(row, filters))
          if (mode === 'update') {
            for (const row of matched) Object.assign(row, patch)
          }
          if (mode === 'delete') {
            const ids = new Set(matched.map((row) => row.id))
            for (let i = rows.length - 1; i >= 0; i -= 1) {
              if (ids.has(rows[i]!.id)) rows.splice(i, 1)
            }
          }
          return Promise.resolve({ data: matched, error: null }).then(
            onFulfilled,
            onRejected,
          )
        },
      }
      return chain
    },
  }

  return { client, rows, rpcCalls }
}

describe('promoteActiveRfpDeadlinesToTender', () => {
  it('moves active rfp rows to the tender and keeps pinned', async () => {
    const source = baseRow({ pinned: true })
    const { client, rows, rpcCalls } = createMemoryClient([source])
    const result = await promoteActiveRfpDeadlinesToTender(client as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
    expect(result).toEqual({ success: true })
    expect(rpcCalls.map((call) => call.name)).toEqual(['upsert_tender_rfp_deadline'])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      deal_id: null,
      tender_id: 'tender-1',
      source: 'rfp',
      pinned: true,
      source_key: buildRfpDeadlineSourceKey('tender-1', 'submission'),
    })
  })

  it('leaves suppressed and manual rows on the lot', async () => {
    const { client, rows } = createMemoryClient([
      baseRow({
        id: 'suppressed',
        suppressed_at: '2026-08-01T00:00:00.000Z',
      }),
      baseRow({
        id: 'manual',
        source: 'manual',
        source_key: 'manual:1',
        kind: 'custom',
        label: 'Intern',
      }),
    ])
    const result = await promoteActiveRfpDeadlinesToTender(client as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
    expect(result.success).toBe(true)
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.deal_id === 'deal-1')).toBe(true)
  })

  it('collapses three lots with the same submission into one tender row', async () => {
    const { client, rows } = createMemoryClient([])
    for (const dealId of ['deal-1', 'deal-5', 'deal-7']) {
      rows.push(
        baseRow({
          deal_id: dealId,
          source_key: buildRfpDeadlineSourceKey(dealId, 'submission'),
        }),
      )
      const result = await promoteActiveRfpDeadlinesToTender(client as never, {
        organizationId: 'org-1',
        dealId,
        tenderId: 'tender-1',
      })
      expect(result.success).toBe(true)
    }
    const tenderRows = rows.filter((row) => row.tender_id === 'tender-1')
    expect(tenderRows).toHaveLength(1)
    expect(rows.filter((row) => row.deal_id != null)).toHaveLength(0)
  })
})

describe('demoteTenderDeadlinesToDeal', () => {
  it('moves rfp and manual rows onto the lot and keeps count', async () => {
    const rfp = baseRow({
      deal_id: null,
      tender_id: 'tender-1',
      source_key: buildRfpDeadlineSourceKey('tender-1', 'submission'),
      pinned: true,
      suppressed_at: '2026-08-02T00:00:00.000Z',
    })
    const manual = baseRow({
      id: randomUUID(),
      deal_id: null,
      tender_id: 'tender-1',
      source: 'manual',
      source_key: 'manual:abc',
      kind: 'custom',
      label: 'Interner Review',
      pinned: false,
      suppressed_at: null,
    })
    const { client, rows } = createMemoryClient([rfp, manual])
    const before = rows.length
    const result = await demoteTenderDeadlinesToDeal(client as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
    expect(result.success).toBe(true)
    expect(rows).toHaveLength(before)
    expect(rows.every((row) => row.deal_id === 'deal-1' && row.tender_id == null)).toBe(
      true,
    )
    const movedRfp = rows.find((row) => row.source === 'rfp')
    expect(movedRfp).toMatchObject({
      pinned: true,
      suppressed_at: '2026-08-02T00:00:00.000Z',
      source_key: buildRfpDeadlineSourceKey('deal-1', 'submission'),
    })
    const movedManual = rows.find((row) => row.source === 'manual')
    expect(movedManual?.source_key).not.toBe('manual:abc')
    expect(movedManual?.label).toBe('Interner Review')
  })
})
