'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

type ReferenceStatus = 'draft' | 'internal_only' | 'approved' | 'anonymized'

/** Mapping alter/legacy Status-Werte auf das 4-Status-Modell (Daten-Wiederherstellung) */
const STATUS_MAP: Record<string, ReferenceStatus> = {
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
const VALID_STATUSES: ReferenceStatus[] = ['draft', 'internal_only', 'approved', 'anonymized']
function normalizeStatus(raw: unknown): ReferenceStatus {
  const s = String(raw ?? '').toLowerCase().trim()
  return STATUS_MAP[s] ?? (VALID_STATUSES.includes(s as ReferenceStatus) ? (s as ReferenceStatus) : 'draft')
}

export async function getDashboardDataImpl(onlyFavorites = false) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Relation per FK-Constraint-Name (Supabase: Table Editor → references → Beziehungen).
  const fullSelect = `
      id,
      title,
      summary,
      industry,
      country,
      website,
      employee_count,
      volume_eur,
      contract_type,
      incumbent_provider,
      competitors,
      customer_challenge,
      our_solution,
      status,
      customer_approval_status,
      created_at,
      updated_at,
      company_id,
      contact_id,
      customer_contact_id,
      customer_contact,
      file_path,
      tags,
      project_status,
      project_start,
      project_end,
      is_nda_deal,
      companies ( name, logo_url ),
      contact_persons!references_contact_id_fkey ( email, first_name, last_name )
    `

  let rows: Record<string, unknown>[] | null = null
  let error: { message: string; details?: string } | null = null

  const result = await supabase
    .from('references')
    .select(fullSelect)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  error = result.error
  rows = result.data

  const fullSelectNoRelations = `
    id, title, summary, industry, country, website, employee_count,
    volume_eur, contract_type, incumbent_provider, competitors,
    customer_challenge, our_solution, status, customer_approval_status, created_at, updated_at,
    company_id, contact_id, customer_contact_id, customer_contact, file_path, tags,
    project_status, project_start, project_end,
    is_nda_deal,
    companies ( name, logo_url )
  `
  const fullSelectMinimal = `
    id, title, summary, industry, country, website, employee_count,
    volume_eur, contract_type, incumbent_provider, competitors,
    customer_challenge, our_solution, status, customer_approval_status, created_at, updated_at,
    company_id, contact_id, file_path, tags,
    project_status, project_start, project_end,
    companies ( name, logo_url )
  `

  // Fallback 1: Ohne contact_persons (falls FK/Schema fehlt), weiter mit deleted_at-Filter
  if (error) {
    console.error('[getDashboardData] Supabase error:', error.message, error.details)
    const fallback = await supabase
      .from('references')
      .select(fullSelectNoRelations)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (!fallback.error) {
      rows = fallback.data
      error = null
    }
  }

  // Fallback 2: deleted_at-Spalte fehlt oder Filter schlägt fehl – ohne Filter laden, dann in JS filtern
  if (error) {
    const withDeletedColumn = await supabase
      .from('references')
      .select(fullSelectNoRelations + ', deleted_at')
      .order('created_at', { ascending: false })
    if (!withDeletedColumn.error && withDeletedColumn.data) {
      const data = withDeletedColumn.data as unknown as Record<string, unknown>[]
      rows = data.filter((r) => r.deleted_at == null || r.deleted_at === undefined)
      error = null
    }
  }

  // Fallback 3: Tabelle hat deleted_at gar nicht – alle Zeilen verwenden
  if (error) {
    const noDeletedFilter = await supabase
      .from('references')
      .select(fullSelectNoRelations)
      .order('created_at', { ascending: false })
    if (!noDeletedFilter.error) {
      rows = noDeletedFilter.data
      error = null
    }
  }

  // Fallback 4: is_nda_deal oder andere Spalte fehlt – minimale Spaltenliste
  if (error) {
    const minimal = await supabase
      .from('references')
      .select(fullSelectMinimal)
      .order('created_at', { ascending: false })
    if (!minimal.error) {
      rows = minimal.data
      error = null
    }
  }

  if (error) {
    console.error('[getDashboardData] All fallbacks failed:', error.message)
    return { references: [], totalCount: 0, deletedCount: 0 }
  }

  // Favoriten des aktuellen Users (Set für schnellen Lookup)
  const favoriteIds = new Set<string>()
  if (user) {
    const { data: favs } = await supabase.from('favorites').select('reference_id').eq('user_id', user.id)
    if (favs) {
      favs.forEach((f: { reference_id: string }) => favoriteIds.add(f.reference_id))
    }
  }

  let references = (rows ?? []).map((r: Record<string, unknown>) => {
    const raw = r.companies
    const company =
      Array.isArray(raw) && raw.length > 0
        ? (raw[0] as { name?: string; logo_url?: string | null })
        : (raw as { name?: string; logo_url?: string | null } | null)
    const contactRaw = r.contact_persons
    const contact = contactRaw
      ? Array.isArray(contactRaw) && contactRaw.length > 0
        ? (contactRaw[0] as { email?: string; first_name?: string; last_name?: string })
        : (contactRaw as { email?: string; first_name?: string; last_name?: string })
      : null
    const contactDisplay = contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || null
      : null
    const start = r.project_start as string | null
    const end = r.project_end as string | null
    const status = (r.project_status as 'active' | 'completed' | null) ?? null
    let duration_months: number | null = null
    if (start && end) {
      const s = new Date(start)
      const e = new Date(end)
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
        duration_months = Math.max(
          0,
          (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth())
        )
      }
    } else if (status === 'active' && start) {
      const s = new Date(start)
      const now = new Date()
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(now.getTime())) {
        duration_months = Math.max(
          0,
          (now.getUTCFullYear() - s.getUTCFullYear()) * 12 + (now.getUTCMonth() - s.getUTCMonth())
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
      contact_email: contact?.email ?? null,
      contact_display: contactDisplay ?? null,
      customer_contact_id: (r.customer_contact_id as string | null) ?? null,
      customer_contact: (r.customer_contact as string | null) ?? null,
      file_path: (r.file_path as string | null) ?? null,
      is_favorited: favoriteIds.has(r.id as string),
      tags: (r.tags as string | null) ?? null,
      project_status: (r.project_status as 'active' | 'completed' | null) ?? null,
      project_start: (r.project_start as string | null) ?? null,
      project_end: (r.project_end as string | null) ?? null,
      duration_months,
      is_nda_deal: (r.is_nda_deal as boolean | undefined) ?? false,
    }
  })

  if (onlyFavorites) {
    references = references.filter((r) => r.is_favorited)
  }

  const viewsByRefId = new Map<string, number>()
  const shareCountByRefId = new Map<string, number>()
  const { data: portfolioRows } = await supabase.from('shared_portfolios').select('reference_ids, view_count')
  if (portfolioRows?.length) {
    for (const row of portfolioRows) {
      const ids = (row.reference_ids as string[] | null) ?? []
      const v = (row.view_count as number) ?? 0
      for (const id of ids) {
        viewsByRefId.set(id, (viewsByRefId.get(id) ?? 0) + v)
        shareCountByRefId.set(id, (shareCountByRefId.get(id) ?? 0) + 1)
      }
    }
  }

  const dealLinkCountByRefId = new Map<string, number>()
  const { data: dealRefRows } = await supabase.from('deal_references').select('reference_id')
  if (dealRefRows?.length) {
    for (const row of dealRefRows) {
      const id = (row as { reference_id?: string }).reference_id
      if (id) dealLinkCountByRefId.set(id, (dealLinkCountByRefId.get(id) ?? 0) + 1)
    }
  }

  references = references.map((r) => ({
    ...r,
    total_share_views: viewsByRefId.get(r.id) ?? 0,
    share_link_count: shareCountByRefId.get(r.id) ?? 0,
    deal_link_count: dealLinkCountByRefId.get(r.id) ?? 0,
  }))

  let deletedCount = 0
  const deletedResult = await supabase
    .from('references')
    .select('id', { count: 'exact', head: true })
    .not('deleted_at', 'is', null)
  if (!deletedResult.error) {
    deletedCount = deletedResult.count ?? 0
  }

  return {
    references,
    totalCount: references.length,
    deletedCount,
  }
}

export async function getDeletedReferencesImpl() {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('references')
    .select(
      `
        id,
        title,
        companies ( name )
      `
    )
    .not('deleted_at', 'is', null)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as unknown as Array<Record<string, unknown>>).map((r) => {
    const raw = r.companies as unknown
    const company =
      Array.isArray(raw) && raw.length > 0
        ? (raw[0] as { name?: string; logo_url?: string | null })
        : (raw as { name?: string; logo_url?: string | null } | null)
    return {
      id: r.id as string,
      title: (r.title as string) ?? '',
      company_name: company?.name ?? '—',
    }
  })
}

