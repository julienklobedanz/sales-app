import type { SupabaseClient } from '@supabase/supabase-js'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'

export type GlobalSearchResult =
  | { kind: 'reference'; id: string; title: string; accountName: string | null }
  | { kind: 'account'; id: string; title: string }
  | { kind: 'deal'; id: string; title: string }

export function sanitizeIlikeUserInput(q: string): string {
  return q.trim().replace(/[%_\\]/g, '')
}

function buildIlikeOrFilter(columns: string[], raw: string): string | null {
  const safe = sanitizeIlikeUserInput(raw)
  if (!safe) return null
  const pat = `%${safe}%`
  return columns.map((col) => `${col}.ilike.${pat}`).join(',')
}

function companyNameFromReferenceRow(row: { companies?: unknown }): string | null {
  const c = row.companies
  if (c == null) return null
  const obj = Array.isArray(c) ? c[0] : c
  if (!obj || typeof obj !== 'object') return null
  const name = (obj as { name?: string | null }).name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

export function formatReferenceListLabel(
  title: string,
  accountName: string | null | undefined
): string {
  const acc = accountName?.trim()
  if (acc) return `${title} — ${acc}`
  return `${title} (${COPY.commandPalette.referenceNoAccountLabel})`
}

export function hrefForGlobalSearchResult(result: {
  kind: GlobalSearchResult['kind']
  id: string
}): string {
  if (result.kind === 'account') return ROUTES.accountsDetail(result.id)
  if (result.kind === 'deal') return ROUTES.deals.detail(result.id)
  return ROUTES.evidence.detail(result.id)
}

export async function searchGlobalEntities(
  supabase: SupabaseClient,
  rawQuery: string
): Promise<GlobalSearchResult[]> {
  const q = rawQuery.trim()
  if (!q) return []

  const refOr = buildIlikeOrFilter(['title', 'summary'], q)
  const dealOr = buildIlikeOrFilter(['title', 'industry'], q)
  const companyPat = sanitizeIlikeUserInput(q)
  if (!companyPat) return []

  const likePat = `%${companyPat}%`

  const [refs, accounts, deals] = await Promise.all([
    refOr
      ? supabase.from('references').select('id,title,companies(name)').or(refOr).limit(8)
      : supabase.from('references').select('id,title,companies(name)').ilike('title', likePat).limit(8),
    supabase.from('companies').select('id,name').ilike('name', likePat).limit(8),
    dealOr
      ? supabase.from('deals').select('id,title').or(dealOr).limit(8)
      : supabase.from('deals').select('id,title').ilike('title', likePat).limit(8),
  ])

  const next: GlobalSearchResult[] = []
  for (const r of (refs.data ?? []) as Array<{
    id: string
    title: string
    companies?: unknown
  }>) {
    next.push({
      kind: 'reference',
      id: r.id,
      title: r.title,
      accountName: companyNameFromReferenceRow(r),
    })
  }
  for (const a of (accounts.data ?? []) as Array<{ id: string; name: string }>) {
    next.push({ kind: 'account', id: a.id, title: a.name })
  }
  for (const d of (deals.data ?? []) as Array<{ id: string; title: string }>) {
    next.push({ kind: 'deal', id: d.id, title: d.title })
  }
  return next
}
