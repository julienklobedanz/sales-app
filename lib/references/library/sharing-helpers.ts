import { createHash, randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/lib/database.types'
import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendCustomerControlLinkEmail } from '@/lib/references/customer-control-link-email'
import { log } from '@/lib/observability/logger'
import { hasActiveCustomerApprovalWorkflow } from '@/lib/references/effective-customer-approval'

import type { ReferenceRow } from '@/app/dashboard/actions'

export type CreateSharedPortfolioRecipient = {
  label: string
  visitorEmail?: string | null
  externalContactId?: string | null
  companyId?: string | null
}

export function generateCustomerManageToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashCustomerManageToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex')
}

export function generateSharePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(14)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i]! % alphabet.length]
  }
  return out
}

/** RPC-Returns sind `Json` — schmaler Guard statt Row-Cast. */
export function parsePortfolioRpcJson(data: Json | null | undefined): {
  success?: boolean
  token?: string
  error?: string
} | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const obj = data as Record<string, unknown>
  return {
    success: typeof obj.success === 'boolean' ? obj.success : undefined,
    token: typeof obj.token === 'string' ? obj.token : undefined,
    error: typeof obj.error === 'string' ? obj.error : undefined,
  }
}

export function linkExpiryDaysFromWorkflow(wf: unknown, fallback = 14): number {
  if (typeof wf !== 'object' || wf === null || !('link_expiry_days' in wf)) {
    return fallback
  }
  const n = Number((wf as Record<string, unknown>).link_expiry_days)
  return Number.isFinite(n) ? n : fallback
}

export async function fetchOrgWorkflowJson(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationId: string,
): Promise<unknown> {
  const { data } = await supabase
    .from('organizations')
    .select('workflow_settings')
    .eq('id', organizationId)
    .single()
  return data?.workflow_settings ?? {}
}

/** Mapping alter/legacy Status-Werte auf das 4-Status-Modell (Daten-Wiederherstellung) */
const STATUS_MAP: Record<string, ReferenceRow['status']> = {
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
const VALID_STATUSES: ReferenceRow['status'][] = [
  'draft',
  'internal_only',
  'approved',
  'anonymized',
]
export function normalizeStatus(raw: unknown): ReferenceRow['status'] {
  const s = String(raw ?? '')
    .toLowerCase()
    .trim()
  return (
    STATUS_MAP[s] ??
    (VALID_STATUSES.includes(s as ReferenceRow['status'])
      ? (s as ReferenceRow['status'])
      : 'draft')
  )
}

export async function deactivateActiveSharesForReferences(referenceIds: string[]) {
  if (!referenceIds.length) return

  const supabase = await createServerSupabaseClient()
  const { data: rows, error } = await supabase
    .from('shared_portfolios')
    .select('slug, reference_ids')
    .eq('is_active', true)

  if (error || !rows?.length) return

  const referenceSet = new Set(referenceIds)
  const slugsToDeactivate = rows
    .filter((row) => {
      const ids = Array.isArray(row.reference_ids) ? (row.reference_ids as string[]) : []
      return ids.some((id) => referenceSet.has(String(id)))
    })
    .map((row) => String(row.slug))
    .filter(Boolean)

  if (!slugsToDeactivate.length) return

  for (const slug of slugsToDeactivate) {
    const { error: deactivateError } = await supabase.rpc('deactivate_portfolio', {
      p_slug: slug,
    })
    if (deactivateError) {
      log.error('createSharedPortfolio.deactivateSlugFailed', { slug }, deactivateError)
    }
  }
}

export async function notifyCustomerOfControlLink(
  supabase: SupabaseClient,
  referenceId: string,
  manageUrl: string,
  isNewLink: boolean,
): Promise<boolean> {
  const { data: ref } = await supabase
    .from('references')
    .select(
      `
      title,
      status,
      organization_id,
      customer_approval_status,
      approval_contact_id,
      approval_external_contact_id,
      approval_delegated_to_email,
      approval_delegated_to_name,
      companies ( name )
    `,
    )
    .eq('id', referenceId)
    .maybeSingle()

  if (!ref) return false

  if (!hasActiveCustomerApprovalWorkflow(ref.customer_approval_status, ref.status)) {
    return false
  }

  const companyName = accountFromJoin(ref.companies)?.name?.trim() || 'Referenz'

  return sendCustomerControlLinkEmail({
    admin: supabase,
    organizationId: ref.organization_id,
    refTitle: String(ref.title ?? 'Referenz'),
    companyName,
    manageUrl,
    isNewLink,
    recipient: {
      approval_contact_id: ref.approval_contact_id ?? null,
      approval_external_contact_id: ref.approval_external_contact_id ?? null,
      approval_delegated_to_email: ref.approval_delegated_to_email ?? null,
      approval_delegated_to_name: ref.approval_delegated_to_name ?? null,
    },
  })
}
