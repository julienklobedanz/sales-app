import { buildCompanyNewsRssQuery } from '@/lib/market-signals/google-news-rss'

/** Standard: nur Signale der letzten N Tage (Sales-Relevanz). */
export const RSS_MAX_AGE_DAYS_DEFAULT = 30

/** Leadership-/Job-Moves länger behalten (CEO-Wechsel bleibt relevant). */
export const RSS_MAX_AGE_DAYS_LEADERSHIP = 120

/**
 * Offensichtliches Rauschen für B2B-Vertrieb — vor LLM-Aufruf verwerfen.
 * Fokus: Stellenanzeigen, Karriere, Sport/Entertainment, Katalog-/Safety-Seiten.
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

  // Sport / Entertainment / Consumer-PR / Live-Streams
  if (
    /\b(emmy|oscars?|grammy|nfl|nba|mlb|mls|bundesliga|champions league|apple arcade|apple tv\+|streaming|filmpremiere|serienstart)\b/i.test(
      t
    )
  ) {
    return true
  }
  if (/\b(madden|fifa|call of duty|fortnite|playstation|xbox)\b/i.test(t)) return true
  if (
    /\b(livestream|live stream|liveübertragung|matchday|matchplay|weltmeisterschaft|wm\b|em\b|dazn|sky sport|sportdeutschland)\b/i.test(
      t
    )
  ) {
    return true
  }
  if (/\b(ticketverkauf|fanshop|fantasy\s*liga|tippspiel)\b/i.test(t)) return true

  // Katalog / Safety / leere Newsroom-Listings
  if (/\b(sicherheitsdatenblatt|safety data sheet|sds\b|produktkatalog|data sheet)\b/i.test(t)) {
    return true
  }
  if (/^newsroom\s*[-–—:]\s*\w+/i.test(raw) && raw.length < 48) return true
  if (/^presse\s*[-–—:]\s*\w+/i.test(raw) && raw.length < 48) return true

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

/**
 * Zusätzliche Queries für Newsroom / Presse des Accounts (über Google News site:).
 * Kein Scraping der Seite — nur Index-Suche.
 */
export function buildNewsroomRssQueries(companyName: string, websiteHost: string | null): string[] {
  const name = companyName.trim()
  const host = (websiteHost ?? '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    ?.trim()
  if (!host || !host.includes('.')) return []

  const queries = [
    `site:${host} (newsroom OR presse OR "press release" OR "pressemitteilung" OR mitteilung OR /news/)`,
    `site:${host}/newsroom`,
    `site:${host}/de/newsroom`,
    `site:${host}/press`,
    `site:${host}/presse`,
  ]
  if (name) {
    queries.unshift(`"${name}" (CEO OR CTO OR CIO OR Vorstand OR "Executive Chairman" OR Nachfolger) site:${host}`)
  }
  return queries
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
