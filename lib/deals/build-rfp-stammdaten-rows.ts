import { normalizeExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import type { PersistedDealDeskAnalysisSnapshot } from '@/lib/deal-desk/analysis-snapshot'
import { COPY } from '@/lib/copy'

export type RfpStammdatenRow = {
  key: string
  label: string
  value: string
}

function joinList(items: string[], max = 4): string | null {
  const cleaned = items.map((s) => s.trim()).filter(Boolean)
  if (cleaned.length === 0) return null
  if (cleaned.length <= max) return cleaned.join(' · ')
  return `${cleaned.slice(0, max).join(' · ')} · +${cleaned.length - max}`
}

/** Stammdaten aus RFP-Snapshot — getrennt von Deal-Fakten (CRM/manuell). */
export function buildRfpStammdatenRows(
  snap: PersistedDealDeskAnalysisSnapshot,
): RfpStammdatenRow[] {
  const briefing = normalizeExecutiveBriefingFields(snap.executiveBriefing)
  const labels = COPY.deals.cockpit.stammdatenFields
  const rows: RfpStammdatenRow[] = []

  const push = (key: string, label: string, value: string | null | undefined) => {
    const v = value?.trim()
    if (!v) return
    rows.push({ key, label, value: v })
  }

  push('customer', labels.customer, snap.customerName)
  push('documents', labels.documents, joinList(briefing.requiredSubmissionDocuments, 6))
  push('location', labels.location, briefing.projectLocation)
  push('volume', labels.volume, briefing.expectedDealVolume)
  push('submissionDeadline', labels.submissionDeadline, briefing.submissionDeadline)
  push('serviceStart', labels.serviceStart, briefing.desiredServiceStart)
  push('procedure', labels.procedure, briefing.tenderProcedure)
  push('contact', labels.contact, briefing.economicDecisionMaker)
  push('techFocus', labels.techFocus, briefing.techFocus)
  push('governance', labels.governance, briefing.governance)
  push('qualifications', labels.qualifications, joinList(briefing.bidderRequirements))
  push('roles', labels.roles, joinList(briefing.roleQualifications))
  push('domains', labels.domains, joinList(briefing.domainTags))
  push(
    'specialConditions',
    labels.specialConditions,
    joinList(briefing.specialConditions, 3),
  )

  return rows
}
