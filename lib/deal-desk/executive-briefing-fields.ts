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
}

export const EMPTY_EXECUTIVE_BRIEFING: DealDeskExecutiveBriefingFields = {
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
}

export function normalizeExecutiveBriefingFields(
  raw: unknown
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
  }
}
