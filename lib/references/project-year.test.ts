import { describe, expect, it } from 'vitest'

import {
  compareReferencesByProjectYearDesc,
  projectYearFromDates,
} from './project-year'

describe('projectYearFromDates', () => {
  it('nimmt project_end vor project_start', () => {
    expect(projectYearFromDates('2019-06-01', '2015-01-01')).toBe(2019)
  })

  it('fällt auf project_start zurück', () => {
    expect(projectYearFromDates(null, '2015-01-01')).toBe(2015)
  })

  it('liefert null ohne Daten', () => {
    expect(projectYearFromDates(null, null)).toBeNull()
  })
})

describe('compareReferencesByProjectYearDesc', () => {
  it('sortiert nach Projektjahr absteigend und updated_at nur bei Gleichstand', () => {
    const rows = [
      { id: 'old', project_end: '2015-01-01', updated_at: '2026-08-15T00:00:00.000Z' },
      { id: 'new', project_end: '2019-12-01', updated_at: '2020-01-01T00:00:00.000Z' },
      {
        id: 'same-year-newer',
        project_end: '2019-01-01',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      { id: 'none', project_end: null, project_start: null, updated_at: '2026-01-01T00:00:00.000Z' },
    ]
    const sorted = [...rows].sort(compareReferencesByProjectYearDesc)
    expect(sorted.map((r) => r.id)).toEqual(['same-year-newer', 'new', 'old', 'none'])
  })
})
