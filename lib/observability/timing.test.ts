import { afterEach, describe, expect, it } from 'vitest'

import { setLogSink, type LogEntry } from '@/lib/observability/logger'
import { buildServerTimingHeader, withTiming } from '@/lib/observability/timing'

describe('withTiming', () => {
  const entries: LogEntry[] = []

  afterEach(() => {
    setLogSink(() => {})
    entries.length = 0
  })

  it('returns result and logs label with ms', async () => {
    setLogSink((entry) => entries.push(entry))

    const { result, ms } = await withTiming('test.op', async () => 42, {
      organizationId: 'org-1',
      resultCount: 1,
    })

    expect(result).toBe(42)
    expect(ms).toBeGreaterThanOrEqual(0)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.level).toBe('info')
    expect(entries[0]?.message).toBe('test.op')
    expect(entries[0]?.context).toMatchObject({
      label: 'test.op',
      organizationId: 'org-1',
      resultCount: 1,
    })
    expect(typeof entries[0]?.context?.ms).toBe('number')
  })

  it('rethrows errors from fn without swallowing', async () => {
    setLogSink(() => {})

    await expect(
      withTiming('test.fail', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
  })
})

describe('buildServerTimingHeader', () => {
  it('formats phases as Server-Timing header', () => {
    expect(
      buildServerTimingHeader([
        { name: 'match.embedding', ms: 120 },
        { name: 'match.rpc', ms: 45 },
      ]),
    ).toBe('match.embedding;dur=120, match.rpc;dur=45')
  })
})
