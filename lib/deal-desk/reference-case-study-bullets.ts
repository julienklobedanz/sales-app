import type { DealDeskMockAnalysis } from '@/lib/deal-desk/deal-analysis-types'

const MAX_CHALLENGE_BULLETS = 5

const LEGAL_REQUIREMENT_PATTERN =
  /haftung|pönale|vertragsstrafe|festpreis|referenz|zertifiz|iso\s*27001|berufshaftpflicht|mindestlohn|bietergemeinschaft/i

function firstSentence(text: string, max = 200): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const last = cut.lastIndexOf('.')
  return last > 40 ? cut.slice(0, last + 1) : `${cut}…`
}

function splitToBullets(text: string, max = MAX_CHALLENGE_BULLETS): string[] {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return []
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter((s) => s.length > 12)
  if (sentences.length >= 2) return sentences.slice(0, max)
  return [trimmed]
}

/** Herausforderung = Kunden-Challenge aus RFP-Kontext (nicht Red Flags / Legal). */
export function buildCustomerChallengeBullets(analysis: DealDeskMockAnalysis): string[] {
  const briefing = analysis.executiveBriefing
  const narrativeBullets: string[] = []

  if (briefing?.techFocus?.trim()) {
    narrativeBullets.push(`Scope & Zielbild: ${briefing.techFocus.trim()}`)
  }
  if (briefing?.governance?.trim()) {
    narrativeBullets.push(`Rahmenbedingungen: ${briefing.governance.trim()}`)
  }
  if (briefing?.strategicAssessment?.trim()) {
    narrativeBullets.push(...splitToBullets(briefing.strategicAssessment, 3))
  }

  const deduped = [...new Set(narrativeBullets.map((b) => b.trim()).filter(Boolean))]
  if (deduped.length >= 2) {
    return deduped.slice(0, MAX_CHALLENGE_BULLETS)
  }

  const icpBullets = splitToBullets(analysis.icpSummary ?? '')
  if (icpBullets.length >= 2) {
    return icpBullets.slice(0, MAX_CHALLENGE_BULLETS)
  }

  const businessReqs = analysis.draftRows
    .filter(
      (r) => r.requirement?.trim() && !LEGAL_REQUIREMENT_PATTERN.test(r.requirement),
    )
    .slice(0, MAX_CHALLENGE_BULLETS)
    .map((r) => firstSentence(r.requirement, 180))

  if (businessReqs.length >= 2) {
    return businessReqs
  }

  if (icpBullets.length === 1) return icpBullets
  return ['Ausgangslage und Ziele werden aus dem RFP-Dokument extrahiert.']
}
