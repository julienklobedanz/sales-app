import { describe, expect, it } from 'vitest'
import { diffMonthsUtc, formatDateUtcDe, formatNumberDe } from './format'

describe('formatDateUtcDe', () => {
  it('formatiert ISO-Date deterministisch in DD.MM.YYYY (UTC)', () => {
    expect(formatDateUtcDe('2026-04-01T23:59:59.000Z')).toBe('01.04.2026')
    expect(formatDateUtcDe('2026-01-09T00:00:00.000Z')).toBe('09.01.2026')
  })
})

describe('formatNumberDe', () => {
  it('liefert Gedankenstrich für null/leer', () => {
    expect(formatNumberDe(null)).toBe('—')
    expect(formatNumberDe(undefined)).toBe('—')
    expect(formatNumberDe('')).toBe('—')
  })

  it('formatiert Zahlen deutsch', () => {
    expect(formatNumberDe(5000000)).toBe('5.000.000')
    expect(formatNumberDe('5.000.000')).toBe('5.000.000')
  })

  it('fällt bei NaN auf Original zurück', () => {
    expect(formatNumberDe('abc')).toBe('abc')
  })
})

describe('diffMonthsUtc', () => {
  it('berechnet Monat-Diff in UTC, niemals negativ', () => {
    expect(diffMonthsUtc('2026-01-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z')).toBe(
      3,
    )
    expect(diffMonthsUtc('2026-04-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(
      0,
    )
  })

  it('liefert null bei invaliden Daten', () => {
    expect(diffMonthsUtc('not-a-date', '2026-01-01T00:00:00.000Z')).toBeNull()
  })
})

