import type { SupabaseClient } from '@supabase/supabase-js'

import { isMissingEnrichmentColumnsError } from './enrichment-db'
import { enrichSignal } from './enrich-signal-with-llm'

const MIGRATION_HINT =
  'Migration 20260619120000_market_signal_llm_enrichment.sql in Supabase ausführen (signal_category, insight_signal_fact, insight_why_now).'

export type BackfillSignalEnrichmentOptions = {
  organizationId?: string
  maxNews?: number
  maxExecutives?: number
  pauseMsBetweenItems?: number
  /** Bei is_relevant=false Zeile löschen (wie beim RSS-Ingest). Default: true */
  removeIrrelevant?: boolean
}

export type BackfillSignalEnrichmentResult = {
  newsProcessed: number
  newsUpdated: number
  newsDeleted: number
  executivesProcessed: number
  executivesUpdated: number
  executivesDeleted: number
  errors: string[]
}

type CompanyJoin = { name?: string | null; organization_id?: string | null }

function companyFromRow(row: Record<string, unknown>): CompanyJoin | null {
  const raw = row.companies
  if (Array.isArray(raw)) return (raw[0] as CompanyJoin) ?? null
  return (raw as CompanyJoin | null) ?? null
}

async function resolveCompanyIds(
  supabase: SupabaseClient,
  organizationId?: string,
): Promise<string[] | null> {
  if (!organizationId) return null
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(10_000)
  if (error) throw new Error(`companies: ${error.message}`)
  return (data ?? [])
    .map((row) => String((row as { id?: string }).id ?? ''))
    .filter(Boolean)
}

function needsEnrichment(row: Record<string, unknown>): boolean {
  const fact = String(row.insight_signal_fact ?? '').trim()
  const why = String(row.insight_why_now ?? '').trim()
  return !fact || !why
}

async function pause(ms: number) {
  if (ms > 0) await new Promise((r) => setTimeout(r, ms))
}

