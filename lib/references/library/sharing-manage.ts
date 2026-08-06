'use server'

import { nullToUndefined } from '@/lib/supabase/db-types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseOrgPublicLinkPolicy } from '@/lib/organization-link-policy'
import { writeAuditLog } from '@/lib/audit/log-audit'
import { log } from '@/lib/observability/logger'
import { buildCustomerManageUrl, getPublicPreviewUrlForReference } from '@/lib/references/customer-manage-url'
import {
  fetchOrgWorkflowJson,
  linkExpiryDaysFromWorkflow,
  notifyCustomerOfControlLink,
  parsePortfolioRpcJson,
} from '@/lib/references/library/sharing-helpers'

export async function getExistingShareForReferenceImpl(referenceId: string): Promise<{
  slug: string
  url: string
  expiresAt: string | null
  hasPassword: boolean
  hasCustomerManageToken: boolean
  gateMode: 'none' | 'password' | 'email'
} | null> {
  const supabase = await createServerSupabaseClient()
  const { data: rows, error } = await supabase
    .from('shared_portfolios')
    .select('slug, expires_at, password_hash, customer_manage_token_hash, gate_mode')
    .eq('is_active', true)
    .contains('reference_ids', [referenceId])
    .limit(1)
  if (error) {
    const code = error.code
    if (code === '42P01' || /shared_portfolios/i.test(error.message)) {
      log.error('getExistingShareForReference.tableMissing', { referenceId }, error)
      // Kein harter Fehler im UI – einfach so tun, als gäbe es keinen bestehenden Link
      return null
    }
    log.error('getExistingShareForReference.loadFailed', { referenceId }, error)
    return null
  }
  const row = rows?.[0] as
    | {
        slug?: string
        expires_at?: string | null
        password_hash?: string | null
        customer_manage_token_hash?: string | null
        gate_mode?: string | null
      }
    | undefined
  if (!row?.slug) return null
  const gateRaw = String(row.gate_mode ?? 'none')
  const gateMode =
    gateRaw === 'email' ? 'email' : row.password_hash ? 'password' : ('none' as const)
  return {
    slug: row.slug,
    url: `/p/${row.slug}`,
    expiresAt: row.expires_at ?? null,
    hasPassword: Boolean(row.password_hash),
    hasCustomerManageToken: Boolean(
      row.customer_manage_token_hash && String(row.customer_manage_token_hash).length > 0,
    ),
    gateMode,
  }
}

export async function resetSharedPortfolioManageTokenImpl(
  referenceId: string,
  options?: { notifyCustomer?: boolean },
): Promise<
  | { success: true; manageToken: string; customerEmailSent?: boolean }
  | { success: false; error: string }
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data, error } = await supabase.rpc('reset_shared_portfolio_manage_token', {
    p_reference_id: referenceId,
  })
  if (error) return { success: false, error: error.message }
  const payload = parsePortfolioRpcJson(data)
  if (!payload?.success || !payload.token) {
    return {
      success: false,
      error: payload?.error ?? 'Sperr-Link konnte nicht erzeugt werden.',
    }
  }

  let customerEmailSent = false
  if (options?.notifyCustomer) {
    const previewUrl = await getPublicPreviewUrlForReference(supabase, referenceId)
    if (previewUrl) {
      const manageUrl = buildCustomerManageUrl(previewUrl, payload.token)
      customerEmailSent = await notifyCustomerOfControlLink(
        supabase,
        referenceId,
        manageUrl,
        true,
      )
    }
  }

  return { success: true, manageToken: payload.token, customerEmailSent }
}

export async function updateShareLinkSecurityByReferenceImpl(
  referenceId: string,
  input: {
    passwordPlain: string | null
    removePassword: boolean
    expiresAtIso: string | null
    clearExpires: boolean
    gateMode?: 'none' | 'password' | 'email' | null
  },
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id ?? undefined
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const { data: rows, error: findErr } = await supabase
    .from('shared_portfolios')
    .select('slug')
    .eq('is_active', true)
    .contains('reference_ids', [referenceId])
    .limit(1)
  if (findErr) return { success: false, error: findErr.message }
  const slug = rows?.[0]?.slug ?? undefined
  if (!slug)
    return { success: false, error: 'Kein aktiver Share-Link für diese Referenz.' }

  const wf = await fetchOrgWorkflowJson(supabase, orgId)
  const linkFallback = linkExpiryDaysFromWorkflow(wf, 14)
  const policy = parseOrgPublicLinkPolicy(
    wf,
    Number.isFinite(linkFallback) ? linkFallback : 14,
  )

  let expiresAtIso = input.expiresAtIso
  if (expiresAtIso && !input.clearExpires) {
    const cap = new Date()
    cap.setDate(cap.getDate() + policy.maxTtlDays)
    const want = new Date(expiresAtIso)
    if (!Number.isNaN(want.getTime()) && want > cap) {
      expiresAtIso = cap.toISOString()
    }
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc(
    'set_shared_portfolio_security',
    {
      p_slug: slug,
      p_password_plain: input.passwordPlain ?? '',
      p_password_remove: input.removePassword,
      p_expires_at: input.clearExpires ? undefined : nullToUndefined(expiresAtIso),
      p_clear_expires: input.clearExpires,
      p_gate_mode: input.gateMode ?? undefined,
    },
  )
  if (rpcErr) return { success: false, error: rpcErr.message }
  const payload = parsePortfolioRpcJson(rpcData)
  if (!payload?.success) {
    return {
      success: false,
      error:
        payload?.error ?? 'Sicherheitseinstellungen konnten nicht gespeichert werden.',
    }
  }
  void writeAuditLog({
    orgId,
    userId: user.id,
    action: 'link_security_updated',
    entityId: slug,
    actionDetails: {
      slug,
      reference_id: referenceId,
      password_changed: Boolean(input.passwordPlain) || input.removePassword,
      password_removed: input.removePassword,
      expires_at: input.clearExpires ? null : expiresAtIso,
      clear_expires: input.clearExpires,
    },
  })
  return { success: true }
}
