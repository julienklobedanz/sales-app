import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { persistExtractedSubmissionItems } from '@/lib/deals/persist-submission-items'
import { buildExtractedSubmissionItemSourceKey } from '@/lib/deals/submission-item-source-key'

const ITEM = {
  identifier: 'A1',
  title: 'Bewerbungsbogen',
  confidence: 'high' as const,
  matchSource: 'pattern' as const,
}

const LOW_ITEM = {
  identifier: 'A6a',
  title: 'Weitere Angaben zum Bewerber',
  confidence: 'low' as const,
  matchSource: 'pattern' as const,
}

function clientWithRpc(rpc = vi.fn().mockResolvedValue({ error: null })) {
  return { rpc }
}

describe('persistExtractedSubmissionItems', () => {
  it('upserts against the source document without a deadline', async () => {
    const client = clientWithRpc()
    const result = await persistExtractedSubmissionItems(client as never, {
      organizationId: 'org-1',
      sourceDocumentId: 'doc-1',
      items: [ITEM, LOW_ITEM],
    })
    expect(result).toEqual({ count: 2, low: 1 })
    expect(client.rpc).toHaveBeenCalledTimes(2)
    expect(client.rpc.mock.calls[0]![0]).toBe('upsert_extracted_submission_item')
    expect(client.rpc.mock.calls[0]![1]).toEqual({
      p_organization_id: 'org-1',
      p_source_document_id: 'doc-1',
      p_identifier: 'A1',
      p_title: 'Bewerbungsbogen',
      p_source_key: buildExtractedSubmissionItemSourceKey('doc-1', ITEM),
      p_sort_order: 0,
      p_confidence: 'high',
      p_match_source: 'pattern',
    })
    expect(client.rpc.mock.calls[0]![1]).not.toHaveProperty('p_deadline_id')
    expect(client.rpc.mock.calls[0]![1]).not.toHaveProperty('p_state')
  })

  it('writes zero rows when there are no candidates', async () => {
    const client = clientWithRpc()
    const result = await persistExtractedSubmissionItems(client as never, {
      organizationId: 'org-1',
      sourceDocumentId: 'doc-1',
      items: [],
    })
    expect(result).toEqual({ count: 0, low: 0 })
    expect(client.rpc).not.toHaveBeenCalled()
  })
})
