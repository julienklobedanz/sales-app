import type { SupabaseClient } from '@supabase/supabase-js'

import type { ExternalContactRow } from '@/app/dashboard/accounts/actions'

const SELECT_BASE =
  'id, company_id, first_name, last_name, email, role, created_at, updated_at'

const SELECT_WITH_PHONE = `${SELECT_BASE}, phone`
const SELECT_FULL = `${SELECT_WITH_PHONE}, last_interaction_at`

type FetchFlags = { phone: boolean; lastInteraction: boolean }

function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error ?? '')
  const e = error as { message?: string; details?: string; hint?: string; code?: string }
  return [e.message, e.details, e.hint, e.code].filter(Boolean).join(' ')
}

function isLikelyMissingColumnError(text: string): boolean {
  const t = text.toLowerCase()
  return (
    t.includes('column') ||
    t.includes('schema cache') ||
    t.includes('could not find') ||
    (t.includes('does not exist') && (t.includes('external_contacts') || t.includes('phone') || t.includes('last_interaction')))
  )
}

function mapRows(
  rows: Record<string, unknown>[] | null,
  flags: FetchFlags
): ExternalContactRow[] {
  return (rows ?? []).map((r) => ({
    id: String(r.id),
    company_id: String(r.company_id),
    first_name: (r.first_name as string | null) ?? null,
    last_name: (r.last_name as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    role: (r.role as string | null) ?? null,
    phone: flags.phone ? ((r.phone as string | null | undefined) ?? null) : null,
    last_interaction_at: flags.lastInteraction
      ? ((r.last_interaction_at as string | null | undefined) ?? null)
      : null,
    created_at: String(r.created_at ?? ''),
    updated_at: (r.updated_at as string | null) ?? null,
  }))
}

/** Lädt externe Kontakte mit Fallback, falls phone / last_interaction_at noch nicht migriert sind. */
export async function fetchExternalContactsForCompany(
  supabase: SupabaseClient,
  companyId: string,
  organizationId: string
): Promise<ExternalContactRow[]> {
  const attempts: Array<{ select: string; flags: FetchFlags }> = [
    { select: SELECT_FULL, flags: { phone: true, lastInteraction: true } },
    { select: SELECT_WITH_PHONE, flags: { phone: true, lastInteraction: false } },
    { select: SELECT_BASE, flags: { phone: false, lastInteraction: false } },
  ]

  let lastErrorText = ''

  for (const { select, flags } of attempts) {
    const { data, error } = await supabase
      .from('external_contacts')
      .select(select)
      .eq('company_id', companyId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })

    if (!error) {
      return mapRows((data ?? []) as unknown as Record<string, unknown>[], flags)
    }

    lastErrorText = formatSupabaseError(error)
    if (!isLikelyMissingColumnError(lastErrorText)) {
      console.error('[fetchExternalContactsForCompany]', lastErrorText)
      return []
    }
  }

  if (lastErrorText) {
    console.error('[fetchExternalContactsForCompany] all fallbacks failed:', lastErrorText)
  }
  return []
}
