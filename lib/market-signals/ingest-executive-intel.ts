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
  isLeadershipMoveTitle,
  parseLeadershipMoveFromTitle,
} from '@/lib/market-signals/leadership-move'
import {
  isLowValueRssTitle,
  isRssPubDateWithinDays,
  RSS_MAX_AGE_DAYS_DEFAULT,
  RSS_MAX_AGE_DAYS_LEADERSHIP,
} from '@/lib/market-signals/sales-signal-relevance'
import {
  buildPeoplePackRssQueries,
  isPeoplePackHost,
} from '@/lib/market-signals/source-packs'

function normalizeChampionKey(raw: string | null | undefined) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function intelContentHash(
  companyId: string,
  personKey: string,
  articleUrl: string,
): string {
  return createHash('sha256')
    .update(`${companyId}|${personKey}|${articleUrl}`, 'utf8')
    .digest('hex')
}

function normalizeCompanyMatchKey(name: string | null | undefined): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Breite Suche: Person + Firma (Google News Index). */
export function rssQueryPersonAndCompany(
  personName: string,
  companyName: string,
): string {
  const p = personName.trim()
  const c = companyName.trim()
  if (!p) return ''
  if (c) return `"${p}" "${c}"`
  return `"${p}"`
}

/**
 * Fach-/IT-/Karriere-Presse (DACH) über Google News – Personen-Source-Pack.
 * Kein Scraping, nur site:-Einschränkung in der News-Suche.
 */
function rssQueryTradePress(personName: string, companyName?: string | null): string[] {
  return buildPeoplePackRssQueries(personName, companyName)
}

async function fetchMergedExecutiveArticles(
  personName: string,
  companyName: string,
  opts: { signal: AbortSignal; maxTotal?: number },
): Promise<Array<GoogleNewsRssItem & { fromPack: boolean }>> {
  const maxTotal = Math.min(16, Math.max(4, opts.maxTotal ?? 8))
  const packQs = rssQueryTradePress(personName, companyName)
  const broad = rssQueryPersonAndCompany(personName, companyName)
  const queries = [...packQs, broad].filter(Boolean)
  const perQuery = Math.max(
    3,
    Math.ceil(maxTotal / Math.max(1, Math.min(queries.length, 6))) + 1,
  )

  const batches = await Promise.all(
    queries.map(async (q, index) => {
      const items = await fetchGoogleNewsRssItems(q, {
        signal: opts.signal,
        maxItems: perQuery,
      }).catch(() => [] as GoogleNewsRssItem[])
      const fromPack = index < packQs.length
      return items.map((item) => ({ ...item, fromPack }))
    }),
  )

  const byLink = new Map<string, GoogleNewsRssItem & { fromPack: boolean }>()
  for (const item of batches.flat()) {
    if (!item.link) continue
    const prev = byLink.get(item.link)
    if (!prev || (item.fromPack && !prev.fromPack)) {
      byLink.set(item.link, item)
    }
  }

  return Array.from(byLink.values())
    .sort((a, b) => {
      const aPack = a.fromPack || isPeoplePackHost(a.link)
      const bPack = b.fromPack || isPeoplePackHost(b.link)
      if (aPack !== bPack) return aPack ? -1 : 1
      return (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0)
    })
    .slice(0, maxTotal)
}

export type RunExecutiveIntelIngestResult = {
  peopleScanned: number
  signalsInserted: number
  skippedNoCompany: number
  errors: string[]
}

/**
 * Für jede Executive auf der Champion-Watchlist (aller User der Org): Google News RSS,
 * Zuordnung zu company_id über Stakeholder-Name oder frühere Executive-Events.
 */
