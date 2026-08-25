import { complianceDocumentTypeLabel } from '@/lib/compliance/document-types'
import { complianceNeedMatchesBlob } from '@/lib/deals/compliance-need-match'
import type { RequirementLinkPickDoc } from '@/lib/deals/requirement-link-types'

function compareTypeThenTitle(
  a: RequirementLinkPickDoc,
  b: RequirementLinkPickDoc,
): number {
  const typeCmp = complianceDocumentTypeLabel(a.documentType).localeCompare(
    complianceDocumentTypeLabel(b.documentType),
    'de',
  )
  if (typeCmp !== 0) return typeCmp
  return a.title.localeCompare(b.title, 'de')
}

/** Heuristik-Treffer oben, nicht vorausgewählt; Rest Typ, dann Titel. */
export function sortComplianceDocsForRequirementLink(args: {
  docs: readonly RequirementLinkPickDoc[]
  need: string
  linkedDocumentIds: ReadonlySet<string>
}): Array<RequirementLinkPickDoc & { suggested: boolean }> {
  const available = args.docs.filter((doc) => !args.linkedDocumentIds.has(doc.id))
  const suggested: RequirementLinkPickDoc[] = []
  const rest: RequirementLinkPickDoc[] = []
  for (const doc of available) {
    const blob = `${doc.documentType} ${doc.title}`
    if (complianceNeedMatchesBlob(args.need, blob)) suggested.push(doc)
    else rest.push(doc)
  }
  suggested.sort(compareTypeThenTitle)
  rest.sort(compareTypeThenTitle)
  return [
    ...suggested.map((doc) => ({ ...doc, suggested: true })),
    ...rest.map((doc) => ({ ...doc, suggested: false })),
  ]
}
