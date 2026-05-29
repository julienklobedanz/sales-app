import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildNdaExpiryNotificationText,
  ndaExpiryInboxPriority,
  shouldNotifyNdaExpiry,
} from '@/lib/accounts/nda-expiry'
import { isMissingNdaTitleColumn } from '@/lib/accounts/nda-schema'
import { ROUTES } from '@/lib/routes'

export type NdaInboxCandidate = {
  id: string
  title: string
  text: string
  href: string
  createdAt: string
  priority: number
}

export async function fetchNdaExpiryInboxCandidates(
  supabase: SupabaseClient,
  orgId: string
): Promise<NdaInboxCandidate[]> {
  let { data, error } = await supabase
    .from('nda_agreements')
    .select(
      `
      id,
      company_id,
      title,
      status,
      valid_until,
      updated_at,
      companies ( name )
    `
    )
    .eq('organization_id', orgId)
    .not('valid_until', 'is', null)
    .in('status', ['active', 'pending'])

  if (error && isMissingNdaTitleColumn(error.message)) {
    const fallback = await supabase
      .from('nda_agreements')
      .select(
        `
        id,
        company_id,
        status,
        valid_until,
        updated_at,
        companies ( name )
      `
      )
      .eq('organization_id', orgId)
      .not('valid_until', 'is', null)
      .in('status', ['active', 'pending'])
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    console.error('[fetchNdaExpiryInboxCandidates]', error.message)
    return []
  }

  const candidates: NdaInboxCandidate[] = []

  for (const row of data ?? []) {
    const validUntil = String(row.valid_until ?? '').trim()
    const notify = shouldNotifyNdaExpiry({
      status: String(row.status ?? ''),
      validUntil,
    })
    if (!notify) continue

    const co = Array.isArray(row.companies) ? row.companies[0] : row.companies
    const companyName = String(co?.name ?? 'Account').trim() || 'Account'
    const companyId = String(row.company_id ?? '')
    const docTitle = String(row.title ?? '').trim()
    const docLabel = docTitle ? `„${docTitle}"` : 'NDA'

    candidates.push({
      id: `nda_expiry:${String(row.id)}`,
      title: notify.urgency === 'expired' ? 'NDA abgelaufen' : 'NDA läuft ab',
      text: buildNdaExpiryNotificationText(companyName, validUntil, notify.daysUntil).replace(
        /^NDA mit/,
        `${docLabel} mit`
      ),
      href: ROUTES.accountsDetail(companyId),
      createdAt: `${validUntil}T12:00:00`,
      priority: ndaExpiryInboxPriority(notify.urgency),
    })
  }

  return candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}
