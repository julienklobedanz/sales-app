import {
  normalizeSubmissionIdentifier,
  submissionItemMergeKey,
} from '@/lib/deals/submission-item-source-key'
import type {
  ExtractedSubmissionItem,
  SubmissionItemForm,
} from '@/lib/deals/submission-items-schema'

/**
 * Kennungen wie C-02.3 hängen am Beschreibungsteil des Auftraggebers, nicht an der Abgabe.
 * Hart verworfen — kein low-Kandidat.
 */
function isContractingAuthorityAnnexIdentifier(
  identifier: string | null | undefined,
): boolean {
  if (!identifier?.trim()) return false
  return /^[A-Z]-\d+/i.test(normalizeSubmissionIdentifier(identifier))
}

const OPEN_Q = '[\u201E\u201C\u0022\u00AB]'
const CLOSE_Q = '[\u201C\u201D\u0022\u00BB]'
const NOT_Q = '[^\u201E\u201C\u201D\u0022\u00AB\u00BB\n]'
/** Kennung, dann Titel irgendwo auf derselben Zeile — auch mit Text dazwischen (A6a). */
const ITEM_RE = new RegExp(
  String.raw`\b(Anlage|Anhang|Formblatt|Vordruck)\b\s+(A?\d+[a-zA-Z]?)(?<mid>[^\n\u201E\u201C\u0022\u00AB]*)` +
    OPEN_Q +
    String.raw`(?<title>${NOT_Q}{1,200})` +
    CLOSE_Q,
  'gi',
)

const STRICT_MID = /^[\s:.\-\u2013\u2014]*$/

function formFromMid(mid: string): SubmissionItemForm {
  return STRICT_MID.test(mid) ? 'strict' : 'loose'
}

export function extractSubmissionItemsByPattern(text: string): ExtractedSubmissionItem[] {
  ITEM_RE.lastIndex = 0
  const seen = new Set<string>()
  const items: ExtractedSubmissionItem[] = []
  for (const match of text.matchAll(ITEM_RE)) {
    const identifier = match[2]?.trim() ?? ''
    const mid = match.groups?.mid ?? ''
    const title = match.groups?.title?.trim() ?? ''
    if (!identifier || !title) continue
    if (/\bbis\b/i.test(mid)) continue
    if (isContractingAuthorityAnnexIdentifier(identifier)) continue
    const item: ExtractedSubmissionItem = {
      identifier,
      title,
      form: formFromMid(mid),
    }
    const key = submissionItemMergeKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    items.push(item)
  }
  return items
}

function asCandidate(
  item: ExtractedSubmissionItem,
  extras: Pick<ExtractedSubmissionItem, 'confidence' | 'matchSource'>,
): ExtractedSubmissionItem {
  return {
    identifier: item.identifier?.trim() || null,
    title: item.title.trim(),
    ...extras,
  }
}

/** Muster führt; Modell füllt nur neue Schlüssel. confidence setzt der Code. */
export function mergeSubmissionItems(
  patternItems: ExtractedSubmissionItem[],
  modelItems: ExtractedSubmissionItem[],
): ExtractedSubmissionItem[] {
  type Entry = { item: ExtractedSubmissionItem; fromPattern: boolean; fromModel: boolean }
  const byKey = new Map<string, Entry>()
  const order: string[] = []

  const consider = (raw: ExtractedSubmissionItem, fromPattern: boolean) => {
    const title = raw.title.trim()
    if (!title) return
    const identifier = raw.identifier?.trim() || null
    if (isContractingAuthorityAnnexIdentifier(identifier)) return
    const item: ExtractedSubmissionItem = {
      identifier,
      title,
      form: raw.form,
    }
    const key = submissionItemMergeKey(item)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { item, fromPattern, fromModel: !fromPattern })
      order.push(key)
      return
    }
    if (fromPattern) existing.fromPattern = true
    else existing.fromModel = true
    if (fromPattern) existing.item = item
  }

  for (const item of patternItems) consider(item, true)
  for (const item of modelItems) consider(item, false)

  return order.map((key) => {
    const entry = byKey.get(key)!
    if (entry.fromPattern && entry.fromModel) {
      return asCandidate(entry.item, { confidence: 'high', matchSource: 'pattern' })
    }
    if (entry.fromPattern) {
      const high = entry.item.form !== 'loose'
      return asCandidate(entry.item, {
        confidence: high ? 'high' : 'low',
        matchSource: 'pattern',
      })
    }
    return asCandidate(entry.item, { confidence: 'low', matchSource: 'model' })
  })
}
