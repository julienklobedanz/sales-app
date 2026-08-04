/**
 * Google News RSS (ohne API-Key). Nutzung unterliegt den Nutzungsbedingungen von Google.
 * Für höhere Zuverlässigkeit kann später z. B. NewsAPI o. Ä. ergänzt werden.
 */

export type GoogleNewsRssItem = {
  title: string
  link: string
  pubDate: Date | null
  sourceLabel: string | null
  /** Kurztext aus RSS <description>, falls vorhanden (kein Full-Article). */
  description: string | null
}

function stripTags(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstMatch(block: string, re: RegExp): string {
  const m = block.match(re)
  return m?.[1] ? stripTags(m[1]) : ''
}

/** Export für Unit-Tests (reiner XML-String). */
export function parseGoogleNewsRssXml(xml: string): GoogleNewsRssItem[] {
  const items: GoogleNewsRssItem[] = []
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1] ?? ''
    const title = firstMatch(block, /<title[^>]*>([\s\S]*?)<\/title>/i)
    const link = firstMatch(block, /<link[^>]*>([\s\S]*?)<\/link>/i)
    const pubRaw = firstMatch(block, /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)
    const sourceFromTag = firstMatch(block, /<source[^>]*>([\s\S]*?)<\/source>/i)
    const descriptionRaw =
      firstMatch(block, /<description[^>]*>([\s\S]*?)<\/description>/i) ||
      firstMatch(block, /<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)
    let sourceLabel = sourceFromTag || null
    if (!sourceLabel && title.includes(' - ')) {
      const parts = title.split(' - ')
      sourceLabel = parts[parts.length - 1]?.trim() || null
    }
    const pubDate = pubRaw ? new Date(pubRaw) : null
    const description =
      descriptionRaw && descriptionRaw.length >= 24 && descriptionRaw !== title
        ? descriptionRaw.slice(0, 400)
        : null
    if (title && link) {
      items.push({
        title,
        link: link.trim(),
        pubDate: pubDate && Number.isFinite(pubDate.getTime()) ? pubDate : null,
        sourceLabel,
        description,
      })
    }
  }
  return items
}

export function buildCompanyNewsRssQuery(
  companyName: string,
  websiteHost: string | null,
): string {
  const name = companyName.trim()
  if (!name) return ''
  const host = (websiteHost ?? '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    ?.trim()
  if (host && host.includes('.')) {
    return `"${name}" OR site:${host}`
  }
  return `"${name}"`
}

export async function fetchGoogleNewsRssItems(
  query: string,
  opts?: { signal?: AbortSignal; maxItems?: number },
): Promise<GoogleNewsRssItem[]> {
  const q = query.trim()
  if (!q) return []
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=de&gl=DE&ceid=DE:de`
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { 'User-Agent': 'RefstackMarketSignals/1.0' },
  })
  if (!res.ok) return []
  const xml = await res.text()
  const all = parseGoogleNewsRssXml(xml)
  const max = Math.max(1, Math.min(20, opts?.maxItems ?? 10))
  return all.slice(0, max)
}
