'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generatePortfolioSlug } from '@/lib/slug'

import type { ReferenceRow } from '@/app/dashboard/actions'

/** Mapping alter/legacy Status-Werte auf das 4-Status-Modell (Daten-Wiederherstellung) */
const STATUS_MAP: Record<string, ReferenceRow['status']> = {
  draft: 'draft',
  internal_only: 'internal_only',
  approved: 'approved',
  anonymized: 'anonymized',
  pending: 'internal_only',
  external: 'approved',
  internal: 'internal_only',
  anonymous: 'anonymized',
  restricted: 'internal_only',
}
const VALID_STATUSES: ReferenceRow['status'][] = ['draft', 'internal_only', 'approved', 'anonymized']
function normalizeStatus(raw: unknown): ReferenceRow['status'] {
  const s = String(raw ?? '').toLowerCase().trim()
  return STATUS_MAP[s] ?? (VALID_STATUSES.includes(s as ReferenceRow['status']) ? (s as ReferenceRow['status']) : 'draft')
}

export async function createSharedPortfolioImpl(
  referenceIds: string[]
): Promise<{ success: true; url: string; slug: string } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  if (!referenceIds?.length) return { success: false, error: 'Mindestens eine Referenz nötig.' }

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generatePortfolioSlug()
    const { error } = await supabase.from('shared_portfolios').insert({
      slug,
      reference_ids: referenceIds,
      is_active: true,
      view_count: 0,
    })
    if (!error) {
      const url = `/p/${slug}`
      return { success: true, url, slug }
    }
    const code = (error as { code?: string }).code
    if (code === '23505') continue // unique violation, retry
    if (code === '42P01' || /shared_portfolios/i.test(error.message)) {
      console.error(
        '[createSharedPortfolio] shared_portfolios Tabelle fehlt oder Schema-Cache veraltet:',
        error
      )
      return {
        success: false,
        error:
          'Kundenlink konnte nicht erstellt werden, da die Tabelle "shared_portfolios" in der Datenbank fehlt oder das Schema noch nicht aktualisiert wurde. Bitte Migration in Supabase ausführen.',
      }
    }
    console.error(
      '[createSharedPortfolio] shared_portfolios insert failed (Schema/Berechtigung?):',
      error.message,
      error
    )
    return { success: false, error: error.message }
  }
  return { success: false, error: 'Slug-Kollision. Bitte erneut versuchen.' }
}

export async function getExistingShareForReferenceImpl(
  referenceId: string
): Promise<{ slug: string; url: string } | null> {
  const supabase = await createServerSupabaseClient()
  const { data: rows, error } = await supabase
    .from('shared_portfolios')
    .select('slug')
    .eq('is_active', true)
    .contains('reference_ids', [referenceId])
    .limit(1)
  if (error) {
    const code = (error as { code?: string }).code
    if (code === '42P01' || /shared_portfolios/i.test(error.message)) {
      console.error(
        '[getExistingShareForReference] shared_portfolios Tabelle fehlt oder Schema-Cache veraltet:',
        error
      )
      // Kein harter Fehler im UI – einfach so tun, als gäbe es keinen bestehenden Link
      return null
    }
    console.error('[getExistingShareForReference] Fehler beim Laden von shared_portfolios:', error)
    return null
  }
  const row = rows?.[0]
  if (!row?.slug) return null
  return { slug: row.slug, url: `/p/${row.slug}` }
}

export async function getReferencesByIdsImpl(ids: string[]): Promise<ReferenceRow[]> {
  if (!ids.length) return []
  const supabase = await createServerSupabaseClient()
  const { data: rows } = await supabase
    .from('references')
    .select(
      `
      id, title, summary, industry, country, website, employee_count,
      volume_eur, contract_type, incumbent_provider, competitors,
      customer_challenge, our_solution, status, customer_approval_status, created_at, updated_at,
      company_id, contact_id, file_path, tags, project_status, project_start, project_end,
      is_nda_deal,
      companies ( name, logo_url )
    `
    )
    .in('id', ids)
    .is('deleted_at', null)
  if (!rows?.length) return []
  return rows.map((r: Record<string, unknown>) => {
    const raw = r.companies
    const company =
      Array.isArray(raw) && raw.length > 0
        ? (raw[0] as { name?: string; logo_url?: string | null })
        : (raw as { name?: string; logo_url?: string | null } | null)
    const start = r.project_start as string | null
    const end = r.project_end as string | null
    let duration_months: number | null = null
    if (start && end) {
      const s = new Date(start)
      const e = new Date(end)
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
        duration_months = Math.max(
          0,
          (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
        )
      }
    }
    return {
      id: r.id as string,
      title: r.title as string,
      summary: (r.summary as string | null) ?? null,
      industry: (r.industry as string | null) ?? null,
      country: (r.country as string | null) ?? null,
      website: (r.website as string | null) ?? null,
      employee_count: (r.employee_count as number | null) ?? null,
      volume_eur: (r.volume_eur as string | null) ?? null,
      contract_type: (r.contract_type as string | null) ?? null,
      incumbent_provider: (r.incumbent_provider as string | null) ?? null,
      competitors: (r.competitors as string | null) ?? null,
      customer_challenge: (r.customer_challenge as string | null) ?? null,
      our_solution: (r.our_solution as string | null) ?? null,
      status: normalizeStatus(r.status),
      customer_approval_status: (r.customer_approval_status as string | null) ?? null,
      created_at: r.created_at as string,
      updated_at: (r.updated_at as string | null) ?? null,
      company_id: r.company_id as string,
      company_name: company?.name ?? '—',
      company_logo_url: company?.logo_url ?? null,
      contact_id: (r.contact_id as string | null) ?? null,
      contact_email: null,
      contact_display: null,
      customer_contact: null,
      file_path: (r.file_path as string | null) ?? null,
      is_favorited: false,
      tags: (r.tags as string | null) ?? null,
      project_status: (r.project_status as 'active' | 'completed' | null) ?? null,
      project_start: (r.project_start as string | null) ?? null,
      project_end: (r.project_end as string | null) ?? null,
      duration_months,
      is_nda_deal: (r.is_nda_deal as boolean | undefined) ?? false,
    }
  })
}

