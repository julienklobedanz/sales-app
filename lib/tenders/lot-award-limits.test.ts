import { describe, expect, it } from 'vitest'

import { COPY } from '@/lib/copy'

import {
  buildLotAwardLimitFactRows,
  formatLotAwardLimit,
  formatLotPriorityRequired,
  parseOptionalPositiveInt,
  parseLotPrioritySelect,
} from './lot-award-limits'

describe('formatLotAwardLimit', () => {
  it('zeigt unbekannt, Einzahl und Mehrzahl ohne Los-Anzahl', () => {
    expect(formatLotAwardLimit.length).toBe(1)
    expect(formatLotAwardLimit(null)).toBe(COPY.tenders.unknown)
    expect(formatLotAwardLimit(undefined)).toBe(COPY.tenders.unknown)
    expect(formatLotAwardLimit(1)).toBe(COPY.tenders.lotCountSingular)
    expect(formatLotAwardLimit(8)).toBe('8 Lose')
  })
})

describe('formatLotPriorityRequired', () => {
  it('unterscheidet ja, nein und unbekannt', () => {
    expect(formatLotPriorityRequired(true)).toBe(COPY.tenders.yes)
    expect(formatLotPriorityRequired(false)).toBe(COPY.tenders.no)
    expect(formatLotPriorityRequired(null)).toBe(COPY.tenders.unknown)
  })
})

describe('buildLotAwardLimitFactRows', () => {
  it('liefert drei Zeilen, auch wenn alles unbekannt ist', () => {
    const rows = buildLotAwardLimitFactRows({
      maxLotsBid: null,
      maxLotsAward: null,
      lotPriorityRequired: null,
    })
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.value)).toEqual([
      COPY.tenders.unknown,
      COPY.tenders.unknown,
      COPY.tenders.unknown,
    ])
  })
})

describe('parseOptionalPositiveInt', () => {
  it('leere Zahl wird null, 0 ist ein Fehler', () => {
    expect(parseOptionalPositiveInt('')).toEqual({ ok: true, value: null })
    expect(parseOptionalPositiveInt('  ')).toEqual({ ok: true, value: null })
    expect(parseOptionalPositiveInt('8')).toEqual({ ok: true, value: 8 })
    expect(parseOptionalPositiveInt('0').ok).toBe(false)
  })
})

describe('parseLotPrioritySelect', () => {
  it('hält null und false auseinander', () => {
    expect(parseLotPrioritySelect('unknown')).toBeNull()
    expect(parseLotPrioritySelect('yes')).toBe(true)
    expect(parseLotPrioritySelect('no')).toBe(false)
  })
})
