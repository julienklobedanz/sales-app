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
    is_submission_target: false,
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

function rfpUniqueKey(row: Pick<Row, 'source' | 'deal_id' | 'tender_id' | 'source_key'>) {
  if (row.source !== 'rfp') return null
  if (row.tender_id) return `t:${row.tender_id}:${row.source_key}`
  if (row.deal_id) return `d:${row.deal_id}:${row.source_key}`
  return null
}

function submissionTargetKey(
  row: Pick<Row, 'is_submission_target' | 'deal_id' | 'tender_id'>,
) {
  if (!row.is_submission_target) return null
  if (row.tender_id) return `t:${row.tender_id}`
  if (row.deal_id) return `d:${row.deal_id}`
  return null
}

function createMemoryClient(rows: Row[]) {
  const client = {
    from: (table: string) => {
      if (table !== 'deal_deadlines') throw new Error(`unexpected table ${table}`)
      const filters: Array<{ col: string; op: 'eq' | 'is'; val: unknown }> = []
      let mode: 'select' | 'update' | 'delete' = 'select'
      let patch: Record<string, unknown> = {}
      const chain = {
        select() {
          mode = 'select'
          return chain
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
          onFulfilled: (v: {
            data: Row[]
            error: { code?: string; message: string } | null
          }) => unknown,
          onRejected?: (e: unknown) => unknown,
        ) {
          const matched = rows.filter((row) => matches(row, filters))
          if (mode === 'update') {
            const matchedIds = new Set(matched.map((row) => row.id))
            for (const row of matched) {
              const next = { ...row, ...patch } as Row
              const key = rfpUniqueKey(next)
              const targetKey = submissionTargetKey(next)
              if (
                key &&
                rows.some(
                  (other) => !matchedIds.has(other.id) && rfpUniqueKey(other) === key,
                )
              ) {
                return Promise.resolve({
                  data: [],
                  error: {
                    code: '23505',
                    message: 'duplicate key value violates unique constraint',
                  },
                }).then(onFulfilled, onRejected)
              }
              if (
                targetKey &&
                rows.some(
                  (other) =>
                    !matchedIds.has(other.id) && submissionTargetKey(other) === targetKey,
                )
              ) {
                return Promise.resolve({
                  data: [],
                  error: {
                    code: '23505',
                    message: 'duplicate key value violates unique constraint',
                  },
                }).then(onFulfilled, onRejected)
              }
            }
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

  return { client, rows }
}

describe('promoteActiveRfpDeadlinesToTender', () => {
  it('moves the same row to the tender and keeps pinned', async () => {
    const source = baseRow({ pinned: true })
    const { client, rows } = createMemoryClient([source])
    const result = await promoteActiveRfpDeadlinesToTender(client as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
    expect(result).toEqual({ success: true })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe(source.id)
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

  it('collapses three lots with the same submission into the first row', async () => {
    const { client, rows } = createMemoryClient([])
    const firstIds: string[] = []
    for (const dealId of ['deal-1', 'deal-5', 'deal-7']) {
      const row = baseRow({
        deal_id: dealId,
        source_key: buildRfpDeadlineSourceKey(dealId, 'submission'),
      })
      if (dealId === 'deal-1') firstIds.push(row.id)
      rows.push(row)
      const result = await promoteActiveRfpDeadlinesToTender(client as never, {
        organizationId: 'org-1',
        dealId,
        tenderId: 'tender-1',
      })
      expect(result.success).toBe(true)
    }
    const tenderRows = rows.filter((row) => row.tender_id === 'tender-1')
    expect(tenderRows).toHaveLength(1)
    expect(tenderRows[0]?.id).toBe(firstIds[0])
    expect(rows.filter((row) => row.deal_id != null)).toHaveLength(0)
  })

  it('clears is_submission_target on promote so a marked target does not collide', async () => {
    const lotMarked = baseRow({
      id: 'lot-marked',
      is_submission_target: true,
    })
    const tenderMarked = baseRow({
      id: 'tender-marked',
      deal_id: null,
      tender_id: 'tender-1',
      kind: 'questions',
      label: 'Bewerberfragen',
      source_key: buildRfpDeadlineSourceKey('tender-1', 'questions'),
      is_submission_target: true,
    })
    const { client, rows } = createMemoryClient([lotMarked, tenderMarked])
    const result = await promoteActiveRfpDeadlinesToTender(client as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
    expect(result).toEqual({ success: true })
    expect(rows).toHaveLength(2)
    const moved = rows.find((row) => row.id === 'lot-marked')
    expect(moved).toMatchObject({
      deal_id: null,
      tender_id: 'tender-1',
      is_submission_target: false,
    })
    expect(rows.find((row) => row.id === 'tender-marked')?.is_submission_target).toBe(
      true,
    )
  })
})

describe('demoteTenderDeadlinesToDeal', () => {
  it('moves rfp and manual rows onto the lot with the same ids', async () => {
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
    expect(movedRfp?.id).toBe(rfp.id)
    expect(movedRfp).toMatchObject({
      pinned: true,
      suppressed_at: '2026-08-02T00:00:00.000Z',
      source_key: buildRfpDeadlineSourceKey('deal-1', 'submission'),
    })
    const movedManual = rows.find((row) => row.source === 'manual')
    expect(movedManual?.id).toBe(manual.id)
    expect(movedManual?.source_key).toBe('manual:abc')
    expect(movedManual?.label).toBe('Interner Review')
  })

  it('deletes a suppressed lot ghost so the tender row lands visible (current behavior)', async () => {
    const lotKey = buildRfpDeadlineSourceKey('deal-1', 'submission')
    const suppressed = baseRow({
      id: 'suppressed-lot',
      source_key: lotKey,
      suppressed_at: '2026-08-01T00:00:00.000Z',
    })
    const tender = baseRow({
      id: 'tender-active',
      deal_id: null,
      tender_id: 'tender-1',
      source_key: buildRfpDeadlineSourceKey('tender-1', 'submission'),
      suppressed_at: null,
    })
    const { client, rows } = createMemoryClient([suppressed, tender])
    const result = await demoteTenderDeadlinesToDeal(client as never, {
      organizationId: 'org-1',
      dealId: 'deal-1',
      tenderId: 'tender-1',
    })
    expect(result.success).toBe(true)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe('tender-active')
    expect(rows[0]).toMatchObject({
      deal_id: 'deal-1',
      tender_id: null,
      suppressed_at: null,
      source_key: lotKey,
    })
  })
})
