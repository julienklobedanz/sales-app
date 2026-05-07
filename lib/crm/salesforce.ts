export function buildSalesforceOpportunityUrl(params: {
  opportunityId: string | null | undefined
  baseUrl?: string | null
}): string | null {
  const oppId = String(params.opportunityId ?? '').trim()
  if (!oppId) return null

  const rawBase = String(params.baseUrl ?? '').trim()
  if (rawBase) {
    const normalizedBase = /^https?:\/\//i.test(rawBase) ? rawBase : `https://${rawBase}`
    const base = normalizedBase.replace(/\/$/, '')
    return `${base}/lightning/r/Opportunity/${encodeURIComponent(oppId)}/view`
  }

  // Fallback ohne org-spezifische Domain: öffnet Login mit Opportunity-ID als Startpfad.
  return `https://login.salesforce.com/${encodeURIComponent(oppId)}`
}

