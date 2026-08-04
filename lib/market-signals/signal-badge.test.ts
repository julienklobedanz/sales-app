import { describe, expect, it } from 'vitest'

import {
  newsPersonNameFromBody,
  resolveExecSignalBadge,
  resolveNewsSignalBadge,
} from './signal-badge'

describe('resolveExecSignalBadge', () => {
  it('marks title changes as Move', () => {
    expect(
      resolveExecSignalBadge({
        personTitleBefore: 'CIO',
        personTitleAfter: 'CTO',
        personName: 'Ada',
        eventKind: 'role_change',
      }),
    ).toBe('Move')
  })

  it('marks people news mentions as Executive', () => {
    expect(
      resolveExecSignalBadge({
        eventKind: 'news_mention',
        signalCategory: 'people',
        personName: 'Ada',
        changeSummary: 'Ada spricht auf einer Konferenz',
      }),
    ).toBe('Executive')
  })
})

describe('resolveNewsSignalBadge', () => {
  it('marks leadership titles as Move', () => {
    expect(resolveNewsSignalBadge('Maria Schulz wird CIO bei Siemens', 'Siemens')).toBe(
      'Move',
    )
  })

  it('marks other news as Company', () => {
    expect(
      resolveNewsSignalBadge('Aurubis eröffnet neues Werk in Bayern', 'Aurubis'),
    ).toBe('Company')
  })
})

describe('newsPersonNameFromBody', () => {
  it('extracts person when leadership move parses', () => {
    expect(
      newsPersonNameFromBody('Maria Schulz wird CIO bei Siemens', 'Siemens'),
    ).toMatch(/Maria/)
  })
})
