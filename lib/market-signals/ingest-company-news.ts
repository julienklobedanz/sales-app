import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  isMissingEnrichmentColumnsError,
  stripEnrichmentFields,
} from '@/lib/market-signals/enrichment-db'
import { enrichSignal } from '@/lib/market-signals/enrich-signal-with-llm'
import {
  fetchGoogleNewsRssItems,
  type GoogleNewsRssItem,
} from '@/lib/market-signals/google-news-rss'
import {
  formatSignalSourceLabel,
  isLeadershipMoveTitle,
  parseLeadershipMoveFromTitle,
} from '@/lib/market-signals/leadership-move'
import {
  buildNewsroomRssQueries,
  buildSalesFocusedCompanyNewsRssQuery,
  isLowValueRssTitle,
  isRssPubDateWithinDays,
  RSS_MAX_AGE_DAYS_DEFAULT,
  RSS_MAX_AGE_DAYS_LEADERSHIP,
} from '@/lib/market-signals/sales-signal-relevance'
import {
  buildIndustryPackRssQueries,
  isIndustryPackHost,
  isPeoplePackHost,
} from '@/lib/market-signals/source-packs'
import {
  buildStoredNewsroomRssQueries,
  isStoredNewsroomHost,
} from '@/lib/market-signals/discover-company-newsroom'
import { isActiveDealStatus } from '@/lib/deals/normalize-deal-status'

export { isActiveDealStatus }

