import { buildCompanyNewsRssQuery } from '@/lib/market-signals/google-news-rss'

/** Standard: nur Signale der letzten N Tage (Sales-Relevanz). */
export const RSS_MAX_AGE_DAYS_DEFAULT = 30

/**
 * Offensichtliches Rauschen für B2B-Vertrieb — vor LLM-Aufruf verwerfen.
 * Fokus: Stellenanzeigen, Karriere-Seiten, HR-/Facility-Routine ohne Account-Trigger.
 */
export function isLowValueRssTitle(title: string): boolean {
  const raw = String(title ?? '').trim()
  if (!raw) return true
  const t = raw.toLowerCase().replace(/\s+/g, ' ')

  if (/\b(m\/w\/d|w\/m\/d|m\/f\/d|d\/m\/w|d\/f\/m|all genders)\b/i.test(raw)) return true
  if (/\((m\/w\/d|w\/m\/d|m\/f\/d)\)/i.test(raw)) return true

  if (
    /\b(stellenanzeige|jobangebot|jobsuche|karriereportal|recruiting|praktikum|werkstudent|ausbildung|traineeprogramm|duales studium)\b/i.test(
      t
    )
  ) {
    return true
  }
  if (/\b(wir suchen|jetzt bewerben|bewerbung bis|stellenmarkt|your career|join our team|we are hiring)\b/i.test(t)) {
    return true
  }
  if (/\b(karriere|jobs)\s+bei\b/i.test(t)) return true
  if (/\b(instandhaltung|facility management|hausmeister|reinigungskraft)\b/i.test(t)) {
    return true
  }
  if (/\b(bauingenieur|koordinator legal|teamleiter|spezialist|sachbearbeiter)\s*\(m/i.test(t)) return true

  return false
}

/** Grobe positive Trigger — optional zur Nachschärfung nach dem LLM. */
export function hasSalesTriggerHint(title: string): boolean {
  const t = String(title ?? '').toLowerCase()
  return (
    /\b(ceo|cto|cio|cfo|vorstand|geschäftsführ|chief|ernannt|berufen|wechselt|übernimmt|neu im amt)\b/i.test(
      t
    ) ||
    /\b(investition|investiert|expansion|erweiterung|werkseröffnung|eröffnet|neuer standort|produktionsstandort|logistikzentrum|fabrik|werk\b|milliarde|millionen)\b/i.test(
      t
    ) ||
    /\bneuer\s+(ceo|cto|cio|cfo|vorstand)\b/i.test(t) ||
    /\b(übernahme|acquisition|fusion|kooperation|partnerschaft|joint venture|auftrag|vertrag)\b/i.test(t) ||
    /\b(quartal|umsatz|gewinn|ebit|finanzierung|funding|ipo|börsengang)\b/i.test(t) ||
    /\b(digitalisierung|transformation|cloud|ki|künstliche intelligenz|strategie|restrukturierung)\b/i.test(
      t
    ) ||
    /\b(rücktritt|tritt zurück|verlässt das unternehmen|neuer präsident|neuer leiter)\b/i.test(t)
  )
}

export function isRssPubDateWithinDays(pubDate: Date | null, maxDays: number): boolean {
  if (!Number.isFinite(maxDays) || maxDays <= 0) return true
  if (!pubDate || !Number.isFinite(pubDate.getTime())) return true
  const ageMs = Date.now() - pubDate.getTime()
  return ageMs >= 0 && ageMs <= maxDays * 86_400_000
}

/** Google-News-Suche: Firmenname minus typische Job-/Karriere-Treffer. */
export function buildSalesFocusedCompanyNewsRssQuery(
  companyName: string,
  websiteHost: string | null
): string {
  const base = buildCompanyNewsRssQuery(companyName, websiteHost)
  if (!base) return ''
  const exclusions = [
    '-Stellenanzeige',
    '-Karriere',
    '-"m/w/d"',
    '-Recruiting',
    '-Jobsuche',
    '-Praktikum',
    '-Werkstudent',
  ].join(' ')
  return `${base} ${exclusions}`
}

export function irrelevantEnrichment(): {
  is_relevant: false
  signal_category: 'strategy'
  insight_signal_fact: string
  insight_why_now: string
  enrichment_source: 'heuristic'
} {
  return {
    is_relevant: false,
    signal_category: 'strategy',
    insight_signal_fact: '',
    insight_why_now: '',
    enrichment_source: 'heuristic',
  }
}
