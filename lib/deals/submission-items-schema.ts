type SubmissionItemConfidence = 'high' | 'low'
type SubmissionItemMatchSource = 'pattern' | 'model'
export type SubmissionItemForm = 'strict' | 'loose'

export type ExtractedSubmissionItem = {
  identifier: string | null
  title: string
  form?: SubmissionItemForm
  confidence?: SubmissionItemConfidence
  matchSource?: SubmissionItemMatchSource
}

const MAX_ITEMS = 40
const MAX_TITLE = 300
const MAX_IDENTIFIER = 32

function parseItem(raw: unknown): ExtractedSubmissionItem | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  if (!title) return null
  const identifierRaw = typeof o.identifier === 'string' ? o.identifier.trim() : ''
  return {
    identifier: identifierRaw ? identifierRaw.slice(0, MAX_IDENTIFIER) : null,
    title: title.slice(0, MAX_TITLE),
  }
}

export function parseSubmissionItemsResponse(raw: unknown): ExtractedSubmissionItem[] {
  if (!raw || typeof raw !== 'object') return []
  const obj = raw as { items?: unknown }
  if (!Array.isArray(obj.items)) return []

  const out: ExtractedSubmissionItem[] = []
  for (const item of obj.items) {
    const parsed = parseItem(item)
    if (parsed) out.push(parsed)
  }
  return out.slice(0, MAX_ITEMS)
}
