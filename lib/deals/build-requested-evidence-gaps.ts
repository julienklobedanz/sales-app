import type { OrgComplianceDoc } from '@/lib/deal-desk/compute-delivery-win-probability'
import type { DealDeskExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import type { EligibilityAssessment } from '@/lib/deals/eligibility-criteria-schema'
import { complianceDocMatchesNeed } from '@/lib/deals/compliance-need-match'
import { normalizeToken } from '@/lib/deals/normalize-token'

export type RequestedEvidenceGapItem = {
  id: string
  label: string
  detail: string
  severity: 'missing' | 'partial' | 'info'
}

function docMatchesNeed(docs: OrgComplianceDoc[], need: string): boolean {
  return docs.some((d) => complianceDocMatchesNeed(d, need))
}

/** Vom Kunden angefragte Nachweise / fehlende Compliance-Lücken für Risiko-Card. */
export function buildRequestedEvidenceGaps(input: {
  eligibilityAssessment: EligibilityAssessment | null
  executiveBriefing: DealDeskExecutiveBriefingFields
  complianceDocs: OrgComplianceDoc[]
}): RequestedEvidenceGapItem[] {
  const items: RequestedEvidenceGapItem[] = []
  const seen = new Set<string>()

  const push = (item: RequestedEvidenceGapItem) => {
    const key = normalizeToken(item.label)
    if (!key || seen.has(key)) return
    seen.add(key)
    items.push(item)
  }

  if (input.eligibilityAssessment) {
    for (const row of input.eligibilityAssessment.criteria) {
      if (row.dimension !== 'certification') continue
      if (row.status === 'met') continue
      const token = String(row.value ?? row.label ?? 'Nachweis').trim()
      push({
        id: `cert-${token}`,
        label: token || row.label,
        detail:
          row.detail || 'Kein passender Nachweis in Profil oder Compliance-Dokumenten.',
        severity: row.status === 'partial' ? 'partial' : 'missing',
      })
    }
  }

  for (const docLabel of input.executiveBriefing.requiredSubmissionDocuments ?? []) {
    const trimmed = docLabel.trim()
    if (!trimmed) continue
    const covered = docMatchesNeed(input.complianceDocs, trimmed)
    if (!covered) {
      push({
        id: `sub-${trimmed.slice(0, 40)}`,
        label: trimmed,
        detail:
          'In der Nachweis-Bibliothek nicht gefunden — ggf. hochladen oder manuell prüfen.',
        severity: 'missing',
      })
    }
  }

  for (const req of input.executiveBriefing.bidderRequirements ?? []) {
    const trimmed = req.trim()
    if (!trimmed || trimmed.length < 8) continue
    if (/zertifikat|iso|nachweis|compliance|audit|soc|tisax|bsi/i.test(trimmed)) {
      if (!docMatchesNeed(input.complianceDocs, trimmed)) {
        push({
          id: `bid-${trimmed.slice(0, 32)}`,
          label: trimmed.length > 72 ? `${trimmed.slice(0, 69)}…` : trimmed,
          detail: 'Anforderung aus Ausschreibung — Nachweis noch nicht zugeordnet.',
          severity: 'info',
        })
      }
    }
  }

  return items
}
