type ComplianceDocumentDealUsageRequirement = {
  id: string
  text: string
}

type ComplianceDocumentDealUsageDeal = {
  dealId: string
  dealTitle: string
  requirements: ComplianceDocumentDealUsageRequirement[]
}

export type ComplianceDocumentDealUsage = {
  dealCount: number
  deals: ComplianceDocumentDealUsageDeal[]
}

export type ComplianceDocumentUsageLink = {
  documentId: string
  dealId: string
  dealTitle: string
  requirementId: string
  requirementText: string
}

export type ComplianceDocumentUsageById = Record<string, ComplianceDocumentDealUsage>

/** Distinct Deals je document_id; Anforderungen unter dem Deal gruppiert. */
export function buildComplianceDocumentDealUsage(
  links: readonly ComplianceDocumentUsageLink[],
): ComplianceDocumentUsageById {
  const byDoc = new Map<
    string,
    Map<string, { title: string; requirements: Map<string, string> }>
  >()

  for (const link of links) {
    let deals = byDoc.get(link.documentId)
    if (!deals) {
      deals = new Map()
      byDoc.set(link.documentId, deals)
    }
    let deal = deals.get(link.dealId)
    if (!deal) {
      deal = { title: link.dealTitle, requirements: new Map() }
      deals.set(link.dealId, deal)
    }
    deal.requirements.set(link.requirementId, link.requirementText)
  }

  const result: ComplianceDocumentUsageById = {}
  for (const [documentId, deals] of byDoc) {
    const dealList: ComplianceDocumentDealUsageDeal[] = [...deals.entries()]
      .map(([dealId, deal]) => ({
        dealId,
        dealTitle: deal.title,
        requirements: [...deal.requirements.entries()]
          .map(([id, text]) => ({ id, text }))
          .sort((a, b) => a.text.localeCompare(b.text, 'de')),
      }))
      .sort((a, b) => a.dealTitle.localeCompare(b.dealTitle, 'de'))
    result[documentId] = {
      dealCount: dealList.length,
      deals: dealList,
    }
  }
  return result
}
