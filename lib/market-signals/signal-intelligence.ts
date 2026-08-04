import { MARKET_SIGNAL_INTELLIGENCE_SYSTEM_PROMPT } from './signal-intelligence-prompt'

export { MARKET_SIGNAL_INTELLIGENCE_SYSTEM_PROMPT }

export type RoleTransitionKind =
  | 'promotion'
  | 'lateral'
  | 'step_down'
  | 'new_hire'
  | 'unknown'

export type MarketSignalActionTriggerType = 'direct_outreach' | 'warm_intro'

export type MarketSignalActionTrigger = {
  type: MarketSignalActionTriggerType
  label: string
  primaryStakeholderName: string
  internalColleagueName?: string
}

export type MarketSignalInsight = {
  why_now: string
  signal_fact: string
  reference_line: string | null
}

export type ReferenceSnippetInput = {
  id: string
  title: string
  status: string
}

export type BuildIntelligenceInput = {
  signalKind: 'exec' | 'news'
  personName?: string
  companyName: string
  personTitleBefore?: string | null
  personTitleAfter?: string | null
  changeSummary?: string
  newsBody?: string
  solutionLabel?: string
  references: ReferenceSnippetInput[]
  onlyApprovedReferences: boolean
  primaryStakeholder?: { fullName: string; title: string } | null
  warmIntro?: { colleagueName: string; stakeholderName: string } | null
}

export type MarketSignalIntelligence = {
  insight: MarketSignalInsight
  bullets: string[]
  action_triggers: MarketSignalActionTrigger[]
  formatted_source_summary: string
  role_transition: RoleTransitionKind
  is_step_down: boolean
  is_demission: boolean
}

const DEMISSION_RE =
  /\b(demission|zurückgetreten|tritt zurück|verlässt|ausgeschieden|ruhestand|resign|step(s|ped)? down|left the (role|company)|departed)\b/i

const FLUFF_RE =
  /\b(momentum|lösungsorientiert|natürlicher einstieg|synerg|game.?changer|thought leader|spannendes zeitfenster)\b/i

const SIGNAL_SENTENCE_RE =
  /\b(ceo|cto|cio|cpo|cfo|chief|appointed|ernannt|wechselt|übernimmt|joins|named|promoted|beruft|wird|neu|posten)\b/i

