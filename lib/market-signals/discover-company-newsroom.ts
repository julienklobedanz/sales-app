import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/observability/logger'

const PROBE_TIMEOUT_MS = 2_500
const MAX_NEWSROOM_URLS = 6

/** Common press / newsroom paths on corporate sites (DACH + EN). */
export const NEWSROOM_PATH_CANDIDATES = [
  '/newsroom',
  '/de/newsroom',
  '/en/newsroom',
  '/presse',
  '/de/presse',
  '/press',
  '/en/press',
  '/press-releases',
  '/pressemitteilungen',
  '/news',
  '/de/news',
  '/media',
  '/medien',
  '/about/newsroom',
  '/company/newsroom',
  '/unternehmen/presse',
] as const

export function normalizeWebsiteOrigin(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(withProto)
    if (!u.hostname || !u.hostname.includes('.')) return null
    return `${u.protocol}//${u.hostname}`
  } catch {
    return null
  }
}

export function buildNewsroomCandidateUrls(websiteUrl: string | null | undefined): string[] {
  const origin = normalizeWebsiteOrigin(websiteUrl)
  if (!origin) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const path of NEWSROOM_PATH_CANDIDATES) {
    const href = `${origin}${path}`
    if (seen.has(href)) continue
    seen.add(href)
    out.push(href)
  }
  return out
}

async function probeUrlExists(url: string, signal?: AbortSignal): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)

  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'RefStackNewsroomProbe/1.0' },
    })
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'RefStackNewsroomProbe/1.0' },
      })
    }
    if (!res.ok) return null
    return res.url || url
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', onAbort)
  }
}

/**
 * Probe known press/newsroom paths on the company website.
 * Does not scrape article lists — only checks path reachability.
 */
export async function discoverCompanyNewsroomUrls(
  websiteUrl: string | null | undefined,
  opts?: { signal?: AbortSignal; maxUrls?: number }
): Promise<string[]> {
  const maxUrls = Math.min(MAX_NEWSROOM_URLS, Math.max(1, opts?.maxUrls ?? MAX_NEWSROOM_URLS))
  const candidates = buildNewsroomCandidateUrls(websiteUrl)
  if (!candidates.length) return []

  const found: string[] = []
  const seen = new Set<string>()

  // Probe in small parallel batches to keep create/import responsive.
  const batchSize = 4
  for (let i = 0; i < candidates.length && found.length < maxUrls; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize)
    const results = await Promise.all(batch.map((href) => probeUrlExists(href, opts?.signal)))
    for (const hit of results) {
      if (!hit || found.length >= maxUrls) continue
      const key = hit.replace(/\/$/, '').toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      found.push(hit.replace(/\/$/, ''))
    }
  }

  return found
}

export async function discoverAndSaveCompanyNewsrooms(
  supabase: SupabaseClient,
  companyId: string,
  opts?: { websiteUrl?: string | null; force?: boolean }
): Promise<{ urls: string[]; error?: string }> {
  const id = String(companyId ?? '').trim()
  if (!id) return { urls: [], error: 'companyId fehlt' }

  let websiteUrl = opts?.websiteUrl ?? null
  if (!websiteUrl || !opts?.force) {
    const { data, error } = await supabase
      .from('companies')
      .select('website_url, newsroom_urls, newsroom_discovered_at')
      .eq('id', id)
      .maybeSingle()
    if (error) return { urls: [], error: error.message }
    websiteUrl = websiteUrl ?? ((data as { website_url?: string | null } | null)?.website_url ?? null)
    if (
      !opts?.force &&
      data &&
      (data as { newsroom_discovered_at?: string | null }).newsroom_discovered_at
    ) {
      const existing = ((data as { newsroom_urls?: string[] | null }).newsroom_urls ?? []).filter(
        Boolean
      )
      return { urls: existing }
    }
  }

  const urls = await discoverCompanyNewsroomUrls(websiteUrl)
  const { error: upErr } = await supabase
    .from('companies')
    .update({
      newsroom_urls: urls.length ? urls : [],
      newsroom_discovered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (upErr) return { urls, error: upErr.message }
  return { urls }
}

/** Google-News site:-Queries aus gespeicherten Newsroom-URLs. */
export function buildStoredNewsroomRssQueries(
  companyName: string,
  newsroomUrls: string[] | null | undefined
): string[] {
  const name = companyName.trim()
  const urls = (newsroomUrls ?? []).map((u) => String(u ?? '').trim()).filter(Boolean)
  if (!name || !urls.length) return []

  const jobExclusions = [
    '-Stellenanzeige',
    '-Karriere',
    '-"m/w/d"',
    '-Recruiting',
    '-Jobsuche',
  ].join(' ')

  const queries: string[] = []
  const seen = new Set<string>()
  for (const raw of urls.slice(0, 4)) {
    try {
      const u = new URL(raw)
      const host = u.hostname.replace(/^www\./i, '')
      if (!host.includes('.')) continue
      const path = u.pathname.replace(/\/$/, '')
      if (path && path !== '/') {
        const q = `"${name}" site:${host}${path} ${jobExclusions}`
        if (!seen.has(q)) {
          seen.add(q)
          queries.push(q)
        }
      }
      const hostQ = `"${name}" site:${host} (newsroom OR presse OR press OR mitteilung OR "press release") ${jobExclusions}`
      if (!seen.has(hostQ)) {
        seen.add(hostQ)
        queries.push(hostQ)
      }
    } catch {
      /* skip invalid */
    }
  }
  return queries.slice(0, 6)
}

export function isStoredNewsroomHost(
  urlOrHost: string | null | undefined,
  newsroomUrls: string[] | null | undefined
): boolean {
  const host = String(urlOrHost ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
  if (!host) return false
  for (const raw of newsroomUrls ?? []) {
    try {
      const u = new URL(raw)
      const nHost = u.hostname.replace(/^www\./i, '').toLowerCase()
      if (host === nHost || host.endsWith(`.${nHost}`)) return true
    } catch {
      /* skip */
    }
  }
  return false
}

/** Fire-and-forget wrapper for create/import hooks. */
export function scheduleCompanyNewsroomDiscovery(
  supabase: SupabaseClient,
  companyId: string,
  websiteUrl?: string | null
): void {
  void discoverAndSaveCompanyNewsrooms(supabase, companyId, { websiteUrl }).catch((err) => {
    log.error('newsroomDiscover.scheduledFailed', { companyId }, err)
  })
}

