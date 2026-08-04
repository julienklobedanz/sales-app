import type { DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'

export type DealDeskDocumentRef = {
  id: string
  file_name: string
  storage_path?: string | null
  mime_type?: string | null
}

const CONTRACT_NAME_PATTERN =
  /vertrag|contract|anhang|avv|dpa|sla|haftung|liability|bedingungen|terms|legal|compliance|versicherung/i

const LEGAL_FLAG_PATTERN =
  /haftung|pönale|penalty|sla|vertrag|liability|schadens|konventional|festpreis|garantie/i

export function isContractLikeDocument(fileName: string): boolean {
  return CONTRACT_NAME_PATTERN.test(fileName)
}

export function resolveDocumentByFileName(
  fileName: string | null | undefined,
  documents: DealDeskDocumentRef[],
): DealDeskDocumentRef | null {
  if (!fileName?.trim()) return null
  const normalized = fileName.trim().toLowerCase()
  return (
    documents.find((d) => d.file_name.toLowerCase() === normalized) ??
    documents.find((d) => d.file_name.toLowerCase().includes(normalized)) ??
    documents.find((d) => normalized.includes(d.file_name.toLowerCase())) ??
    null
  )
}

/** Ordnet eine Red Flag dem wahrscheinlichsten Vertrags-/Anhang-Dokument zu. */
export function guessSourceDocumentForRedFlag(
  flag: Pick<DealDeskRedFlag, 'title' | 'excerpt' | 'pageHint' | 'sourceFileName'>,
  documents: DealDeskDocumentRef[],
): DealDeskDocumentRef | null {
  const fromName = resolveDocumentByFileName(flag.sourceFileName, documents)
  if (fromName) return fromName

  const hint = `${flag.pageHint ?? ''} ${flag.title} ${flag.excerpt}`.toLowerCase()
  const contractDocs = documents.filter((d) => isContractLikeDocument(d.file_name))

  if (hint.includes('anhang')) {
    const anhang = contractDocs.find((d) => /anhang/i.test(d.file_name))
    if (anhang) return anhang
  }
  if (hint.includes('vertrag') || hint.includes('§')) {
    const vertrag = contractDocs.find((d) => /vertrag|contract/i.test(d.file_name))
    if (vertrag) return vertrag
  }
  if (/kap\.|kapitel|leistungsbeschreibung/i.test(hint)) {
    const lb = documents.find((d) => /leistung|lb|scope/i.test(d.file_name))
    if (lb) return lb
  }

  if (
    LEGAL_FLAG_PATTERN.test(`${flag.title} ${flag.excerpt}`) &&
    contractDocs.length > 0
  ) {
    return contractDocs[0] ?? null
  }

  return null
}

export function enrichRedFlagsWithDocuments(
  flags: DealDeskRedFlag[],
  documents: DealDeskDocumentRef[],
): DealDeskRedFlag[] {
  return flags.map((flag) => {
    const doc =
      (flag.sourceDocumentId
        ? documents.find((d) => d.id === flag.sourceDocumentId)
        : null) ?? guessSourceDocumentForRedFlag(flag, documents)

    if (!doc) return flag

    return {
      ...flag,
      sourceDocumentId: doc.id,
      sourceFileName: doc.file_name,
    }
  })
}

/** Eindeutige Dokumente für alle markierten Legal-Flags (mit Fallback auf Vertragswerke). */
export function collectLegalAttachmentDocuments(
  markedFlags: DealDeskRedFlag[],
  allDocuments: DealDeskDocumentRef[],
): DealDeskDocumentRef[] {
  const byId = new Map<string, DealDeskDocumentRef>()

  for (const flag of markedFlags) {
    const doc =
      (flag.sourceDocumentId
        ? allDocuments.find((d) => d.id === flag.sourceDocumentId)
        : null) ?? guessSourceDocumentForRedFlag(flag, allDocuments)

    if (doc?.storage_path) {
      byId.set(doc.id, doc)
    }
  }

  if (byId.size === 0 && markedFlags.length > 0) {
    for (const doc of allDocuments) {
      if (doc.storage_path && isContractLikeDocument(doc.file_name)) {
        byId.set(doc.id, doc)
        if (byId.size >= 3) break
      }
    }
  }

  return [...byId.values()]
}