export async function runExecutiveIntelIngest(
  supabase: SupabaseClient<Database>,
  options?: {
    organizationId?: string
    maxPeople?: number
    pauseMsBetweenPeople?: number
  },
): Promise<RunExecutiveIntelIngestResult> {
  const maxPeople = Math.min(150, Math.max(1, options?.maxPeople ?? 35))
  const pauseMs = Math.max(0, options?.pauseMsBetweenPeople ?? 500)
  const errors: string[] = []
  let signalsInserted = 0
  let skippedNoCompany = 0
  let peopleScanned = 0

  const { data: watchRaw, error: watchErr } = await supabase
    .from('market_signal_champion_watchlist')
    .select('person_key, person_name, company_name, user_id')
    .eq('is_active', true)
    .limit(4000)

  if (watchErr) {
    return {
      peopleScanned: 0,
      signalsInserted: 0,
      skippedNoCompany: 0,
      errors: [watchErr.message],
    }
  }

  const userIds = [
    ...new Set((watchRaw ?? []).map((w) => w.user_id).filter(Boolean)),
  ]
  const { data: profs, error: profErr } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .in('id', userIds.filter(Boolean))

  if (profErr) {
    return {
      peopleScanned: 0,
      signalsInserted: 0,
      skippedNoCompany: 0,
      errors: [profErr.message],
    }
  }

  const orgByUser = new Map<string, string>()
  for (const p of profs ?? []) {
    if (p.id && p.organization_id) orgByUser.set(p.id, p.organization_id)
  }

  type Watched = {
    orgId: string
    personKey: string
    personName: string
    watchlistCompanyName: string | null
  }
  const watchedByOrg = new Map<string, Map<string, Watched>>()

  for (const row of watchRaw ?? []) {
    const uid = row.user_id
    const personKey = normalizeChampionKey(row.person_key ?? '')
    const personName = String(row.person_name ?? '').trim()
    const watchlistCompanyName = String(row.company_name ?? '').trim() || null
    if (!personKey || !personName) continue
    const orgId = orgByUser.get(uid)
    if (!orgId) continue
    if (options?.organizationId && orgId !== options.organizationId) continue
    if (!watchedByOrg.has(orgId)) watchedByOrg.set(orgId, new Map())
    const m = watchedByOrg.get(orgId)!
    const existing = m.get(personKey)
    if (!existing) {
      m.set(personKey, { orgId, personKey, personName, watchlistCompanyName })
      continue
    }
    if (watchlistCompanyName && !existing.watchlistCompanyName) {
      m.set(personKey, { ...existing, watchlistCompanyName })
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 180_000)

  try {
    for (const [orgId, peopleMap] of watchedByOrg) {
      const people = Array.from(peopleMap.values()).slice(0, maxPeople)

      const { data: orgCompanies } = await supabase
        .from('companies')
        .select('id, name')
        .eq('organization_id', orgId)
      const orgCompanyList = (orgCompanies ?? []).map((c) => ({
        id: c.id,
        name: String(c.name ?? '').trim(),
      }))
      const allowedCompanyIds = new Set(orgCompanyList.map((c) => c.id).filter(Boolean))
      const companyIdByNormalizedName = new Map<string, string>()
      for (const company of orgCompanyList) {
        const key = normalizeCompanyMatchKey(company.name)
        if (key && !companyIdByNormalizedName.has(key)) {
          companyIdByNormalizedName.set(key, company.id)
        }
      }

      function resolveCompanyIdByWatchlistName(
        companyName: string | null | undefined,
      ): string | null {
        const key = normalizeCompanyMatchKey(companyName)
        if (!key) return null
        const exact = companyIdByNormalizedName.get(key)
        if (exact) return exact
        for (const company of orgCompanyList) {
          const n = normalizeCompanyMatchKey(company.name)
          if (!n) continue
          if (n.includes(key) || key.includes(n)) return company.id
        }
        return null
      }

      const stakeholderCompanyByKey = new Map<string, string>()
      if (allowedCompanyIds.size > 0) {
        // Datenbestand wird seit S2 nicht mehr gepflegt; Event-Fallback ist der verlässliche Pfad.
        const { data: stakeholders } = await supabase
          .from('stakeholders')
          .select('name, company_id')
          .in('company_id', Array.from(allowedCompanyIds))
          .limit(3000)
        for (const s of stakeholders ?? []) {
          const name = String(s.name ?? '')
          const cid = s.company_id ?? ''
          const k = normalizeChampionKey(name)
          if (!k || !cid || stakeholderCompanyByKey.has(k)) continue
          stakeholderCompanyByKey.set(k, cid)
        }
      }

      const eventCompanyByKey = new Map<string, string>()
      if (allowedCompanyIds.size > 0) {
        const { data: evs } = await supabase
          .from('market_signal_executive_events')
          .select('person_name, company_id')
          .in('company_id', Array.from(allowedCompanyIds))
          .order('detected_at', { ascending: false })
          .limit(800)
        for (const e of evs ?? []) {
          const k = normalizeChampionKey(String(e.person_name ?? ''))
          const cid = e.company_id
          if (!k || !cid || eventCompanyByKey.has(k)) continue
          eventCompanyByKey.set(k, cid)
        }
      }

      for (const w of people) {
        peopleScanned += 1
        const companyId =
          resolveCompanyIdByWatchlistName(w.watchlistCompanyName) ??
          stakeholderCompanyByKey.get(w.personKey) ??
          eventCompanyByKey.get(w.personKey) ??
          null
        if (!companyId) {
          skippedNoCompany += 1
          continue
        }

        const companyNameFromDb =
          orgCompanyList.find((c) => c.id === companyId)?.name?.trim() ?? ''
        const rssCompanyName = w.watchlistCompanyName?.trim() || companyNameFromDb

        try {
          const items = await fetchMergedExecutiveArticles(w.personName, rssCompanyName, {
            signal: controller.signal,
            maxTotal: 8,
          })
          for (const item of items) {
            const title = item.title.trim()
            if (title.length < 10) continue
            if (isLowValueRssTitle(title)) continue
            const leadership = isLeadershipMoveTitle(title)
            const ageDays = leadership
              ? RSS_MAX_AGE_DAYS_LEADERSHIP
              : RSS_MAX_AGE_DAYS_DEFAULT
            if (!isRssPubDateWithinDays(item.pubDate, ageDays)) continue

            const enrichment = await enrichSignal({
              title,
              companyName: rssCompanyName || companyNameFromDb,
              personName: w.personName,
              snippet: item.description,
              sourceUrl: item.link,
            })
            if (!enrichment.is_relevant) continue

            const move = parseLeadershipMoveFromTitle(
              title,
              rssCompanyName || companyNameFromDb,
            )
            const hash = intelContentHash(companyId, w.personKey, item.link)
            const detectedAt =
              item.pubDate && Number.isFinite(item.pubDate.getTime())
                ? item.pubDate.toISOString()
                : new Date().toISOString()

            const insertPayload = {
              company_id: companyId,
              person_name: w.personName,
              person_title_before: move.titleBefore,
              person_title_after: move.titleAfter,
              change_summary: title,
              detected_at: detectedAt,
              event_kind:
                move.eventKind === 'role_change' || leadership
                  ? 'role_change'
                  : 'news_mention',
              source_url: item.link,
              content_hash: hash,
              signal_category: enrichment.signal_category,
              insight_signal_fact: enrichment.insight_signal_fact,
              insight_why_now: enrichment.insight_why_now,
              created_by: null,
            }
            let insErr = (
              await supabase.from('market_signal_executive_events').insert(insertPayload)
            ).error
            if (insErr && isMissingEnrichmentColumnsError(insErr.message)) {
              insErr = (
                await supabase
                  .from('market_signal_executive_events')
                  .insert(stripEnrichmentFields(insertPayload))
              ).error
            }
            if (insErr) {
              const code = insErr.code
              if (
                code !== '23505' &&
                !/duplicate key|unique constraint/i.test(insErr.message)
              ) {
                errors.push(`${w.personName}: ${insErr.message}`)
              }
            } else {
              signalsInserted += 1
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          errors.push(`${w.personName}: ${msg}`)
        }

        if (pauseMs > 0) await new Promise((r) => setTimeout(r, pauseMs))
      }
    }
  } finally {
    clearTimeout(timeout)
  }

  return {
    peopleScanned,
    signalsInserted,
    skippedNoCompany,
    errors: errors.slice(0, 30),
  }
}
