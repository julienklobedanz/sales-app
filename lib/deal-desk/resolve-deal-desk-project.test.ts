import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveDealDeskProject } from './resolve-deal-desk-project'

function row(overrides: { archived_at: string | null; updated_at: string; id: string }) {
  return overrides
}

describe('resolveDealDeskProject', () => {
  it('skips an archived project even when it was changed later', () => {
    expect(
      resolveDealDeskProject([
        row({
          id: 'archived',
          archived_at: '2026-08-28T12:00:00.000Z',
          updated_at: '2026-08-28T18:00:00.000Z',
        }),
        row({
          id: 'active',
          archived_at: null,
          updated_at: '2026-01-01T00:00:00.000Z',
        }),
      ])?.id,
    ).toBe('active')
  })

  it('picks the last updated among two active projects', () => {
    expect(
      resolveDealDeskProject([
        row({
          id: 'older',
          archived_at: null,
          updated_at: '2026-01-01T00:00:00.000Z',
        }),
        row({
          id: 'newer',
          archived_at: null,
          updated_at: '2026-08-01T00:00:00.000Z',
        }),
      ])?.id,
    ).toBe('newer')
  })

  it('returns null when no active project exists', () => {
    expect(resolveDealDeskProject([])).toBeNull()
    expect(
      resolveDealDeskProject([
        row({
          id: 'archived',
          archived_at: '2026-08-28T12:00:00.000Z',
          updated_at: '2026-08-28T18:00:00.000Z',
        }),
      ]),
    ).toBeNull()
  })
})

describe('deal desk project callers share the helper', () => {
  it('ensure uses resolveDealDeskProject', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'lib/deal-desk/ensure-deal-desk-project.ts'),
      'utf8',
    )
    expect(src).toMatch(/resolveDealDeskProject/)
    expect(src).not.toMatch(/order\('created_at'/)
  })

  it('cockpit uses resolveDealDeskProject and keeps completed as a display filter', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'lib/deals/load-deal-rfp-cockpit-data.ts'),
      'utf8',
    )
    expect(src).toMatch(/resolveDealDeskProject/)
    expect(src).toMatch(/analysis_status',\s*'completed'/)
    expect(src).toMatch(/Anzeigefilter/)
  })

  it('bid chip uses resolveDealDeskProject', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'lib/tenders/load-tender-page-data.ts'),
      'utf8',
    )
    expect(src).toMatch(/resolveDealDeskProject/)
  })
})
