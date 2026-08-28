import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { extractEligibilityCriteriaFromRfpText } from '@/lib/deals/extract-eligibility-criteria'
import { MAX_RFP_CHARS } from '@/lib/rfp-requirements'

const DOCUMENT_TEXT = 'A'.repeat(80)

function jsonResponse() {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ criteria: [] }) } }],
    }),
  }
}

describe('extractEligibilityCriteriaFromRfpText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not mark input truncated under the char cap', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())
    vi.stubGlobal('fetch', fetchMock)

    const result = await extractEligibilityCriteriaFromRfpText('sk-test', DOCUMENT_TEXT)

    expect(result).not.toHaveProperty('error')
    if ('error' in result) return
    expect(result.inputTruncated).toBe(false)
    expect(result.inputChars).toBe(DOCUMENT_TEXT.length)
  })

  it('marks input truncated and reports the original length, not the sliced one', async () => {
    const original = 'A'.repeat(MAX_RFP_CHARS + 1)
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())
    vi.stubGlobal('fetch', fetchMock)

    const result = await extractEligibilityCriteriaFromRfpText('sk-test', original)

    expect(result).not.toHaveProperty('error')
    if ('error' in result) return
    expect(result.inputTruncated).toBe(true)
    expect(result.inputChars).toBe(original.length)
    expect(result.inputChars).toBeGreaterThan(MAX_RFP_CHARS)

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      messages: Array<{ role: string; content: string }>
    }
    const sent = body.messages.find((m) => m.role === 'user')?.content ?? ''
    expect(sent).toHaveLength(MAX_RFP_CHARS)
  })
})
