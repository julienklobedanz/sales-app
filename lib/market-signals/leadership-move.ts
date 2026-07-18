/**
 * Erkennt Leadership-/Job-Moves aus News-Titeln (DE/EN).
 *
 * Interne Wechsel ohne Watchlist-Person → als Move behandeln (nicht Company Update):
 * ein neuer Entscheider ist für AEs relevant, unabhängig von der Champion-Liste.
 */

export type LeadershipMoveParse = {
  isLeadershipMove: boolean
  personName: string | null
  titleBefore: string | null
  titleAfter: string | null
  /** role_change wenn Vorher/Nachher oder klare Ernennung erkennbar. */
  eventKind: 'role_change' | 'news_mention'
}

const ROLE =
  '(?:CEO|CTO|CIO|CFO|CISO|COO|CMO|CRO|CHRO|CPO|President|Präsident(?:in)?|Vorstand(?:svorsitzende[rn]?)?|Geschäftsführer(?:in)?|Chief\\s+[A-Za-z][A-Za-z\\s-]{2,40}|Executive\\s+Chairman|Vorstandsvorsitzende[rn]?)'

const LEADERSHIP_HINT =
  /\b(ceo|cto|cio|cfo|ciso|coo|vorstand|geschäftsführ|chief\s+\w+|executive\s+chairman|nachfolger|tritt\s+zurück|rücktritt|ernennt|ernannt|berufen|übernimmt|wird\s+neuer|wird\s+neue|to\s+become|named\s+|appointed\s+|succeeds|nachfolge)\b/i

export function isLeadershipMoveTitle(title: string): boolean {
  const t = String(title ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return false
  return LEADERSHIP_HINT.test(t)
}

/**
 * Versucht Person + Zielrolle aus typischen Pressetiteln zu lesen.
 * Beispiele:
 * - "Tim Cook to become Apple Executive Chairman, John Ternus to become Apple CEO"
 * - "John Ternus wird CEO von Apple"
 * - "Maria Schulz wird CIO bei Siemens"
 */
export function parseLeadershipMoveFromTitle(
  title: string,
  _companyName?: string | null
): LeadershipMoveParse {
  const raw = String(title ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!raw) {
    return emptyParse(false)
  }

  const isLeadershipMove = isLeadershipMoveTitle(raw)
  if (!isLeadershipMove) {
    return emptyParse(false)
  }

  const deWird = new RegExp(
    `([A-ZÄÖÜ][\\wÄÖÜäöüß.'-]+(?:\\s+[A-ZÄÖÜ][\\wÄÖÜäöüß.'-]+){0,3})\\s+wird(?:\\s+(?:neuer|neue|nächster|nächste))?\\s+(${ROLE})\\b`,
    'gi'
  )
  const enBecome = new RegExp(
    `([A-Z][\\w.'-]+(?:\\s+[A-Z][\\w.'-]+){0,3})\\s+(?:to\\s+become|named|appointed)\\s+(?:[A-Z][\\w.&-]+\\s+)?(${ROLE})\\b`,
    'gi'
  )
  const enAs = new RegExp(
    `([A-Z][\\w.'-]+(?:\\s+[A-Z][\\w.'-]+){0,3})\\s+(?:as|to)\\s+(${ROLE})\\b`,
    'gi'
  )

  const candidates: Array<{ personName: string; titleAfter: string }> = []
  for (const re of [deWird, enBecome, enAs]) {
    for (const m of raw.matchAll(re)) {
      const personName = cleanPersonName(m[1] ?? '')
      const titleAfter = cleanRole(m[2] ?? '')
      if (personName && titleAfter) {
        candidates.push({ personName, titleAfter })
      }
    }
  }

  if (candidates.length > 0) {
    // Bei Succession (Cook → Chairman, Ternus → CEO) den neuen CEO/CTO/CIO bevorzugen.
    const pick =
      candidates.find((c) => /^(CEO|CTO|CIO|CFO)\b/i.test(c.titleAfter)) ??
      candidates[candidates.length - 1]!
    return {
      isLeadershipMove: true,
      personName: pick.personName,
      titleBefore: null,
      titleAfter: pick.titleAfter,
      eventKind: 'role_change',
    }
  }

  return {
    isLeadershipMove: true,
    personName: null,
    titleBefore: null,
    titleAfter: null,
    eventKind: 'news_mention',
  }
}

function emptyParse(isLeadershipMove: boolean): LeadershipMoveParse {
  return {
    isLeadershipMove,
    personName: null,
    titleBefore: null,
    titleAfter: null,
    eventKind: 'news_mention',
  }
}

function cleanPersonName(raw: string): string | null {
  const s = raw
    .replace(/\s+/g, ' ')
    .replace(/^(?:new|neuer|neue)\s+/i, '')
    .trim()
  if (s.length < 3 || s.length > 80) return null
  if (/^(Apple|Siemens|Google|Microsoft|Amazon|the|der|die|das)$/i.test(s)) return null
  return s
}

function cleanRole(raw: string): string | null {
  const s = raw.replace(/\s+/g, ' ').trim()
  if (!s) return null
  return s
}

/** Anzeige-Label für Quellen (Newsroom/Publisher vor Google News). */
export function formatSignalSourceLabel(input: {
  url?: string | null
  sourceLabel?: string | null
  title?: string | null
  companyName?: string | null
}): string {
  const label = String(input.sourceLabel ?? '').trim()
  const url = String(input.url ?? '').trim()
  const title = String(input.title ?? '')
  const company = String(input.companyName ?? '').trim()

  const fromTitle = title.match(/\s[-–—|]\s([A-Za-zÄÖÜäöü0-9][\wÄÖÜäöüß .&'’-]{1,40})$/)
  const titlePublisher =
    fromTitle?.[1] && !/news\.google/i.test(fromTitle[1]) ? fromTitle[1].trim() : null

  const isGenericGoogleNews =
    !label || /^https?:\/\//i.test(label) || /news\.google/i.test(label) || /^google\s*news$/i.test(label)

  if (label && !isGenericGoogleNews) {
    return label
  }

  if (titlePublisher) return titlePublisher

  if (url) {
    try {
      const u = new URL(url)
      const host = u.hostname.replace(/^www\./i, '')
      const path = u.pathname.toLowerCase()
      if (/newsroom|\/news\/|\/press|\/presse|mitteilung/.test(path) || /newsroom/.test(host)) {
        const brand = company || host.split('.')[0] || 'Newsroom'
        const pretty = brand.charAt(0).toUpperCase() + brand.slice(1)
        return `${pretty} Newsroom`
      }
      if (host.includes('news.google')) {
        return titlePublisher || 'Google News'
      }
      if (host.includes('capital.de')) return 'Capital'
      if (host.includes('apple.com')) return 'Apple Newsroom'
      const base = host.split('.')[0]
      if (base && base.length > 1) return base.charAt(0).toUpperCase() + base.slice(1)
      return host
    } catch {
      /* ignore */
    }
  }

  return !isGenericGoogleNews && label ? label : 'Quelle'
}
