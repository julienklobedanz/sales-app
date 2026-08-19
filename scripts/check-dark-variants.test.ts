import { describe, expect, it } from 'vitest'

import {
  countDarkHits,
  isExcludedPath,
  scanRepo,
  zoneFor,
} from './check-dark-variants.mjs'

describe('countDarkHits', () => {
  it('matches dark: tokens including nested variants', () => {
    expect(countDarkHits('text-amber-900 dark:text-amber-200')).toBe(1)
    expect(
      countDarkHits(
        'dark:hover:bg-input/50 dark:data-[state=active]:border-input',
      ),
    ).toBe(2)
  })

  it('does not match .dark class selectors', () => {
    expect(countDarkHits('.dark { --background: black; }')).toBe(0)
  })
})

describe('isExcludedPath', () => {
  it('skips tests and scans ui primitives', () => {
    expect(isExcludedPath('lib/foo.test.ts')).toBe(true)
    expect(isExcludedPath('components/ui/button.tsx')).toBe(false)
    expect(isExcludedPath('app/globals.css')).toBe(false)
  })
})

describe('zoneFor', () => {
  it('maps inventory zones', () => {
    expect(zoneFor('app/layout.tsx')).toBe('app')
    expect(zoneFor('components/ui/button.tsx')).toBe('components')
    expect(zoneFor('lib/copy.ts')).toBe('lib')
  })
})

describe('scanRepo', () => {
  it('phase 2: no dark: tokens in app, components, or lib', () => {
    expect(scanRepo().total).toBe(0)
  })
})