type CompanyNewsIngestCompanyRow = {
  id: string
  organization_id: string
  name: string
  website_url: string | null
  account_status: string | null
  industry: string | null
  newsroom_urls: string[] | null
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

function segmentFromAccountStatus(
  status: string | null | undefined,
): 'customer' | 'prospect' {
  const s = String(status ?? '').trim()
  if (s === 'active_customer' || s === 'former_customer' || s === 'at_risk')
    return 'customer'
  return 'prospect'
}

function contentHash(companyId: string, articleUrl: string): string {
  return createHash('sha256').update(`${companyId}|${articleUrl}`, 'utf8').digest('hex')
}

function execContentHash(
  companyId: string,
  personKey: string,
  articleUrl: string,
): string {
  return createHash('sha256')
    .update(`${companyId}|${personKey}|${articleUrl}`, 'utf8')
    .digest('hex')
}

function publishedOnIso(itemPub: Date | null): string {
  const d = itemPub ?? new Date()
  return d.toISOString().slice(0, 10)
}

function normalizePersonKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export type RunCompanyNewsIngestResult = {
  companiesScanned: number
  articlesInserted: number
  leadershipMovesInserted: number
  errors: string[]
}

async function fetchMergedCompanyArticles(
  companyName: string,
  websiteHost: string | null,
  industry: string | null,
  newsroomUrls: string[] | null,
  opts: { signal: AbortSignal; maxItems: number },
): Promise<Array<GoogleNewsRssItem & { fromPack: boolean; fromNewsroom: boolean }>> {
  const storedNewsroomQs = buildStoredNewsroomRssQueries(companyName, newsroomUrls)
  const packQs = buildIndustryPackRssQueries(companyName, industry)
  const primary = buildSalesFocusedCompanyNewsRssQuery(companyName, websiteHost)
  const newsroomQs =
    storedNewsroomQs.length > 0 ? [] : buildNewsroomRssQueries(companyName, websiteHost)
  // Gespeicherte Newsrooms zuerst, dann Industry-Pack, dann Fallback.
  const queries = [...storedNewsroomQs, ...packQs, primary, ...newsroomQs].filter(Boolean)
  const perQuery = Math.max(
    3,
    Math.ceil(opts.maxItems / Math.max(1, Math.min(queries.length, 8))) + 1,
  )

  const batches = await Promise.all(
    queries.map(async (q, index) => {
      const items = await fetchGoogleNewsRssItems(q, {
        signal: opts.signal,
        maxItems: perQuery,
      }).catch(() => [] as GoogleNewsRssItem[])
      const fromNewsroom = index < storedNewsroomQs.length
      const fromPack = !fromNewsroom && index < storedNewsroomQs.length + packQs.length
      return items.map((item) => ({ ...item, fromPack, fromNewsroom }))
    }),
  )

  const byLink = new Map<
    string,
    GoogleNewsRssItem & { fromPack: boolean; fromNewsroom: boolean }
  >()
  for (const item of batches.flat()) {
    if (!item.link) continue
    const prev = byLink.get(item.link)
    if (
      !prev ||
      (item.fromNewsroom && !prev.fromNewsroom) ||
      (item.fromPack && !prev.fromPack && !prev.fromNewsroom)
    ) {
      byLink.set(item.link, item)
    }
  }

  return Array.from(byLink.values())
    .sort((a, b) => {
      const aScore =
        (a.fromNewsroom || isStoredNewsroomHost(a.link, newsroomUrls) ? 2 : 0) +
        (a.fromPack || isIndustryPackHost(a.link, industry) || isPeoplePackHost(a.link)
          ? 1
          : 0)
      const bScore =
        (b.fromNewsroom || isStoredNewsroomHost(b.link, newsroomUrls) ? 2 : 0) +
        (b.fromPack || isIndustryPackHost(b.link, industry) || isPeoplePackHost(b.link)
          ? 1
          : 0)
      if (aScore !== bScore) return bScore - aScore
      const aMs = a.pubDate?.getTime() ?? 0
      const bMs = b.pubDate?.getTime() ?? 0
      return bMs - aMs
    })
    .slice(0, opts.maxItems)
}

/**
 * Lädt Google-News-RSS für Firmen im gewählten Ingest-Mode:
 * - all_accounts: alle Accounts der Organisation
 * - focus_only: nur Favoriten (is_favorite)
 * Priorität: Industrie-Source-Pack (site:Fachmedien), dann Newsroom/Presse,
 * zuletzt breites Google News. Leadership-Titel → executive_events.
 */
export async function runCompanyNewsIngest(
  supabase: SupabaseClient<Database>,
  options?: {
    organizationId?: string
    ingestMode?: 'all_accounts' | 'focus_only'
    maxCompanies?: number
    perCompanyMaxArticles?: number
    maxAgeDays?: number
    pauseMsBetweenCompanies?: number
  },
): Promise<RunCompanyNewsIngestResult> {
  const ingestMode = options?.ingestMode ?? 'focus_only'
  const maxCompanies = Math.min(200, Math.max(1, options?.maxCompanies ?? 60))
  const perCompanyMax = Math.min(8, Math.max(1, options?.perCompanyMaxArticles ?? 5))
  const maxAgeDays = Math.min(
    180,
    Math.max(7, options?.maxAgeDays ?? RSS_MAX_AGE_DAYS_DEFAULT),
  )
  const pauseMs = Math.max(0, options?.pauseMsBetweenCompanies ?? 400)
  const errors: string[] = []
  let articlesInserted = 0
  let leadershipMovesInserted = 0

  const dealCompanyIds = new Set<string>()
  let dealQuery = supabase
    .from('deals')
    .select('company_id,status,organization_id')
    .not('company_id', 'is', null)
  if (options?.organizationId) {
    dealQuery = dealQuery.eq('organization_id', options.organizationId)
  }
  const { data: dealRows, error: dealErr } = await dealQuery.limit(3000)
  if (dealErr) {
    errors.push(`deals: ${dealErr.message}`)
  } else {
    for (const row of dealRows ?? []) {
      if (isActiveDealStatus(row.status)) {
        const id = row.company_id ?? ''
        if (id) dealCompanyIds.add(id)
      }
    }
  }

  let coQuery = supabase
    .from('companies')
    .select(
      'id, organization_id, name, website_url, account_status, is_favorite, industry, newsroom_urls',
    )
    .not('organization_id', 'is', null)

  if (options?.organizationId) {
    coQuery = coQuery.eq('organization_id', options.organizationId)
  }

  const { data: allCompanies, error: coErr } = await coQuery.limit(8000)
  if (coErr) {
    return {
      companiesScanned: 0,
      articlesInserted: 0,
      leadershipMovesInserted: 0,
      errors: [`companies: ${coErr.message}`],
    }
  }

  const candidates =
    ingestMode === 'all_accounts'
      ? (allCompanies ?? [])
      : (allCompanies ?? []).filter((row) => Boolean(row.is_favorite))

  const seen = new Set<string>()
  const uniqueList: CompanyNewsIngestCompanyRow[] = []
  for (const row of candidates) {
    const id = row.id
    if (!id || seen.has(id) || !row.organization_id) continue
    seen.add(id)
    uniqueList.push({
      id,
      organization_id: row.organization_id,
      name: String(row.name ?? ''),
      website_url: row.website_url ?? null,
      account_status: row.account_status ?? null,
      industry: row.industry ?? null,
      newsroom_urls: row.newsroom_urls ?? null,
    })
    if (uniqueList.length >= maxCompanies) break
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 180_000)

  try {
    for (const company of uniqueList) {
      const host = hostFromWebsiteUrl(company.website_url)
      try {
        const items = await fetchMergedCompanyArticles(
          company.name,
          host,
          company.industry,
          company.newsroom_urls,
          {
            signal: controller.signal,
            maxItems: Math.min(28, perCompanyMax * 5),
          },
        )
        let insertedForCompany = 0
        for (const item of items) {
          if (insertedForCompany >= perCompanyMax) break
          const body = item.title.trim()
          if (body.length < 8) continue
          if (isLowValueRssTitle(body)) continue

          const leadership = isLeadershipMoveTitle(body)
          const ageLimit = leadership ? RSS_MAX_AGE_DAYS_LEADERSHIP : maxAgeDays
          if (!isRssPubDateWithinDays(item.pubDate, ageLimit)) continue

          const enrichment = await enrichSignal({
            title: body,
            companyName: company.name,
            snippet: item.description,
            sourceUrl: item.link,
          })
          if (!enrichment.is_relevant) continue

          const sourceLabel = formatSignalSourceLabel({
            url: item.link,
            sourceLabel: item.sourceLabel,
            title: body,
            companyName: company.name,
          })
          const newsroomHit =
            item.fromNewsroom || isStoredNewsroomHost(item.link, company.newsroom_urls)
          const packHit =
            item.fromPack ||
            isIndustryPackHost(item.link, company.industry) ||
            isPeoplePackHost(item.link)
          const ingestSource = newsroomHit
            ? 'company_newsroom_rss'
            : packHit
              ? 'industry_pack_rss'
              : host && item.link.includes(host)
                ? 'newsroom_rss'
                : 'google_news_rss'

          // Company-News mit Leadership → Move (auch ohne Champion-Watchlist)
          if (leadership) {
            const move = parseLeadershipMoveFromTitle(body, company.name)
            const personName =
              move.personName?.trim() ||
              (move.titleAfter ? `Neuer ${move.titleAfter}` : 'Führungswechsel')
            const personKey = normalizePersonKey(personName)
            const hash = execContentHash(company.id, personKey, item.link)
            const detectedAt =
              item.pubDate && Number.isFinite(item.pubDate.getTime())
                ? item.pubDate.toISOString()
                : new Date().toISOString()

            const execPayload = {
              company_id: company.id,
              person_name: personName,
              person_title_before: move.titleBefore,
              person_title_after: move.titleAfter,
              change_summary: body,
              detected_at: detectedAt,
              event_kind: 'role_change',
              source_url: item.link,
              content_hash: hash,
              signal_category:
                enrichment.signal_category === 'people'
                  ? 'people'
                  : enrichment.signal_category,
              insight_signal_fact: enrichment.insight_signal_fact,
              insight_why_now: enrichment.insight_why_now,
              created_by: null,
            }
            let insErr = (
              await supabase.from('market_signal_executive_events').insert(execPayload)
            ).error
            if (insErr && isMissingEnrichmentColumnsError(insErr.message)) {
              insErr = (
                await supabase
                  .from('market_signal_executive_events')
                  .insert(stripEnrichmentFields(execPayload))
              ).error
            }
            if (insErr) {
              const code = insErr.code
              if (
                code !== '23505' &&
                !/duplicate key|unique constraint/i.test(insErr.message)
              ) {
                errors.push(`${company.name}: ${insErr.message}`)
              }
            } else {
              leadershipMovesInserted += 1
              insertedForCompany += 1
            }
            continue
          }

          const hash = contentHash(company.id, item.link)
          const segment = segmentFromAccountStatus(company.account_status)
          const insertPayload = {
            company_id: company.id,
            body,
            source_label: sourceLabel,
            published_on: publishedOnIso(item.pubDate),
            segment,
            source_url: item.link,
            content_hash: hash,
            ingest_source: ingestSource,
            signal_category: enrichment.signal_category,
            insight_signal_fact: enrichment.insight_signal_fact,
            insight_why_now: enrichment.insight_why_now,
            created_by: null,
          }
          let insErr = (
            await supabase.from('market_signal_account_news').insert(insertPayload)
          ).error
          if (insErr && isMissingEnrichmentColumnsError(insErr.message)) {
            insErr = (
              await supabase
                .from('market_signal_account_news')
                .insert(stripEnrichmentFields(insertPayload))
            ).error
          }
          if (insErr) {
            const code = insErr.code
            if (
              code !== '23505' &&
              !/duplicate key|unique constraint/i.test(insErr.message)
            ) {
              errors.push(`${company.name}: ${insErr.message}`)
            }
          } else {
            articlesInserted += 1
            insertedForCompany += 1
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
    leadershipMovesInserted,
    errors: errors.slice(0, 25),
  }
}
