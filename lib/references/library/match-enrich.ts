import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fetchCompanyFieldsForReferenceIds } from '@/lib/references/enrich-match-hits-company'
import type { MatchReferenceHit } from '@/lib/match/match-types'

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>

export async function attachCompanyFields(
  supabase: Supabase,
  matches: MatchReferenceHit[]
): Promise<MatchReferenceHit[]> {
  if (matches.length === 0) return matches
  const companyByRef = await fetchCompanyFieldsForReferenceIds(
    supabase,
    matches.map((m) => m.id)
  )
  return matches.map((m) => {
    const co = companyByRef.get(m.id)
    if (!co) return m
    return {
      ...m,
      companyId: co.companyId,
      companyName: m.companyName ?? co.companyName,
      companyLogoUrl: co.companyLogoUrl,
    }
  })
}

export async function attachProjectDates(
  supabase: Supabase,
  matches: MatchReferenceHit[]
): Promise<MatchReferenceHit[]> {
  if (matches.length === 0) return matches
  const missing = matches.filter((m) => m.projectStart == null && m.projectEnd == null)
  if (!missing.length) return matches
  const { data } = await supabase
    .from('references')
    .select('id, project_start, project_end')
    .in(
      'id',
      missing.map((m) => m.id)
    )
  const byId = new Map(
    (data ?? []).map((r) => [
      String(r.id),
      {
        projectStart: (r.project_start as string | null) ?? null,
        projectEnd: (r.project_end as string | null) ?? null,
      },
    ])
  )
  return matches.map((m) => {
    const row = byId.get(m.id)
    if (!row) return m
    return {
      ...m,
      projectStart: m.projectStart ?? row.projectStart,
      projectEnd: m.projectEnd ?? row.projectEnd,
    }
  })
}
