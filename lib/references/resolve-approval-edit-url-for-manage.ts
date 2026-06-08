import { createHash, randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import {
  effectiveCustomerApprovalStatus,
  hasActiveCustomerApprovalWorkflow,
} from '@/lib/references/effective-customer-approval'

function hashManageToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex')
}

async function verifyManageTokenForReference(
  admin: SupabaseClient,
  slug: string,
  manageToken: string,
  referenceId: string
): Promise<boolean> {
  const { data: row } = await admin
    .from('shared_portfolios')
    .select('customer_manage_token_hash, reference_ids, is_active')
    .eq('slug', slug)
    .maybeSingle()

  if (!row || !(row as { is_active?: boolean }).is_active) return false

  const referenceIds = (row as { reference_ids?: string[] }).reference_ids ?? []
  if (!referenceIds.includes(referenceId)) return false

  const storedHash = (row as { customer_manage_token_hash?: string | null }).customer_manage_token_hash
  if (!storedHash) return false

  return storedHash === hashManageToken(manageToken.trim())
}

/**
 * Sperr-Link-Ansicht: Freigabe-URL für Kunden-Bearbeitung.
 * Stellt fehlenden approval_token bei gültigem manage-Token automatisch wieder her.
 */
export async function resolveApprovalEditUrlForManageView(
  slug: string,
  manageToken: string,
  referenceId: string
): Promise<string | null> {
  const tokenTrim = manageToken.trim()
  const refId = referenceId.trim()
  const slugTrim = slug.trim()
  if (!tokenTrim || !refId || !slugTrim) return null

  const admin = createServiceRoleSupabaseClient()
  if (!admin) return null

  const verified = await verifyManageTokenForReference(admin, slugTrim, tokenTrim, refId)
  if (!verified) return null

  const { data: row, error } = await admin
    .from('references')
    .select('approval_token, customer_approval_status, status')
    .eq('id', refId)
    .maybeSingle()

  if (error || !row) return null

  const ref = row as {
    approval_token?: string | null
    customer_approval_status?: string | null
    status?: string | null
  }

  const existing = typeof ref.approval_token === 'string' ? ref.approval_token.trim() : ''
  if (existing) return `/approval/${existing}`

  if (!hasActiveCustomerApprovalWorkflow(ref.customer_approval_status, ref.status)) {
    return null
  }

  const effective = effectiveCustomerApprovalStatus(ref.customer_approval_status, ref.status)
  const newToken = randomUUID()
  const patch: {
    approval_token: string
    customer_approval_status?: string
  } = { approval_token: newToken }

  const customerRaw = String(ref.customer_approval_status ?? '').toLowerCase()
  if (!customerRaw && effective === 'approved') {
    patch.customer_approval_status = 'approved'
  } else if (!customerRaw && effective === 'pending') {
    patch.customer_approval_status = 'pending'
  }

  const { error: updateError } = await admin.from('references').update(patch).eq('id', refId)
  if (updateError) return null

  return `/approval/${newToken}`
}
