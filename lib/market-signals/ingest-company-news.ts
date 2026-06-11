import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildCompanyNewsRssQuery, fetchGoogleNewsRssItems } from '@/lib/market-signals/google-news-rss'

export type CompanyNewsIngestCompanyRow = {
  id: string
  organization_id: string
  name: string
  website_url: string | null
  account_status: string | null
}

function hostFromWebsiteUrl(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const normalized = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    return new URL(normalized).hostname.replace(/^www\./i, '') || null
  } catch {
    return null
  }
}

function segmentFromAccountStatus(status: string | null | undefined): 'customer' | 'prospect' {
  const s = String(status ?? '').trim()
  if (s === 'active_customer' || s === 'former_customer' || s === 'at_risk') return 'customer'
  return 'prospect'
}

function contentHash(companyId: string, articleUrl: string): string {
  return createHash('sha256').update(`${companyId}|${articleUrl}`, 'utf8').digest('hex')
}

function publishedOnIso(itemPub: Date | null): string {
  const d = itemPub ?? new Date()
  return d.toISOString().slice(0, 10)
}

export function isActiveDealStatus(raw: unknown): boolean {
  const s = String(raw ?? '').trim()
  if (!s) return false
  if (s === 'open' || s === 'rfp' || s === 'negotiation') return true
  if (s === 'in_negotiation') return true
  if (s === 'rfp_phase') return true
  if (s === 'on_hold' || s === 'reference_sought' || s === 'in_approval' || s === 'reference_found') return true
  return false
}

export type RunCompanyNewsIngestResult = {
  companiesScanned: number
  articlesInserted: number
  errors: string[]
}

/**
 * Lädt Google-News-RSS für Firmen im gewählten Ingest-Mode:
 * - all_accounts: alle Accounts der Organisation
 * - focus_only: nur Favoriten (is_favorite)
 * und legt neue Zeilen in market_signal_account_news an (Dedupe über content_hash).
 */
export async function runCompanyNewsIngest(
  supabase: SupabaseClient,
  options?: {
    organizationId?: string
    ingestMode?: 'all_accounts' | 'focus_only'
    maxCompanies?: number
    perCompanyMaxArticles?: number
    pauseMsBetweenCompanies?: number
  }
): Promise<RunCompanyNewsIngestResult> {
  const ingestMode = options?.ingestMode ?? 'focus_only'
  const maxCompanies = Math.min(200, Math.max(1, options?.maxCompanies ?? 60))
  const perCompanyMax = Math.min(20, Math.max(1, options?.perCompanyMaxArticles ?? 8))
  const pauseMs = Math.max(0, options?.pauseMsBetweenCompanies ?? 400)
  const errors: string[] = []
  let articlesInserted = 0

  const dealCompanyIds = new Set<string>()
  let dealQuery = supabase.from('deals').select('company_id,status,organization_id').not('company_id', 'is', null)
  if (options?.organizationId) {
    dealQuery = dealQuery.eq('organization_id', options.organizationId)
  }
  const { data: dealRows, error: dealErr } = await dealQuery.limit(3000)
  if (dealErr) {
    errors.push(`deals: ${dealErr.message}`)
  } else {
    for (const row of dealRows ?? []) {
      if (isActiveDealStatus((row as { status?: unknown }).status)) {
        const id = String((row as { company_id?: string | null }).company_id ?? '')
        if (id) dealCompanyIds.add(id)
      }
    }
  }

  let coQuery = supabase
    .from('companies')
    .select('id, organization_id, name, website_url, account_status, is_favorite')
    .not('organization_id', 'is', null)

  if (options?.organizationId) {
    coQuery = coQuery.eq('organization_id', options.organizationId)
  }

  const { data: allCompanies, error: coErr } = await coQuery.limit(8000)
  if (coErr) {
    return { companiesScanned: 0, articlesInserted: 0, errors: [`companies: ${coErr.message}`] }
  }

  const candidates =
    ingestMode === 'all_accounts'
      ? ((allCompanies ?? []) as CompanyNewsIngestCompanyRow[] & { is_favorite?: boolean }[])
      : ((allCompanies ?? []).filter((row) =>
          Boolean((row as { is_favorite?: boolean | null }).is_favorite)
        ) as CompanyNewsIngestCompanyRow[] & { is_favorite?: boolean }[])

  const seen = new Set<string>()
  const uniqueList: CompanyNewsIngestCompanyRow[] = []
  for (const row of candidates) {
    const id = String(row.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    uniqueList.push({
      id,
      organization_id: String(row.organization_id),
      name: String(row.name ?? ''),
      website_url: (row.website_url as string | null) ?? null,
      account_status: (row.account_status as string | null) ?? null,
    })
    if (uniqueList.length >= maxCompanies) break
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  try {
    for (const company of uniqueList) {
      const host = hostFromWebsiteUrl(company.website_url)
      const q = buildCompanyNewsRssQuery(company.name, host)
      if (!q) continue
      try {
        const items = await fetchGoogleNewsRssItems(q, {
          signal: controller.signal,
          maxItems: perCompanyMax,
        })
        for (const item of items) {
          const hash = contentHash(company.id, item.link)
          const segment = segmentFromAccountStatus(company.account_status)
          const body = item.title.trim()
          if (body.length < 8) continue
          const { error: insErr } = await supabase.from('market_signal_account_news').insert({
            company_id: company.id,
            body,
            source_label: item.sourceLabel?.trim() || 'Google News',
            published_on: publishedOnIso(item.pubDate),
            segment,
            source_url: item.link,
            content_hash: hash,
            ingest_source: 'google_news_rss',
            created_by: null,
          })
          if (insErr) {
            const code = (insErr as { code?: string }).code
            if (code !== '23505' && !/duplicate key|unique constraint/i.test(insErr.message)) {
              errors.push(`${company.name}: ${insErr.message}`)
            }
          } else {
            articlesInserted += 1
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`${company.name}: ${msg}`)
      }
      if (pauseMs > 0) {
        await new Promise((r) => setTimeout(r, pauseMs))
      }
    }
  } finally {
    clearTimeout(timeout)
  }

  return {
    companiesScanned: uniqueList.length,
    articlesInserted,
    errors: errors.slice(0, 25),
  }
}
