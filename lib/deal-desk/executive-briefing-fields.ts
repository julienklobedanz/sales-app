/** Aus RFP-Dokumenten extrahierte Felder für das Executive Briefing (Label: Wert). */

export type DealDeskCapabilityRisk = {
  kind: 'critical' | 'high' | 'delivery'
  title: string
  detail: string
}

export type DealDeskExecutiveBriefingFields = {
  submissionDeadline: string | null
  desiredServiceStart: string | null
  expectedDealVolume: string | null
  bidInvestment: string | null
  strategicAssessment: string | null
  techFocus: string | null
  governance: string | null
  economicDecisionMaker: string | null
  competition: string | null
  ourLeverage: string | null
  tenderProcedure: string | null
  keyTakeaways: string[]
  capabilityRisks: DealDeskCapabilityRisk[]
  /** KI-Klassifizierung (Domänen-Tags, z. B. Cybersicherheit, KRITIS). */
  domainTags: string[]
  /** Kompakter Standort für Meta-Leiste (z. B. „Stuttgart, DE“). */
  projectLocation: string | null
  bidderRequirements: string[]
  roleQualifications: string[]
  specialConditions: string[]
  /**
   * Unterlagen, die mit dem Angebot einzureichen sind
   * (Angebotsformular, Referenzen, Zertifikate, Preisblatt …) — nicht die hochgeladenen RFP-PDFs.
   */
  requiredSubmissionDocuments: string[]
  /** Notice-artige Kurz-Projektübersicht (2–4 Sätze, neutral). */
  projectOverviewPlain: string | null
}

const EMPTY_EXECUTIVE_BRIEFING: DealDeskExecutiveBriefingFields = {
  submissionDeadline: null,
  desiredServiceStart: null,
  expectedDealVolume: null,
  bidInvestment: null,
  strategicAssessment: null,
  techFocus: null,
  governance: null,
  economicDecisionMaker: null,
  competition: null,
  ourLeverage: null,
  tenderProcedure: null,
  keyTakeaways: [],
  capabilityRisks: [],
  domainTags: [],
  projectLocation: null,
  bidderRequirements: [],
  roleQualifications: [],
  specialConditions: [],
  requiredSubmissionDocuments: [],
  projectOverviewPlain: null,
}

export function normalizeExecutiveBriefingFields(
  raw: unknown,
): DealDeskExecutiveBriefingFields {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_EXECUTIVE_BRIEFING }

  const o = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

  const keyTakeaways: string[] = []
  if (Array.isArray(o.keyTakeaways)) {
    for (const item of o.keyTakeaways) {
      if (typeof item === 'string' && item.trim()) keyTakeaways.push(item.trim())
    }
  }

  const stringList = (key: string): string[] => {
    const items: string[] = []
    const src = o[key]
    if (!Array.isArray(src)) return items
    for (const item of src) {
      if (typeof item === 'string' && item.trim()) items.push(item.trim())
    }
    return items
  }

  const capabilityRisks: DealDeskCapabilityRisk[] = []
  if (Array.isArray(o.capabilityRisks)) {
    for (const item of o.capabilityRisks) {
      if (!item || typeof item !== 'object') continue
      const r = item as Record<string, unknown>
      const title = str(r.title)
      const detail = str(r.detail) ?? ''
      if (!title) continue
      const kindRaw = r.kind
      const kind =
        kindRaw === 'critical' || kindRaw === 'high' || kindRaw === 'delivery'
          ? kindRaw
          : 'high'
      capabilityRisks.push({ kind, title, detail })
    }
  }

  return {
    submissionDeadline: str(o.submissionDeadline),
    desiredServiceStart: str(o.desiredServiceStart),
    expectedDealVolume: str(o.expectedDealVolume),
    bidInvestment: str(o.bidInvestment),
    strategicAssessment: str(o.strategicAssessment),
    techFocus: str(o.techFocus),
    governance: str(o.governance),
    economicDecisionMaker: str(o.economicDecisionMaker),
    competition: str(o.competition),
    ourLeverage: str(o.ourLeverage),
    tenderProcedure: str(o.tenderProcedure),
    keyTakeaways,
    capabilityRisks,
    domainTags: stringList('domainTags'),
    projectLocation: str(o.projectLocation),
    bidderRequirements: stringList('bidderRequirements'),
    roleQualifications: stringList('roleQualifications'),
    specialConditions: stringList('specialConditions'),
    requiredSubmissionDocuments: stringList('requiredSubmissionDocuments'),
    projectOverviewPlain: str(o.projectOverviewPlain),
  }
}
