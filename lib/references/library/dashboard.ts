import 'server-only'

import { accountFromJoin } from '@/lib/accounts/account-from-join'
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
const VALID_STATUSES: ReferenceStatus[] = [
  'draft',
  'internal_only',
  'approved',
  'anonymized',
]
function normalizeStatus(raw: unknown): ReferenceStatus {
  const s = String(raw ?? '')
    .toLowerCase()
    .trim()
  return (
    STATUS_MAP[s] ??
    (VALID_STATUSES.includes(s as ReferenceStatus) ? (s as ReferenceStatus) : 'draft')
  )
}

function contactPersonFromJoin(raw: unknown): {
  email?: string | null
  first_name?: string | null
  last_name?: string | null
} | null {
  const c = Array.isArray(raw) ? raw[0] : raw
  if (!c || typeof c !== 'object') return null
  return c as {
    email?: string | null
    first_name?: string | null
    last_name?: string | null
  }
}

const DEAL_REF_IN_CHUNK = 150

/** deal_references hat keine organization_id — auf Org-Referenz-IDs scopen (RLS-Session-Client). */
async function fetchDealReferenceRowsForRefs(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgRefIds: string[],
): Promise<{ data: { reference_id: string }[] }> {
  const rows: { reference_id: string }[] = []
  for (let i = 0; i < orgRefIds.length; i += DEAL_REF_IN_CHUNK) {
    const chunk = orgRefIds.slice(i, i + DEAL_REF_IN_CHUNK)
    const { data } = await supabase
      .from('deal_references')
      .select('reference_id')
      .in('reference_id', chunk)
    if (data?.length) rows.push(...data)
  }
  return { data: rows }
}

export async function getDashboardDataImpl(
  onlyFavorites = false,
  auth?: { orgId: string; userId: string },
) {
  const user = auth?.userId ? { id: auth.userId } : await getRequestUser()
  if (!user) {
    return { references: [], totalCount: 0, deletedCount: 0 }
  }

  const orgId = auth?.orgId ?? (await getRequestProfile())?.organization_id ?? null
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

  const orgRefIds = rows.map((r) => r.id).filter(Boolean)

  const [portfolioResult, dealRefResult] =
    orgRefIds.length > 0
      ? await Promise.all([
          supabase
            .from('shared_portfolios')
            .select('reference_ids, view_count')
            .overlaps('reference_ids', orgRefIds),
          fetchDealReferenceRowsForRefs(supabase, orgRefIds),
        ])
      : [
          { data: [] as { reference_ids: string[]; view_count: number }[] },
          { data: [] as { reference_id: string }[] },
        ]

  // Favoriten des aktuellen Users (Set für schnellen Lookup)
  const favoriteIds = new Set<string>()
  const favs = favResult.data
  if (favs) {
    favs.forEach((f) => favoriteIds.add(f.reference_id))
  }

  let references = rows.map((r) => {
    const company = accountFromJoin(r.companies)
    const contact = contactPersonFromJoin(r.contact_persons)
    const contactDisplay = contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
        contact.email ||
        null
      : null
    const start = r.project_start
    const end = r.project_end
    const projectStatus: 'active' | 'completed' | null =
      r.project_status === 'active' || r.project_status === 'completed'
        ? r.project_status
        : null
    let duration_months: number | null = null
    if (start && end) {
      const s = new Date(start)
      const e = new Date(end)
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
        duration_months = Math.max(
          0,
          (e.getUTCFullYear() - s.getUTCFullYear()) * 12 +
            (e.getUTCMonth() - s.getUTCMonth()),
        )
      }
    } else if (projectStatus === 'active' && start) {
      const s = new Date(start)
      const now = new Date()
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(now.getTime())) {
        duration_months = Math.max(
          0,
          (now.getUTCFullYear() - s.getUTCFullYear()) * 12 +
            (now.getUTCMonth() - s.getUTCMonth()),
        )
      }
    }
    return {
      id: r.id,
      title: r.title,
      summary: r.summary,
      industry: r.industry,
      country: r.country,
      website: r.website,
      employee_count: r.employee_count,
      volume_eur: r.volume_eur,
      contract_type: r.contract_type,
      incumbent_provider: r.incumbent_provider,
      competitors: r.competitors,
      customer_challenge: r.customer_challenge,
      our_solution: r.our_solution,
      status: normalizeStatus(r.status),
      customer_approval_status: r.customer_approval_status,
      approval_scope_named_mention: r.approval_scope_named_mention,
      approval_scope_anonymous_mention: r.approval_scope_anonymous_mention,
      created_at: r.created_at ?? '',
      updated_at: r.updated_at,
      company_id: r.company_id,
      company_name: company?.name ?? '—',
      company_logo_url: company?.logoUrl ?? null,
      contact_id: r.contact_id,
      contact_email: contact?.email ?? null,
      contact_display: contactDisplay ?? null,
      customer_contact_id: r.customer_contact_id,
      customer_contact: r.customer_contact,
      file_path: r.file_path,
      is_favorited: favoriteIds.has(r.id),
      tags: r.tags,
      project_status: projectStatus,
      project_start: r.project_start,
      project_end: r.project_end,
      duration_months,
      is_nda_deal: r.is_nda_deal,
      approval_competitor_blacklist: r.approval_competitor_blacklist ?? [],
      approval_requested_at: r.approval_requested_at ?? null,
      approval_internal_status: r.approval_internal_status ?? null,
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
      const ids = row.reference_ids ?? []
      const v = row.view_count ?? 0
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
      dealLinkCountByRefId.set(
        row.reference_id,
        (dealLinkCountByRefId.get(row.reference_id) ?? 0) + 1,
      )
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
