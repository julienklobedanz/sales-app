import { createHash, randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { effectiveCustomerApprovalStatus } from '@/lib/references/effective-customer-approval'

function hashManageToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex')
}

async function verifyManageTokenForReference(
  admin: SupabaseClient,
  slug: string,
  manageToken: string,
  referenceId: string,
): Promise<boolean> {
  const { data: row } = await admin
    .from('shared_portfolios')
    .select('customer_manage_token_hash, reference_ids, is_active')
    .eq('slug', slug)
    .maybeSingle()

  if (!row || !(row as { is_active?: boolean }).is_active) return false

  const referenceIds = (row as { reference_ids?: string[] }).reference_ids ?? []
  if (!referenceIds.includes(referenceId)) return false

  const storedHash = (row as { customer_manage_token_hash?: string | null })
    .customer_manage_token_hash
  if (!storedHash) return false

  return storedHash === hashManageToken(manageToken.trim())
}

async function resolveViaManageRpc(
  slug: string,
  manageToken: string,
  referenceId: string,
): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('resolve_manage_approval_edit', {
    p_slug: slug,
    p_manage_token: manageToken,
    p_reference_id: referenceId,
  })
  if (error) return null
  const payload = data as { found?: boolean; approval_token?: string } | null
  const token =
    typeof payload?.approval_token === 'string' ? payload.approval_token.trim() : ''
  if (!payload?.found || !token) return null
  return `/approval/${token}`
}

/**
 * Sperr-Link-Ansicht: Freigabe-URL für Kunden-Bearbeitung.
 * Stellt fehlenden approval_token bei gültigem manage-Token automatisch wieder her.
 */
export async function resolveApprovalEditUrlForManageView(
  slug: string,
  manageToken: string,
  referenceId: string,
): Promise<string | null> {
  const tokenTrim = manageToken.trim()
  const refId = referenceId.trim()
  const slugTrim = slug.trim()
  if (!tokenTrim || !refId || !slugTrim) return null

  // Prefer SECURITY DEFINER RPC (works without service-role; manage-hash gated).
  const viaRpc = await resolveViaManageRpc(slugTrim, tokenTrim, refId)
  if (viaRpc) return viaRpc

  // Fallback: Service-Role (ältere DBs ohne resolve_manage_approval_edit).
  // Grenze: verifyManageTokenForReference (Hash + reference_ids) vor jedem Read/Write.
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

  // Gültiger Manage-Token + Referenz im Portfolio → Token wiederherstellen
  const effective = effectiveCustomerApprovalStatus(
    ref.customer_approval_status,
    ref.status,
  )
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

  const { error: updateError } = await admin
    .from('references')
    .update(patch)
    .eq('id', refId)
  if (updateError) return null

  return `/approval/${newToken}`
}
