import type { PdfReference } from './types'

function summarizeVolume(raw: string | null): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  if (!Number.isFinite(n) || n <= 0) return '>100k EUR'
  if (n >= 1_000_000) return '>1M EUR'
  if (n >= 500_000) return '500k-1M EUR'
  if (n >= 100_000) return '100k-500k EUR'
  return '<100k EUR'
}

function genericizeTechnologies(text: string | null): string | null {
  if (!text) return null
  return text.replace(
    /\b(SAP|Salesforce|AWS|Azure|GCP|Microsoft|Oracle|ServiceNow|Kubernetes|Snowflake|PowerBI|Tableau)\b/gi,
    'führende Enterprise-Technologie'
  )
}

export function anonymizeReferenceForOutput(reference: PdfReference): PdfReference {
  const industry = reference.industry?.trim() || 'Branche'
  return {
    ...reference,
    status: 'approved',
    company_name: `Führendes ${industry}-Unternehmen`,
    company_logo_url: null,
    website: null,
    customer_contact: null,
    volume_eur: summarizeVolume(reference.volume_eur),
    contract_type: genericizeTechnologies(reference.contract_type),
    incumbent_provider: genericizeTechnologies(reference.incumbent_provider),
    competitors: genericizeTechnologies(reference.competitors),
    customer_challenge: genericizeTechnologies(reference.customer_challenge),
    our_solution: genericizeTechnologies(reference.our_solution),
    summary: genericizeTechnologies(reference.summary),
    tags: reference.tags
      ? reference.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .map(() => 'Enterprise-Transformation')
          .slice(0, 3)
          .join(', ')
      : null,
  }
}
