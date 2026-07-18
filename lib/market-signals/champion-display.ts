import type { SupabaseClient } from '@supabase/supabase-js'

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Resolves a person title from org stakeholders and executive signal events. */
export async function resolveChampionPersonTitle(
  supabase: SupabaseClient,
  orgId: string,
  personName: string,
  companyName?: string | null
): Promise<string | null> {
  const key = normalizeKey(personName)
  if (!key) return null
  const company = String(companyName ?? '').trim().toLowerCase()

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('organization_id', orgId)
    .limit(2000)
  const companyIds = (companies ?? []).map((c) => String((c as { id?: string }).id ?? '')).filter(Boolean)
  if (companyIds.length === 0) return null

  const nameToCompanyId = new Map<string, string>()
  for (const c of companies ?? []) {
    const id = String((c as { id?: string }).id ?? '')
    const name = String((c as { name?: string | null }).name ?? '')
      .trim()
      .toLowerCase()
    if (id && name) nameToCompanyId.set(name, id)
  }

  let preferredCompanyId: string | null = null
  if (company) {
    preferredCompanyId = nameToCompanyId.get(company) ?? null
    if (!preferredCompanyId) {
      for (const [name, id] of nameToCompanyId) {
        if (name.includes(company) || company.includes(name)) {
          preferredCompanyId = id
          break
        }
      }
    }
  }

  const { data: stakeholders } = await supabase
    .from('stakeholders')
    .select('name, title, company_id')
    .in('company_id', companyIds)
    .not('title', 'is', null)
    .limit(2000)

  const stakeholderMatches = (stakeholders ?? []).filter((row) => {
    const nameKey = normalizeKey(String((row as { name?: string }).name ?? ''))
    return nameKey === key && String((row as { title?: string | null }).title ?? '').trim()
  }) as Array<{ name: string; title: string | null; company_id: string | null }>

  if (preferredCompanyId) {
    const atCompany = stakeholderMatches.find((row) => row.company_id === preferredCompanyId)
    if (atCompany?.title?.trim()) return atCompany.title.trim()
  }
  if (stakeholderMatches[0]?.title?.trim()) return stakeholderMatches[0].title.trim()

  const { data: events } = await supabase
    .from('market_signal_executive_events')
    .select('person_name, person_title_after, person_title_before, company_id, detected_at')
    .in('company_id', companyIds)
    .ilike('person_name', personName.trim())
    .order('detected_at', { ascending: false })
    .limit(20)

  const eventRows = (events ?? []) as Array<{
    person_name: string
    person_title_after: string | null
    person_title_before: string | null
    company_id: string
  }>

  const preferredEvent = preferredCompanyId
    ? eventRows.find((row) => row.company_id === preferredCompanyId)
    : null
  const event = preferredEvent ?? eventRows[0]
  if (!event) return null
  return (
    String(event.person_title_after ?? '').trim() ||
    String(event.person_title_before ?? '').trim() ||
    null
  )
}

export function formatExecutiveMetaLine(
  title: string | null | undefined,
  companyName: string | null | undefined
): string {
  const t = String(title ?? '').trim()
  const c = String(companyName ?? '').trim()
  if (t && c) return `${t} · ${c}`
  if (t) return t
  if (c) return c
  return '—'
}

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  const first = parts[0]![0] ?? ''
  const last = parts[parts.length - 1]![0] ?? ''
  return `${first}${last}`.toUpperCase()
}
