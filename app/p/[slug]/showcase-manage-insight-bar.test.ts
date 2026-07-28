import { describe, expect, it } from 'vitest'
import {
  countryCodeToFlagEmoji,
  formatActiveDurationDe,
  formatManageLastViewLabel,
  formatRelativeAgoDe,
} from '@/app/p/[slug]/showcase-manage-insight-bar'

describe('manage insight labels', () => {
  it('maps ISO country to flag emoji', () => {
    expect(countryCodeToFlagEmoji('DE')).toBe('🇩🇪')
    expect(countryCodeToFlagEmoji('us')).toBe('🇺🇸')
    expect(countryCodeToFlagEmoji('Europa')).toBe('🌐')
  })

  it('formats active duration as Min. Sek.', () => {
    expect(formatActiveDurationDe(72)).toBe('1 Min. 12 Sek.')
    expect(formatActiveDurationDe(0)).toBe('0 Min. 0 Sek.')
  })

  it('formats relative ago with days after 48h', () => {
    const now = Date.parse('2026-07-28T12:00:00.000Z')
    expect(formatRelativeAgoDe('2026-07-28T11:23:00.000Z', now)).toBe('vor 37 Min')
    expect(formatRelativeAgoDe('2026-07-28T05:00:00.000Z', now)).toBe('vor 7 Std')
    expect(formatRelativeAgoDe('2026-07-25T12:00:00.000Z', now)).toBe('vor 3 Tagen')
  })

  it('builds last-view label with middots', () => {
    const label = formatManageLastViewLabel({
      countryCode: 'DE',
      activeSeconds: 72,
      startedAtIso: '2026-07-28T05:00:00.000Z',
    })
    expect(label).toMatch(/^Letzte Ansicht aus 🇩🇪 \(1 Min\. 12 Sek\.\) · vor /)
  })
})
