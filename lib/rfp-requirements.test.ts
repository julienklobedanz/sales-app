import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { extractRequirementsFromRfpText, MAX_RFP_CHARS } from '@/lib/rfp-requirements'

const DOCUMENT_TEXT = 'A'.repeat(80)

function requirementItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `req-${i + 1}`,
    text: `Anforderung ${i + 1}`,
    category: 'Hosting',
  }))
}

function jsonResponse(requirements: ReturnType<typeof requirementItems>) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ requirements }) } }],
    }),
  }
}

describe('extractRequirementsFromRfpText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends seed on the chat-completions request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(requirementItems(3)))
    vi.stubGlobal('fetch', fetchMock)

    await extractRequirementsFromRfpText('sk-test', DOCUMENT_TEXT)

    expect(fetchMock).toHaveBeenCalledOnce()
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      seed?: number
    }
    expect(body.seed).toBe(1)
  })

  it('truncates to the same count the prompt asks for', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(requirementItems(40)))
    vi.stubGlobal('fetch', fetchMock)

    const result = await extractRequirementsFromRfpText('sk-test', DOCUMENT_TEXT)

    expect(result).not.toHaveProperty('error')
    if ('error' in result) return

    expect(result.truncated).toBe(true)
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      messages: Array<{ role: string; content: string }>
    }
    const prompt = body.messages.find((m) => m.role === 'system')?.content ?? ''
    expect(prompt).toContain(String(result.requirements.length))
  })

  it('does not mark truncated when the list is under the cap', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(requirementItems(8)))
    vi.stubGlobal('fetch', fetchMock)

    const result = await extractRequirementsFromRfpText('sk-test', DOCUMENT_TEXT)

    expect(result).not.toHaveProperty('error')
    if ('error' in result) return
    expect(result.truncated).toBe(false)
    expect(result.requirements).toHaveLength(8)
    expect(result.inputTruncated).toBe(false)
    expect(result.inputChars).toBe(DOCUMENT_TEXT.length)
  })

  it('does not mark input truncated under the char cap', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(requirementItems(3)))
    vi.stubGlobal('fetch', fetchMock)

    const result = await extractRequirementsFromRfpText('sk-test', DOCUMENT_TEXT)

    expect(result).not.toHaveProperty('error')
    if ('error' in result) return
    expect(result.inputTruncated).toBe(false)
    expect(result.inputChars).toBe(DOCUMENT_TEXT.length)
  })

  it('marks input truncated and reports the original length, not the sliced one', async () => {
    const original = 'A'.repeat(MAX_RFP_CHARS + 1)
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(requirementItems(3)))
    vi.stubGlobal('fetch', fetchMock)

    const result = await extractRequirementsFromRfpText('sk-test', original)

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
