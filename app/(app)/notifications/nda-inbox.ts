import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildNdaExpiryNotificationText,
  ndaExpiryInboxPriority,
  shouldNotifyNdaExpiry,
} from '@/lib/accounts/nda-expiry'
import {
  isMissingNdaFileStorageColumn,
  isMissingNdaTitleColumn,
} from '@/lib/accounts/nda-schema'
import { ROUTES } from '@/lib/routes'
import { log } from '@/lib/observability/logger'

export type NdaInboxCandidate = {
  id: string
  title: string
  text: string
  href: string
  createdAt: string
  priority: number
}

type InboxRow = {
  id: string
  company_id: string
  title?: string | null
  status: string
  valid_until: string
  companies: unknown
}

const INBOX_SELECT_WITH_TITLE = `
      id,
      company_id,
      title,
      status,
      valid_until,
      file_storage_path,
      updated_at,
      companies ( name )
    `

const INBOX_SELECT_NO_TITLE = `
      id,
      company_id,
      status,
      valid_until,
      file_storage_path,
      updated_at,
      companies ( name )
    `

const INBOX_SELECT_LEGACY_WITH_TITLE = `
      id,
      company_id,
      title,
      status,
      valid_until,
      updated_at,
      companies ( name )
    `

const INBOX_SELECT_LEGACY = `
      id,
      company_id,
      status,
      valid_until,
      updated_at,
      companies ( name )
    `

async function queryNdaInboxRows(
  supabase: SupabaseClient,
  orgId: string,
  select: string,
  filterUploadedPdf: boolean,
) {
  const base = supabase
    .from('nda_agreements')
    .select(select)
    .eq('organization_id', orgId)
    .not('valid_until', 'is', null)
    .in('status', ['active', 'pending'])

  if (filterUploadedPdf) {
    return base.not('file_storage_path', 'is', null)
  }

  return base
}

function mapInboxRows(raw: unknown, forceTitleNull = false): InboxRow[] {
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const r = row as InboxRow
    return {
      ...r,
      title: forceTitleNull ? null : (r.title ?? null),
    }
  })
}

export async function fetchNdaExpiryInboxCandidates(
  supabase: SupabaseClient,
  orgId: string,
): Promise<NdaInboxCandidate[]> {
  let rows: InboxRow[] = []
  let queryError: { message: string } | null = null

  const initial = await queryNdaInboxRows(supabase, orgId, INBOX_SELECT_WITH_TITLE, true)
  if (initial.error) {
    queryError = initial.error
  } else {
    rows = mapInboxRows(initial.data)
  }

  if (queryError && isMissingNdaTitleColumn(queryError.message)) {
    const fallback = await queryNdaInboxRows(supabase, orgId, INBOX_SELECT_NO_TITLE, true)
    if (fallback.error) {
      queryError = fallback.error
    } else {
      rows = mapInboxRows(fallback.data, true)
      queryError = null
    }
  }

  if (queryError && isMissingNdaFileStorageColumn(queryError.message)) {
    const legacyWithTitle = await queryNdaInboxRows(
      supabase,
      orgId,
      INBOX_SELECT_LEGACY_WITH_TITLE,
      false,
    )
    const legacyRes =
      legacyWithTitle.error && isMissingNdaTitleColumn(legacyWithTitle.error.message)
        ? await queryNdaInboxRows(supabase, orgId, INBOX_SELECT_LEGACY, false)
        : legacyWithTitle

    if (legacyRes.error) {
      queryError = legacyRes.error
    } else {
      rows = mapInboxRows(legacyRes.data)
      queryError = null
    }
  }

  if (queryError) {
    log.error('fetchNdaExpiryInboxCandidates.failed', {}, queryError)
    return []
  }

  const candidates: NdaInboxCandidate[] = []

  for (const row of rows) {
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
      text: buildNdaExpiryNotificationText(
        companyName,
        validUntil,
        notify.daysUntil,
      ).replace(/^NDA mit/, `${docLabel} mit`),
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
