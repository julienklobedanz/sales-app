/**
 * Optionale Tiefe: Meta-Description einer URL (OG / <meta name="description">).
 * Standardmäßig nicht im Ingest-Hotpath — nur wenn MARKET_SIGNALS_FETCH_META=1.
 */
const META_TIMEOUT_MS = 2_500

function extractMetaContent(html: string, propertyOrName: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${propertyOrName}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propertyOrName}["'][^>]*>`,
    'i'
  )
  const m = html.match(re)
  const value = (m?.[1] || m?.[2] || '').replace(/\s+/g, ' ').trim()
  return value.length >= 24 ? value.slice(0, 400) : null
}

export function parseMetaDescriptionFromHtml(html: string): string | null {
  return (
    extractMetaContent(html, 'og:description') ||
    extractMetaContent(html, 'twitter:description') ||
    extractMetaContent(html, 'description')
  )
}

export async function fetchUrlMetaSnippet(
  url: string,
  opts?: { signal?: AbortSignal }
): Promise<string | null> {
  const href = String(url ?? '').trim()
  if (!/^https?:\/\//i.test(href)) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), META_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  opts?.signal?.addEventListener('abort', onAbort)

  try {
    const res = await fetch(href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RefstackMarketSignals/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const ctype = res.headers.get('content-type') ?? ''
    if (!/html/i.test(ctype) && ctype.length > 0) return null
    const html = (await res.text()).slice(0, 80_000)
    return parseMetaDescriptionFromHtml(html)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
    opts?.signal?.removeEventListener('abort', onAbort)
  }
}

export function shouldFetchMetaSnippets(): boolean {
  return process.env.MARKET_SIGNALS_FETCH_META === '1'
}
