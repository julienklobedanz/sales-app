'use server'

import { randomBytes } from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generatePortfolioSlug } from '@/lib/slug'
import { logEvent } from '@/lib/events/log-event'
import { parseOrgPublicLinkPolicy } from '@/lib/organization-link-policy'
import { writeAuditLog } from '@/lib/audit/log-audit'
import { getAppOrigin } from '@/lib/env/app-origin'
import { log } from '@/lib/observability/logger'
import { buildCustomerManageUrl } from '@/lib/references/customer-manage-url'
import {
  deactivateActiveSharesForReferences,
  fetchOrgWorkflowJson,
  generateCustomerManageToken,
  generateSharePassword,
  hashCustomerManageToken,
  linkExpiryDaysFromWorkflow,
  parsePortfolioRpcJson,
} from '@/lib/references/library/sharing-helpers'

export type CreateSharedPortfolioRecipient = {
  label: string
  visitorEmail?: string | null
  externalContactId?: string | null
  companyId?: string | null
}

function generatePortfolioRecipientToken(): string {
  return randomBytes(18)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9_-]/g, 'x')
}

export async function createSharedPortfolioImpl(
  referenceIds: string[],
  recipient?: CreateSharedPortfolioRecipient | null,
): Promise<
  | {
      success: true
      url: string
      slug: string
      initialPassword?: string | null
      /** Klartext nur einmal – für ?manage=… (Sperrrecht). */
      manageToken?: string
    }
  | { success: false; error: string }
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  if (!referenceIds?.length)
    return { success: false, error: 'Mindestens eine Referenz nötig.' }

  await deactivateActiveSharesForReferences(referenceIds)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id ?? undefined

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generatePortfolioSlug()
    const manageToken = generateCustomerManageToken()
    const manageHash = hashCustomerManageToken(manageToken)
    const { error } = await supabase.from('shared_portfolios').insert({
      slug,
      reference_ids: referenceIds,
      is_active: true,
      view_count: 0,
      customer_manage_token_hash: manageHash,
    })
    if (!error) {
      const url = `/p/${slug}`
      let initialPassword: string | null = null
      if (orgId) {
        const wf = await fetchOrgWorkflowJson(supabase, orgId)
        const linkFallback = linkExpiryDaysFromWorkflow(wf, 14)
        const policy = parseOrgPublicLinkPolicy(
          wf,
          Number.isFinite(linkFallback) ? linkFallback : 14,
        )
        const days = Math.min(Math.max(1, policy.defaultTtlDays), policy.maxTtlDays)
        const exp = new Date()
        exp.setDate(exp.getDate() + days)
        initialPassword = policy.requirePasswordForNew ? generateSharePassword() : null
        const { error: secErr } = await supabase.rpc('set_shared_portfolio_security', {
          p_slug: slug,
          p_password_plain: initialPassword ?? '',
          p_password_remove: false,
          p_expires_at: exp.toISOString(),
          p_clear_expires: false,
        })
        if (secErr) {
          log.error('createSharedPortfolio.setSecurityFailed', { slug }, secErr)
        }
        void logEvent({
          organizationId: orgId,
          eventType: 'reference_shared',
          payload: { slug, reference_ids: referenceIds },
          referenceId: referenceIds[0] ?? null,
          createdBy: user.id,
        })
        void writeAuditLog({
          orgId,
          userId: user.id,
          action: 'link_created',
          entityId: slug,
          actionDetails: {
            slug,
            reference_ids: referenceIds,
            has_password: Boolean(initialPassword),
            expires_at: exp.toISOString(),
          },
        })
      }
      let publicUrl = url
      if (recipient?.label?.trim()) {
        const { data: spRow } = await supabase
          .from('shared_portfolios')
          .select('id')
          .eq('slug', slug)
          .single()
        const spId = spRow?.id ?? undefined
        if (spId) {
          const token = generatePortfolioRecipientToken()
          const { error: recErr } = await supabase
            .from('shared_portfolio_recipients')
            .insert({
              shared_portfolio_id: spId,
              token,
              label: recipient.label.trim(),
              visitor_email: recipient.visitorEmail?.trim() || null,
              external_contact_id: recipient.externalContactId ?? null,
              company_id: recipient.companyId ?? null,
              created_by: user.id,
            })
          if (!recErr) {
            publicUrl = `${url}?r=${encodeURIComponent(token)}`
          } else {
            log.error(
              'createSharedPortfolio.recipientInsertFailed',
              { slug, sharedPortfolioId: spId },
              recErr,
            )
          }
        }
      }
      return {
        success: true,
        url: publicUrl,
        slug,
        initialPassword: initialPassword ?? undefined,
        manageToken,
      }
    }
    const code = error.code
    if (code === '23505') continue // unique violation, retry
    if (code === '42P01' || /shared_portfolios/i.test(error.message)) {
      log.error('createSharedPortfolio.tableMissing', { referenceIds }, error)
      return {
        success: false,
        error:
          'Kundenlink konnte nicht erstellt werden, da die Tabelle "shared_portfolios" in der Datenbank fehlt oder das Schema noch nicht aktualisiert wurde. Bitte Migration in Supabase ausführen.',
      }
    }
    log.error('createSharedPortfolio.insertFailed', { referenceIds }, error)
    return { success: false, error: error.message }
  }
  return { success: false, error: 'Slug-Kollision. Bitte erneut versuchen.' }
}

/**
 * Für Freigabe-E-Mails: öffentliche Kunden-URL + frischer ?manage=-Sperrlink.
 * Bestehendes Portfolio: rotiert nur das Manage-Geheimnis (Slug bleibt).
 * Keins: legt Kundenlink wie „Teilen“ an (inkl. Org-Workflow-Sicherheit).
 */
export async function getPortfolioManageAndPreviewUrlsForApprovalEmail(
  supabase: SupabaseClient,
  referenceId: string,
): Promise<{ manageUrl: string; publicPreviewUrl: string } | null> {
  const id = String(referenceId ?? '').trim()
  if (!id) return null

  const { data: rows } = await supabase
    .from('shared_portfolios')
    .select('slug')
    .eq('is_active', true)
    .contains('reference_ids', [id])
    .limit(1)

  const slug = rows?.[0]?.slug
  const origin = getAppOrigin()

  if (slug) {
    const { data: rpc, error } = await supabase.rpc(
      'reset_shared_portfolio_manage_token',
      {
        p_reference_id: id,
      },
    )
    if (error) {
      log.error(
        'getPortfolioManageAndPreviewUrls.resetTokenFailed',
        { referenceId: id },
        error,
      )
      return null
    }
    const payload = parsePortfolioRpcJson(rpc)
    if (!payload?.success || !payload.token) {
      log.error('getPortfolioManageAndPreviewUrls.rpcFailed', {
        referenceId: id,
        rpcError: payload?.error ?? 'no token',
      })
      return null
    }
    const publicPreviewUrl = `${origin}/p/${encodeURIComponent(slug)}`
    const manageUrl = buildCustomerManageUrl(publicPreviewUrl, payload.token)
    return { manageUrl, publicPreviewUrl }
  }

  const created = await createSharedPortfolioImpl([id])
  if (!created.success || !created.manageToken) return null
  const path = created.url.startsWith('/') ? created.url : `/${created.url}`
  const publicPreviewUrl = `${origin}${path}`
  const manageUrl = buildCustomerManageUrl(publicPreviewUrl, created.manageToken)
  return { manageUrl, publicPreviewUrl }
}
