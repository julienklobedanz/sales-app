import { describe, expect, it } from 'vitest'
import {
  diffMonthsUtc,
  formatDateUtcDe,
  formatDealVolume,
  formatEmployeeCountDeDisplay,
  formatNumberDe,
  formatReferenceDate,
  parseGermanEmployeeCountInput,
} from './format'

describe('formatDateUtcDe', () => {
  it('formatiert ISO-Date deterministisch in DD.MM.YYYY (UTC)', () => {
    expect(formatDateUtcDe('2026-04-01T23:59:59.000Z')).toBe('01.04.2026')
    expect(formatDateUtcDe('2026-01-09T00:00:00.000Z')).toBe('09.01.2026')
  })
})

describe('formatReferenceDate', () => {
  it('formatiert reines Kalenderdatum YYYY-MM-DD ohne Zeitzonenverschiebung', () => {
    expect(formatReferenceDate('2026-04-02', 'de-DE')).toBe('02.04.2026')
    expect(formatReferenceDate('2026-04-02', 'iso')).toBe('2026-04-02')
    expect(formatReferenceDate('2026-04-02', 'en-US')).toBe('04/02/2026')
    expect(formatReferenceDate('2026-04-02', 'en-GB')).toBe('02/04/2026')
  })
})

describe('formatEmployeeCountDeDisplay', () => {
  it('zeigt Brandfetch-Obergrenze als 10.001+', () => {
    expect(formatEmployeeCountDeDisplay(10_001)).toBe('10.001+')
    expect(formatEmployeeCountDeDisplay(12_000)).toBe('12.000')
    expect(formatEmployeeCountDeDisplay(500)).toBe('500')
  })
})

describe('parseGermanEmployeeCountInput', () => {
  it('mappt 10.001+ auf gespeicherten Cap-Wert', () => {
    expect(parseGermanEmployeeCountInput('10.001+')).toBe(10_001)
    expect(parseGermanEmployeeCountInput('1.500')).toBe(1500)
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

describe('formatDealVolume', () => {
  it('liefert Gedankenstrich für leer', () => {
    expect(formatDealVolume(null)).toBe('—')
    expect(formatDealVolume('')).toBe('—')
  })

  it('formatiert reine Zahlen mit Tausenderpunkten und €', () => {
    expect(formatDealVolume('1500000')).toBe('1.500.000 €')
    expect(formatDealVolume('1.500.000')).toBe('1.500.000 €')
  })

  it('erkennt Währungstoken', () => {
    expect(formatDealVolume('EUR 250000')).toBe('250.000 €')
    expect(formatDealVolume('USD 1000000')).toBe('$ 1.000.000')
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