function normalizeTitle(title: string): string {
  return String(title ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Rough seniority 0–100 for B2B title comparison. */
export function titleSeniorityScore(title: string): number {
  const t = normalizeTitle(title).toLowerCase()
  if (!t) return 0
  if (/\b(ceo|geschäftsführ|vorstand|chief executive)\b/.test(t)) return 100
  if (/\b(cfo|cto|cio|ciso|chief information|chief technology|chief executive)\b/.test(t))
    return 92
  if (/\bcpo\b|chief product/.test(t)) return 86
  if (/\b(ev)?p\b|vice president|vizepräsident/.test(t)) return 82
  if (/\bdirector\b|geschäftsbereichsleiter/.test(t)) return 72
  if (/\bhead of\b|leiter\b|bereichsleiter/.test(t)) return 68
  if (/\bmanager\b|lead\b|principal\b/.test(t)) return 58
  return 42
}

export function classifyRoleTransition(
  before: string | null | undefined,
  after: string | null | undefined,
  changeSummary?: string,
): { kind: RoleTransitionKind; is_step_down: boolean; is_demission: boolean } {
  const summary = String(changeSummary ?? '')
  const is_demission = DEMISSION_RE.test(summary)
  const b = normalizeTitle(before ?? '')
  const a = normalizeTitle(after ?? '')
  if (!b && a) return { kind: 'new_hire', is_step_down: false, is_demission }
  if (!a && b) return { kind: 'unknown', is_step_down: false, is_demission: is_demission }
  if (!b && !a)
    return { kind: 'unknown', is_step_down: false, is_demission: is_demission }

  const sb = titleSeniorityScore(b)
  const sa = titleSeniorityScore(a)
  const delta = sa - sb

  if (delta >= 6) return { kind: 'promotion', is_step_down: false, is_demission }
  if (delta <= -6) {
    return {
      kind: 'step_down',
      is_step_down: !is_demission,
      is_demission,
    }
  }
  return { kind: 'lateral', is_step_down: false, is_demission }
}

export function formatRoleChangeFact(input: {
  personName: string
  personTitleBefore?: string | null
  personTitleAfter?: string | null
  companyName: string
  changeSummary?: string
}): string {
  const name = normalizeTitle(input.personName) || 'Die Führungskraft'
  const company = normalizeTitle(input.companyName) || 'dem Account'
  const before = normalizeTitle(input.personTitleBefore ?? '')
  const after = normalizeTitle(input.personTitleAfter ?? '')
  const raw = String(input.changeSummary ?? '').trim()
  const transition = classifyRoleTransition(before, after, raw)

  if (before && after) {
    const arrow = `${before} → ${after}`
    if (transition.is_step_down && !transition.is_demission) {
      return `⚠️ ${name}: Rollenwechsel ${arrow} bei ${company} (seltener Abstieg — Veränderung der Verantwortung prüfen).`
    }
    if (transition.kind === 'promotion') {
      return `${name} wechselt von ${before} auf den ${after}-Posten bei ${company}.`
    }
    if (transition.kind === 'new_hire' || !before) {
      return `${name} ist jetzt ${after} bei ${company}.`
    }
    return `${name}: ${before} → ${after} bei ${company}.`
  }

  if (after) return `${name} ist jetzt ${after} bei ${company}.`
  if (raw && !FLUFF_RE.test(raw) && !/wurde ceo.*cto/i.test(raw)) return raw
  return `${name}: Führungswechsel bei ${company}.`
}

/** Relevantesten Satz aus Fließtext/Artikel für Highlight in der Insight-Card (z. B. CTO-Ernennung im Body). */
export function extractEmbeddedSignalHook(input: {
  signalKind: 'exec' | 'news'
  newsBody?: string
  changeSummary?: string
  personName?: string
  personTitleBefore?: string | null
  personTitleAfter?: string | null
  companyName?: string
}): string | null {
  if (input.signalKind === 'exec') {
    const summary = String(input.changeSummary ?? '').trim()
    if (summary && !FLUFF_RE.test(summary)) {
      return summary.length > 220 ? `${summary.slice(0, 217)}…` : summary
    }
    const name = normalizeTitle(input.personName ?? '')
    const after = normalizeTitle(input.personTitleAfter ?? '')
    if (name && after) return `${name} — ${after}`
    return null
  }

  const body = String(input.newsBody ?? input.changeSummary ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!body) return null

  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 24)

  const name = normalizeTitle(input.personName ?? '')
  const companyToken =
    normalizeTitle(input.companyName ?? '')
      .split(/\s+/)[0]
      ?.toLowerCase() ?? ''

  const scored = sentences.map((sentence) => {
    let score = 0
    if (SIGNAL_SENTENCE_RE.test(sentence)) score += 3
    if (name && sentence.toLowerCase().includes(name.toLowerCase())) score += 4
    if (companyToken && sentence.toLowerCase().includes(companyToken)) score += 2
    if (/\b(cto|cpo|ceo|cio|cfo)\b/i.test(sentence)) score += 2
    return { sentence, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const best = scored.find((x) => x.score >= 3)?.sentence ?? sentences[0]
  if (!best) return body.length > 200 ? `${body.slice(0, 197)}…` : body
  return best.length > 220 ? `${best.slice(0, 217)}…` : best
}

export function buildSalesWhyNow(input: {
  signalKind: 'exec' | 'news'
  personName?: string
  companyName: string
  personTitleBefore?: string | null
  personTitleAfter?: string | null
  changeSummary?: string
  newsBody?: string
  /** Optional: nur setzen, wenn die Org eine echte Solution-Bezeichnung hat — nie hardcoden. */
  solutionLabel?: string
}): string {
  const solution = normalizeTitle(input.solutionLabel ?? '')
  const company = normalizeTitle(input.companyName) || 'dem Account'
  const name = normalizeTitle(input.personName ?? '') || 'Die Führungskraft'
  const after = normalizeTitle(input.personTitleAfter ?? '')

  if (input.signalKind === 'exec') {
    const summary = normalizeTitle(input.changeSummary ?? '').slice(0, 160)
    if (summary) {
      const sentence = /[.!?]$/.test(summary) ? summary : `${summary}.`
      return solution ? `${sentence} Zeitfenster, ${solution} anzusprechen.` : sentence
    }
    const roleLabel = after || 'eine neue Führungsrolle'
    const base = `${name} übernimmt ${roleLabel} bei ${company}.`
    return solution ? `${base} Zeitfenster, ${solution} anzusprechen.` : base
  }

  const hook = normalizeTitle(input.newsBody ?? input.changeSummary ?? '').slice(0, 160)
  if (hook) {
    const sentence = /[.!?]$/.test(hook) ? hook : `${hook}.`
    return solution
      ? `${sentence} Das kann den Bedarf an ${solution} kurzfristig erhöhen.`
      : sentence
  }
  return `Aktuelle Entwicklung bei ${company}.`
}

export function buildReferenceInsightLine(input: {
  references: ReferenceSnippetInput[]
  onlyApprovedReferences: boolean
}): string | null {
  const pool = input.references
  if (!pool.length) return null

  const approved = pool.filter((r) => String(r.status ?? '').toLowerCase() === 'approved')
  const visible = input.onlyApprovedReferences ? approved : pool

  if (visible.length > 0) {
    const n = visible.length
    return `${n} passende Referenz${n === 1 ? '' : 'en'} im Pool${input.onlyApprovedReferences ? '' : ` (${approved.length} freigegeben)`}.`
  }

  if (pool.length === 1) {
    return '1 Referenz verfügbar — sie hat noch keine Freigabe für externe Nutzung.'
  }
  return `${pool.length} Referenzen verfügbar — jedoch hat noch keine von diesen die Freigabe für externe Nutzung.`
}

export function deriveActionTriggers(input: {
  primaryStakeholder?: { fullName: string; title: string } | null
  warmIntro?: { colleagueName: string; stakeholderName: string } | null
}): MarketSignalActionTrigger[] {
  const triggers: MarketSignalActionTrigger[] = []
  const stakeholder = input.primaryStakeholder
  if (stakeholder?.fullName) {
    const first = stakeholder.fullName.split(/\s+/)[0] ?? stakeholder.fullName
    triggers.push({
      type: 'direct_outreach',
      label: `Direkt-Pitch an ${first}`,
      primaryStakeholderName: stakeholder.fullName,
    })
  }
  if (input.warmIntro?.colleagueName && input.warmIntro?.stakeholderName) {
    const colleague =
      input.warmIntro.colleagueName.split(/\s+/)[0] ?? input.warmIntro.colleagueName
    triggers.push({
      type: 'warm_intro',
      label: `Warm-Intro über ${colleague} anfordern`,
      primaryStakeholderName: input.warmIntro.stakeholderName,
      internalColleagueName: input.warmIntro.colleagueName,
    })
  }
  return triggers
}

export function buildMarketSignalIntelligence(
  input: BuildIntelligenceInput,
): MarketSignalIntelligence {
  const transition = classifyRoleTransition(
    input.personTitleBefore,
    input.personTitleAfter,
    input.changeSummary,
  )
  const signal_fact =
    input.signalKind === 'exec'
      ? formatRoleChangeFact({
          personName: input.personName ?? 'Entscheider',
          personTitleBefore: input.personTitleBefore,
          personTitleAfter: input.personTitleAfter,
          companyName: input.companyName,
          changeSummary: input.changeSummary,
        })
      : normalizeTitle(input.newsBody ?? input.changeSummary ?? '') ||
        `Account-Signal bei ${input.companyName}.`

  const why_now = buildSalesWhyNow({
    signalKind: input.signalKind,
    personName: input.personName,
    companyName: input.companyName,
    personTitleBefore: input.personTitleBefore,
    personTitleAfter: input.personTitleAfter,
    changeSummary: input.changeSummary,
    newsBody: input.newsBody,
    solutionLabel: input.solutionLabel,
  })

  const reference_line = buildReferenceInsightLine({
    references: input.references,
    onlyApprovedReferences: input.onlyApprovedReferences,
  })

  const action_triggers = deriveActionTriggers({
    primaryStakeholder: input.primaryStakeholder,
    warmIntro: input.warmIntro,
  })

  const bullets: string[] = [signal_fact, why_now]
  if (reference_line) bullets.push(reference_line)

  const formatted_source_summary =
    signal_fact.length > 92 ? `${signal_fact.slice(0, 89)}…` : signal_fact

  return {
    insight: { why_now, signal_fact, reference_line },
    bullets: bullets.slice(0, 3),
    action_triggers,
    formatted_source_summary,
    role_transition: transition.kind,
    is_step_down: transition.is_step_down,
    is_demission: transition.is_demission,
  }
}

/** Parse „Dein Kollege X kennt Y …“ bridge lines from decision-maker mocks. */
export function parseWarmIntroBridge(
  line: string,
): { colleague: string; stakeholder: string } | null {
  const m = String(line ?? '')
    .trim()
    .match(/^Dein Kollege (.+?) kennt (.+?) – starker Einstieg für ein Warm-Intro\.?$/)
  if (!m) return null
  return { colleague: m[1].trim(), stakeholder: m[2].trim() }
}
