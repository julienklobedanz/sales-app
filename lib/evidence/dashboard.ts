import 'server-only'

import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCachedOrgReferenceRows } from '@/lib/cache/cached-org-reads'

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

const DEAL_REF_IN_CHUNK = 150

/** deal_references hat keine organization_id — auf Org-Referenz-IDs scopen (RLS-Session-Client). */
async function fetchDealReferenceRowsForRefs(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgRefIds: string[]
): Promise<{ data: { reference_id: string }[] }> {
  const rows: { reference_id: string }[] = []
  for (let i = 0; i < orgRefIds.length; i += DEAL_REF_IN_CHUNK) {
    const chunk = orgRefIds.slice(i, i + DEAL_REF_IN_CHUNK)
    const { data } = await supabase.from('deal_references').select('reference_id').in('reference_id', chunk)
    if (data?.length) rows.push(...(data as { reference_id: string }[]))
  }
  return { data: rows }
}

export async function getDashboardDataImpl(
  onlyFavorites = false,
  auth?: { orgId: string; userId: string }
) {
  const user = auth?.userId ? { id: auth.userId } : await getRequestUser()
  if (!user) {
    return { references: [], totalCount: 0, deletedCount: 0 }
  }

  const orgId =
    auth?.orgId ?? (await getRequestProfile())?.organization_id ?? null
  if (!orgId) {
    return { references: [], totalCount: 0, deletedCount: 0 }
  }

  const supabase = await createServerSupabaseClient()

  const [rows, favResult, deletedResult] = await Promise.all([
    getCachedOrgReferenceRows(orgId),
    user
      ? supabase.from('favorites').select('reference_id').eq('user_id', user.id)
      : Promise.resolve({ data: null }),
    // Trash-Indikator: planned reicht (Größenordnung), kein exakter Count nötig.
    supabase
      .from('references')
      .select('id', { count: 'planned', head: true })
      .eq('organization_id', orgId)
      .not('deleted_at', 'is', null),
  ])

  const orgRefIds = (rows ?? []).map((r) => String(r.id ?? '')).filter(Boolean)

  const [portfolioResult, dealRefResult] =
    orgRefIds.length > 0
      ? await Promise.all([
          supabase
            .from('shared_portfolios')
            .select('reference_ids, view_count')
            .overlaps('reference_ids', orgRefIds),
          fetchDealReferenceRowsForRefs(supabase, orgRefIds),
        ])
      : [{ data: [] as { reference_ids: string[]; view_count: number }[] }, { data: [] as { reference_id: string }[] }]

  // Favoriten des aktuellen Users (Set für schnellen Lookup)
  const favoriteIds = new Set<string>()
  const favs = favResult.data
  if (favs) {
    favs.forEach((f: { reference_id: string }) => favoriteIds.add(f.reference_id))
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
      approval_scope_named_mention: (r.approval_scope_named_mention as boolean | null) ?? null,
      approval_scope_anonymous_mention: (r.approval_scope_anonymous_mention as boolean | null) ?? null,
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
  const portfolioRows = portfolioResult.data
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
  const dealRefRows = dealRefResult.data
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  const orgId = profile?.organization_id ?? null
  if (!orgId) return []

  const { data, error } = await supabase
    .from('references')
    .select(
      `
        id,
        title,
        companies ( name )
      `
    )
    .eq('organization_id', orgId)
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

