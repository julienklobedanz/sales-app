import { describe, expect, it } from 'vitest'

import {
  countPaletteHits,
  countWhiteBlackHits,
  isExcludedPath,
  isPaletteAllowlisted,
  isWhiteBlackAllowlisted,
  scanRepo,
  zoneFor,
} from './check-raw-palette-classes.mjs'

describe('isExcludedPath', () => {
  it('skips theme-shell CSS and tests, scans ui primitives', () => {
    expect(isExcludedPath('components/ui/button.tsx')).toBe(false)
    expect(isExcludedPath('components/ui/badge.tsx')).toBe(false)
    expect(isExcludedPath('styles/theme-shell.css')).toBe(true)
    expect(isExcludedPath('styles/theme-shell-content.css')).toBe(true)
    expect(isExcludedPath('lib/deal-desk/benchmark-risk.test.ts')).toBe(true)
    expect(isExcludedPath('lib/foo.integration.test.ts')).toBe(true)
  })

  it('scans app, components, and lib production files', () => {
    expect(isExcludedPath('components/deal-status-badge.tsx')).toBe(false)
    expect(isExcludedPath('app/(app)/deals/page.tsx')).toBe(false)
    expect(isExcludedPath('lib/ui/status-tone.ts')).toBe(false)
  })
})

describe('countPaletteHits', () => {
  it('counts family-NNN tokens and ignores semantic utilities', () => {
    expect(countPaletteHits('bg-slate-50 text-red-600 from-emerald-500/[0.06]')).toBe(3)
    expect(
      countPaletteHits('text-muted-foreground bg-status-success border-border'),
    ).toBe(0)
  })
})

describe('countWhiteBlackHits', () => {
  it('counts white/black utilities including opacity modifiers', () => {
    expect(countWhiteBlackHits('bg-white text-white bg-black/60 border-white/10')).toBe(4)
  })

  it('ignores semantic tokens', () => {
    expect(
      countWhiteBlackHits(
        'bg-card bg-background text-primary-foreground text-destructive-foreground text-status-success-foreground',
      ),
    ).toBe(0)
  })
})

describe('isWhiteBlackAllowlisted', () => {
  it('allows brand panel, QR well, leftover raw-palette text-white, and logo placeholder', () => {
    expect(isWhiteBlackAllowlisted('components/auth-brand-panel.tsx')).toBe(true)
    expect(
      isWhiteBlackAllowlisted('components/dashboard/settings-totp-mfa-card.tsx'),
    ).toBe(true)
    expect(isWhiteBlackAllowlisted('app/onboarding/steps/workspace-step.tsx')).toBe(true)
    expect(isWhiteBlackAllowlisted('components/ui/company-logo.tsx')).toBe(true)
    expect(isWhiteBlackAllowlisted('lib/ui/status-tone.ts')).toBe(false)
  })
})

describe('isPaletteAllowlisted', () => {
  it('allows the company-logo brand placeholder', () => {
    expect(isPaletteAllowlisted('components/ui/company-logo.tsx')).toBe(true)
    expect(isPaletteAllowlisted('components/ui/button.tsx')).toBe(false)
  })
})

describe('zoneFor', () => {
  it('maps inventory zones', () => {
    expect(zoneFor('app/(app)/page.tsx')).toBe('app')
    expect(zoneFor('components/deal-status-badge.tsx')).toBe('components')
    expect(zoneFor('lib/copy.ts')).toBe('lib')
  })
})

describe('scanRepo', () => {
  it('has no family-NNN hits in components/ui after allowlist', () => {
    const { byFile } = scanRepo()
    expect(byFile.filter((row) => row.rel.startsWith('components/ui/'))).toEqual([])
  })
})
