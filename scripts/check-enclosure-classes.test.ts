import { describe, expect, it } from 'vitest'

import {
  countEnclosureHits,
  isAllowlisted,
  isExcludedPath,
  isFilteredClassString,
  zoneFor,
} from './check-enclosure-classes.mjs'

describe('isExcludedPath', () => {
  it('skips components/ui and tests', () => {
    expect(isExcludedPath('components/ui/card.tsx')).toBe(true)
    expect(isExcludedPath('components/ui/group.tsx')).toBe(true)
    expect(isExcludedPath('lib/foo.test.ts')).toBe(true)
  })

  it('scans app, components (outside ui), and lib', () => {
    expect(isExcludedPath('components/reference-status-badge.tsx')).toBe(false)
    expect(isExcludedPath('app/dashboard/deals/page.tsx')).toBe(false)
    expect(isExcludedPath('lib/copy.ts')).toBe(false)
  })
})

describe('isFilteredClassString', () => {
  it('skips pills, fields, hover-only borders, and border-0', () => {
    expect(isFilteredClassString('rounded-full border border-border')).toBe(true)
    expect(isFilteredClassString('rounded-md border-input bg-background')).toBe(true)
    expect(isFilteredClassString('rounded-xl border-transparent')).toBe(true)
    expect(isFilteredClassString('rounded-lg border-0')).toBe(true)
  })

  it('keeps real enclosure strings', () => {
    expect(isFilteredClassString('rounded-lg border border-border bg-card p-4')).toBe(
      false,
    )
  })
})

describe('countEnclosureHits', () => {
  it('counts rounded+border in className strings', () => {
    expect(
      countEnclosureHits('<div className="rounded-lg border border-border p-4" />'),
    ).toBe(1)
    expect(countEnclosureHits('<div className="rounded-lg bg-card p-4" />')).toBe(0)
  })

  it('ignores filtered combinations', () => {
    expect(
      countEnclosureHits('<div className="rounded-full border border-border" />'),
    ).toBe(0)
  })
})

describe('isAllowlisted', () => {
  it('allows QR well, collection chrome, dropzones, skeletons, loading', () => {
    expect(isAllowlisted('components/dashboard/settings-totp-mfa-card.tsx')).toBe(true)
    expect(isAllowlisted('components/dashboard/collection-read-layout.tsx')).toBe(true)
    expect(isAllowlisted('app/dashboard/overview/references-data-table.tsx')).toBe(true)
    expect(isAllowlisted('app/dashboard/deals/cockpit/deal-document-dropzone.tsx')).toBe(
      true,
    )
    expect(isAllowlisted('components/dashboard/match-result-skeleton.tsx')).toBe(true)
    expect(isAllowlisted('app/dashboard/settings/loading.tsx')).toBe(true)
    expect(isAllowlisted('app/dashboard/deals/page.tsx')).toBe(false)
  })
})

describe('zoneFor', () => {
  it('maps inventory zones', () => {
    expect(zoneFor('app/dashboard/page.tsx')).toBe('app')
    expect(zoneFor('components/deal-status-badge.tsx')).toBe('components')
    expect(zoneFor('lib/copy.ts')).toBe('lib')
  })
})
