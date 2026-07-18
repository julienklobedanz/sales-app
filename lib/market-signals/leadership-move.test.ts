import { describe, expect, it } from 'vitest'

import {
  formatSignalSourceLabel,
  isLeadershipMoveTitle,
  parseLeadershipMoveFromTitle,
} from './leadership-move'

describe('isLeadershipMoveTitle', () => {
  it('erkennt CEO-/Nachfolge-Titel', () => {
    expect(
      isLeadershipMoveTitle(
        'Tim Cook to become Apple Executive Chairman, John Ternus to become Apple CEO'
      )
    ).toBe(true)
    expect(isLeadershipMoveTitle('Maria Schulz wird CIO bei Siemens')).toBe(true)
    expect(isLeadershipMoveTitle('Aurubis eröffnet neues Werk in Bayern')).toBe(false)
  })
})

describe('parseLeadershipMoveFromTitle', () => {
  it('bevorzugt den neuen CEO bei Succession', () => {
    const parsed = parseLeadershipMoveFromTitle(
      'Tim Cook to become Apple Executive Chairman, John Ternus to become Apple CEO'
    )
    expect(parsed.isLeadershipMove).toBe(true)
    expect(parsed.eventKind).toBe('role_change')
    expect(parsed.personName).toBe('John Ternus')
    expect(parsed.titleAfter).toMatch(/CEO/i)
  })

  it('parst deutsche Ernennung', () => {
    const parsed = parseLeadershipMoveFromTitle('John Ternus wird CEO von Apple')
    expect(parsed.personName).toBe('John Ternus')
    expect(parsed.titleAfter).toMatch(/CEO/i)
    expect(parsed.eventKind).toBe('role_change')
  })

  it('markiert Leadership ohne Personen-Parse als Move-Hinweis', () => {
    const parsed = parseLeadershipMoveFromTitle('Apple ernennt neuen Vorstandsvorsitzenden')
    expect(parsed.isLeadershipMove).toBe(true)
    expect(parsed.personName).toBeNull()
  })
})

describe('formatSignalSourceLabel', () => {
  it('zeigt Publisher statt Google News', () => {
    expect(
      formatSignalSourceLabel({
        sourceLabel: 'Google News',
        title: 'Apple CEO switch - Capital',
        url: 'https://news.google.com/rss/articles/abc',
      })
    ).toBe('Capital')
  })

  it('erkennt Newsroom-Pfad', () => {
    expect(
      formatSignalSourceLabel({
        url: 'https://www.apple.com/newsroom/2026/04/john-ternus-named-ceo/',
        companyName: 'Apple',
      })
    ).toBe('Apple Newsroom')
  })
})