export async function runMarketSignalEnrichmentBackfill(
  supabase: SupabaseClient,
  options?: BackfillSignalEnrichmentOptions,
): Promise<BackfillSignalEnrichmentResult> {
  const maxNews = Math.min(500, Math.max(1, options?.maxNews ?? 80))
  const maxExecutives = Math.min(500, Math.max(1, options?.maxExecutives ?? 80))
  const pauseMs = Math.max(0, options?.pauseMsBetweenItems ?? 350)
  const removeIrrelevant = options?.removeIrrelevant !== false
  const errors: string[] = []

  let newsProcessed = 0
  let newsUpdated = 0
  let newsDeleted = 0
  let executivesProcessed = 0
  let executivesUpdated = 0
  let executivesDeleted = 0

  const companyIds = await resolveCompanyIds(supabase, options?.organizationId)

  const enrichmentProbe = await supabase
    .from('market_signal_account_news')
    .select('insight_signal_fact')
    .limit(1)
  if (
    enrichmentProbe.error &&
    isMissingEnrichmentColumnsError(enrichmentProbe.error.message)
  ) {
    return {
      newsProcessed: 0,
      newsUpdated: 0,
      newsDeleted: 0,
      executivesProcessed: 0,
      executivesUpdated: 0,
      executivesDeleted: 0,
      errors: [MIGRATION_HINT],
    }
  }

  let newsQuery = supabase
    .from('market_signal_account_news')
    .select(
      'id, body, company_id, insight_signal_fact, insight_why_now, companies ( name, organization_id )',
    )
    .order('published_on', { ascending: false })
    .limit(maxNews * 3)

  if (companyIds) {
    if (companyIds.length === 0) {
      return {
        newsProcessed: 0,
        newsUpdated: 0,
        newsDeleted: 0,
        executivesProcessed: 0,
        executivesUpdated: 0,
        executivesDeleted: 0,
        errors: [],
      }
    }
    newsQuery = newsQuery.in('company_id', companyIds)
  }

  const { data: newsRows, error: newsErr } = await newsQuery
  if (newsErr) {
    return {
      newsProcessed: 0,
      newsUpdated: 0,
      newsDeleted: 0,
      executivesProcessed: 0,
      executivesUpdated: 0,
      executivesDeleted: 0,
      errors: [`account_news: ${newsErr.message}`],
    }
  }

  const newsCandidates = (newsRows ?? [])
    .filter((row) => needsEnrichment(row as Record<string, unknown>))
    .slice(0, maxNews)

  for (const row of newsCandidates) {
    const record = row as Record<string, unknown>
    const id = String(record.id ?? '')
    const body = String(record.body ?? '').trim()
    const company = companyFromRow(record)
    const companyName = String(company?.name ?? '').trim() || 'Unbekannt'
    if (!id || body.length < 4) continue

    newsProcessed += 1
    try {
      const enrichment = await enrichSignal({ title: body, companyName })
      if (!enrichment.is_relevant) {
        if (removeIrrelevant) {
          const { error: delErr } = await supabase
            .from('market_signal_account_news')
            .delete()
            .eq('id', id)
          if (delErr) errors.push(`news ${id}: ${delErr.message}`)
          else newsDeleted += 1
        }
        await pause(pauseMs)
        continue
      }

      const { error: updErr } = await supabase
        .from('market_signal_account_news')
        .update({
          signal_category: enrichment.signal_category,
          insight_signal_fact: enrichment.insight_signal_fact,
          insight_why_now: enrichment.insight_why_now,
        })
        .eq('id', id)

      if (updErr) errors.push(`news ${id}: ${updErr.message}`)
      else newsUpdated += 1
    } catch (e) {
      errors.push(`news ${id}: ${e instanceof Error ? e.message : String(e)}`)
    }
    await pause(pauseMs)
  }

  let execQuery = supabase
    .from('market_signal_executive_events')
    .select(
      'id, person_name, change_summary, company_id, event_kind, insight_signal_fact, insight_why_now, companies ( name, organization_id )',
    )
    .order('detected_at', { ascending: false })
    .limit(maxExecutives * 3)

  if (companyIds) {
    execQuery = execQuery.in('company_id', companyIds)
  }

  const { data: execRows, error: execErr } = await execQuery
  if (execErr) {
    errors.push(`executive_events: ${execErr.message}`)
    return {
      newsProcessed,
      newsUpdated,
      newsDeleted,
      executivesProcessed,
      executivesUpdated,
      executivesDeleted,
      errors: errors.slice(0, 40),
    }
  }

  const execCandidates = (execRows ?? [])
    .filter((row) => needsEnrichment(row as Record<string, unknown>))
    .slice(0, maxExecutives)

  for (const row of execCandidates) {
    const record = row as Record<string, unknown>
    const id = String(record.id ?? '')
    const title = String(record.change_summary ?? '').trim()
    const personName = String(record.person_name ?? '').trim()
    const company = companyFromRow(record)
    const companyName = String(company?.name ?? '').trim() || 'Unbekannt'
    if (!id || title.length < 4) continue

    executivesProcessed += 1
    try {
      const enrichment = await enrichSignal({
        title,
        companyName,
        personName: personName || undefined,
      })
      if (!enrichment.is_relevant) {
        if (removeIrrelevant) {
          const { error: delErr } = await supabase
            .from('market_signal_executive_events')
            .delete()
            .eq('id', id)
          if (delErr) errors.push(`exec ${id}: ${delErr.message}`)
          else executivesDeleted += 1
        }
        await pause(pauseMs)
        continue
      }

      const { error: updErr } = await supabase
        .from('market_signal_executive_events')
        .update({
          signal_category: enrichment.signal_category,
          insight_signal_fact: enrichment.insight_signal_fact,
          insight_why_now: enrichment.insight_why_now,
        })
        .eq('id', id)

      if (updErr) errors.push(`exec ${id}: ${updErr.message}`)
      else executivesUpdated += 1
    } catch (e) {
      errors.push(`exec ${id}: ${e instanceof Error ? e.message : String(e)}`)
    }
    await pause(pauseMs)
  }

  return {
    newsProcessed,
    newsUpdated,
    newsDeleted,
    executivesProcessed,
    executivesUpdated,
    executivesDeleted,
    errors: errors.slice(0, 40),
  }
}
