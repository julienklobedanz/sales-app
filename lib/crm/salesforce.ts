function normalizeSalesforceBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** Org-spezifische Salesforce-Instanz (Client: `NEXT_PUBLIC_SALESFORCE_INSTANCE_URL`). */
export function getSalesforceInstanceUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SALESFORCE_INSTANCE_URL?.trim() ||
    process.env.SALESFORCE_INSTANCE_URL?.trim()
  if (!raw) return 'https://login.salesforce.com'
  return normalizeSalesforceBase(raw)
}

export function buildSalesforceTaskUrl(params?: {
  subject?: string
  body?: string
}): string {
  const base = getSalesforceInstanceUrl()
  if (!params?.subject?.trim() && !params?.body?.trim()) {
    return `${base}/lightning/o/Task/list`
  }
  const values = encodeURIComponent(
    JSON.stringify({
      Subject: params.subject ?? '',
      Description: params.body ?? '',
    }),
  )
  return `${base}/lightning/o/Task/new?defaultFieldValues=${values}`
}

export function buildSalesforceOpportunityUrl(params: {
  opportunityId: string | null | undefined
  baseUrl?: string | null
}): string | null {
  const oppId = String(params.opportunityId ?? '').trim()
  if (!oppId) return null

  const rawBase = String(params.baseUrl ?? getSalesforceInstanceUrl()).trim()
  const base = normalizeSalesforceBase(rawBase)
  if (base !== 'https://login.salesforce.com' || params.baseUrl) {
    return `${base}/lightning/r/Opportunity/${encodeURIComponent(oppId)}/view`
  }

  // Fallback ohne org-spezifische Domain: öffnet Login mit Opportunity-ID als Startpfad.
  return `https://login.salesforce.com/${encodeURIComponent(oppId)}`
}
