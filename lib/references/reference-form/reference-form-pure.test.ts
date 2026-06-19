import { describe, expect, it } from 'vitest'

import {
  dedupeContacts,
  dedupeCustomerContacts,
  formatThousandsDots,
  formatZodError,
  looksLikeProxyOrNetworkFailure,
  normalizeContactIdentity,
  normalizeTag,
  normalizeWrappedParagraphs,
  parseInitialTags,
} from '@/lib/references/reference-form/reference-form-pure'
import { z } from 'zod'

describe('normalizeWrappedParagraphs', () => {
  it('joins single line breaks within paragraphs', () => {
    expect(normalizeWrappedParagraphs('a\nb\n\nc')).toBe('a b\n\nc')
  })
})

describe('formatThousandsDots', () => {
  it('formats digit groups', () => {
    expect(formatThousandsDots('5000000')).toBe('5.000.000')
  })
})

describe('looksLikeProxyOrNetworkFailure', () => {
  it('detects fetch failures', () => {
    expect(looksLikeProxyOrNetworkFailure('Failed to fetch')).toBe(true)
    expect(looksLikeProxyOrNetworkFailure('validation error')).toBe(false)
  })
})

describe('normalizeTag', () => {
  it('title-cases lowercase tags', () => {
    expect(normalizeTag('cloud')).toBe('Cloud')
  })
})

describe('parseInitialTags', () => {
  it('dedupes case-insensitively', () => {
    expect(parseInitialTags('Cloud, cloud, SaaS')).toEqual(['Cloud', 'Saas'])
  })
})

describe('dedupeContacts', () => {
  it('removes duplicate ids and identities', () => {
    const list = [
      { id: '1', first_name: 'A', last_name: 'B', email: 'a@x.de' },
      { id: '2', first_name: 'A', last_name: 'B', email: 'a@x.de' },
    ]
    expect(dedupeContacts(list)).toHaveLength(1)
  })
})

describe('dedupeCustomerContacts', () => {
  it('removes duplicate ids', () => {
    const list = [{ id: '1' }, { id: '1' }]
    expect(dedupeCustomerContacts(list)).toHaveLength(1)
  })
})

describe('normalizeContactIdentity', () => {
  it('builds stable identity key', () => {
    expect(normalizeContactIdentity(['Anna', 'Müller', 'a@x.de'])).toBe('anna|müller|a@x.de')
  })
})

describe('formatZodError', () => {
  it('joins issue messages', () => {
    const err = z.string().min(1, 'Pflicht').safeParse('').error
    expect(formatZodError(err!)).toBe('Pflicht')
  })
})
