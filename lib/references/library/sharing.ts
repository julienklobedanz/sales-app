'use server'

import { createHash, randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { nullToUndefined } from '@/lib/supabase/db-types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generatePortfolioSlug } from '@/lib/slug'
import { logEvent } from '@/lib/events/log-event'
import { parseOrgPublicLinkPolicy } from '@/lib/organization-link-policy'
import { writeAuditLog } from '@/lib/audit/log-audit'
import { getAppOrigin } from '@/lib/env/app-origin'
import { sendCustomerSperrlinkEmail } from '@/lib/references/customer-sperrlink-email'
import { log } from '@/lib/observability/logger'
import {
  buildCustomerManageUrl,
  getPublicPreviewUrlForReference,
} from '@/lib/references/customer-manage-url'
import { hasActiveCustomerApprovalWorkflow } from '@/lib/references/effective-customer-approval'

import type { ReferenceRow } from '@/app/dashboard/actions'

function generateCustomerManageToken(): string {
  return randomBytes(32).toString('hex')
}

function hashCustomerManageToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex')
}

function generateSharePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(14)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i]! % alphabet.length]
  }
  return out
}

async function fetchOrgWorkflowJson(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationId: string
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
const VALID_STATUSES: ReferenceRow['status'][] = ['draft', 'internal_only', 'approved', 'anonymized']
function normalizeStatus(raw: unknown): ReferenceRow['status'] {
  const s = String(raw ?? '').toLowerCase().trim()
  return STATUS_MAP[s] ?? (VALID_STATUSES.includes(s as ReferenceRow['status']) ? (s as ReferenceRow['status']) : 'draft')
}

async function deactivateActiveSharesForReferences(referenceIds: string[]) {
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

export type CreateSharedPortfolioRecipient = {
  label: string
  visitorEmail?: string | null
  externalContactId?: string | null
  companyId?: string | null
}

function generatePortfolioRecipientToken(): string {
  return randomBytes(18).toString('base64url').replace(/[^a-zA-Z0-9_-]/g, 'x')
}

export async function createSharedPortfolioImpl(
  referenceIds: string[],
  recipient?: CreateSharedPortfolioRecipient | null
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
  if (!referenceIds?.length) return { success: false, error: 'Mindestens eine Referenz nötig.' }

  await deactivateActiveSharesForReferences(referenceIds)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id as string | undefined

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
        const linkFallback =
          typeof wf === 'object' && wf !== null && 'link_expiry_days' in wf
            ? Number((wf as { link_expiry_days?: unknown }).link_expiry_days)
            : 14
        const policy = parseOrgPublicLinkPolicy(wf, Number.isFinite(linkFallback) ? linkFallback : 14)
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
        const spId = spRow?.id as string | undefined
        if (spId) {
          const token = generatePortfolioRecipientToken()
          const { error: recErr } = await supabase.from('shared_portfolio_recipients').insert({
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
            log.error('createSharedPortfolio.recipientInsertFailed', { slug, sharedPortfolioId: spId }, recErr)
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
    const code = (error as { code?: string }).code
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

async function notifyCustomerOfSperrlink(
  supabase: SupabaseClient,
  referenceId: string,
  manageUrl: string,
  isNewLink: boolean
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
    `
    )
    .eq('id', referenceId)
    .maybeSingle()

  if (!ref) return false
  const row = ref as {
    title?: string
    status?: string
    organization_id?: string | null
    customer_approval_status?: string | null
    approval_contact_id?: string | null
    approval_external_contact_id?: string | null
    approval_delegated_to_email?: string | null
    approval_delegated_to_name?: string | null
    companies?: { name?: string } | { name?: string }[] | null
  }

  if (!hasActiveCustomerApprovalWorkflow(row.customer_approval_status, row.status)) {
    return false
  }

  const company =
    Array.isArray(row.companies) && row.companies.length > 0
      ? row.companies[0]
      : (row.companies as { name?: string } | null)
  const companyName = company?.name?.trim() || 'Referenz'

  return sendCustomerSperrlinkEmail({
    admin: supabase,
    organizationId: row.organization_id,
    refTitle: String(row.title ?? 'Referenz'),
    companyName,
    manageUrl,
    isNewLink,
    recipient: {
      approval_contact_id: row.approval_contact_id ?? null,
      approval_external_contact_id: row.approval_external_contact_id ?? null,
      approval_delegated_to_email: row.approval_delegated_to_email ?? null,
      approval_delegated_to_name: row.approval_delegated_to_name ?? null,
    },
  })
}

/**
 * Für Freigabe-E-Mails: öffentliche Kunden-URL + frischer ?manage=-Sperrlink.
 * Bestehendes Portfolio: rotiert nur das Manage-Geheimnis (Slug bleibt).
 * Keins: legt Kundenlink wie „Teilen“ an (inkl. Org-Workflow-Sicherheit).
 */
export async function getPortfolioManageAndPreviewUrlsForApprovalEmail(
  supabase: SupabaseClient,
  referenceId: string
): Promise<{ manageUrl: string; publicPreviewUrl: string } | null> {
  const id = String(referenceId ?? '').trim()
  if (!id) return null

  const { data: rows } = await supabase
    .from('shared_portfolios')
    .select('slug')
    .eq('is_active', true)
    .contains('reference_ids', [id])
    .limit(1)

  const slug = (rows?.[0] as { slug?: string } | undefined)?.slug
  const origin = getAppOrigin()

  if (slug) {
    const { data: rpc, error } = await supabase.rpc('reset_shared_portfolio_manage_token', {
      p_reference_id: id,
    })
    if (error) {
      log.error('getPortfolioManageAndPreviewUrls.resetTokenFailed', { referenceId: id }, error)
      return null
    }
    const payload = rpc as { success?: boolean; token?: string; error?: string } | null
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

export async function getExistingShareForReferenceImpl(
  referenceId: string
): Promise<{
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
    const code = (error as { code?: string }).code
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
      row.customer_manage_token_hash && String(row.customer_manage_token_hash).length > 0
    ),
    gateMode,
  }
}

export async function resetSharedPortfolioManageTokenImpl(
  referenceId: string,
  options?: { notifyCustomer?: boolean }
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
  const payload = data as { success?: boolean; token?: string; error?: string } | null
  if (!payload?.success || !payload.token) {
    return { success: false, error: payload?.error ?? 'Sperr-Link konnte nicht erzeugt werden.' }
  }

  let customerEmailSent = false
  if (options?.notifyCustomer) {
    const previewUrl = await getPublicPreviewUrlForReference(supabase, referenceId)
    if (previewUrl) {
      const manageUrl = buildCustomerManageUrl(previewUrl, payload.token)
      customerEmailSent = await notifyCustomerOfSperrlink(supabase, referenceId, manageUrl, true)
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
  }
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
  const orgId = profile?.organization_id as string | undefined
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const { data: rows, error: findErr } = await supabase
    .from('shared_portfolios')
    .select('slug')
    .eq('is_active', true)
    .contains('reference_ids', [referenceId])
    .limit(1)
  if (findErr) return { success: false, error: findErr.message }
  const slug = rows?.[0]?.slug as string | undefined
  if (!slug) return { success: false, error: 'Kein aktiver Share-Link für diese Referenz.' }

  const wf = await fetchOrgWorkflowJson(supabase, orgId)
  const linkFallback =
    typeof wf === 'object' && wf !== null && 'link_expiry_days' in wf
      ? Number((wf as { link_expiry_days?: unknown }).link_expiry_days)
      : 14
  const policy = parseOrgPublicLinkPolicy(wf, Number.isFinite(linkFallback) ? linkFallback : 14)

  let expiresAtIso = input.expiresAtIso
  if (expiresAtIso && !input.clearExpires) {
    const cap = new Date()
    cap.setDate(cap.getDate() + policy.maxTtlDays)
    const want = new Date(expiresAtIso)
    if (!Number.isNaN(want.getTime()) && want > cap) {
      expiresAtIso = cap.toISOString()
    }
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc('set_shared_portfolio_security', {
    p_slug: slug,
    p_password_plain: input.passwordPlain ?? '',
    p_password_remove: input.removePassword,
    p_expires_at: input.clearExpires ? undefined : nullToUndefined(expiresAtIso),
    p_clear_expires: input.clearExpires,
    p_gate_mode: input.gateMode ?? undefined,
  })
  if (rpcErr) return { success: false, error: rpcErr.message }
  const payload = rpcData as { success?: boolean; error?: string } | null
  if (!payload?.success) {
    return { success: false, error: payload?.error ?? 'Sicherheitseinstellungen konnten nicht gespeichert werden.' }
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

export async function getPortfolioViewSessionsForReferenceImpl(
  referenceId: string,
  limit = 8
): Promise<
  Array<{
    id: string
    startedAt: string
    countryCode: string | null
    activeSeconds: number
    recipientLabel: string | null
    visitorName: string | null
  }>
> {
  const supabase = await createServerSupabaseClient()
  const { data: rows, error: findErr } = await supabase
    .from('shared_portfolios')
    .select('id, slug')
    .eq('is_active', true)
    .contains('reference_ids', [referenceId])
    .limit(1)
  if (findErr || !rows?.[0]?.id) return []

  const spId = rows[0].id as string
  const { data: sessions, error } = await supabase
    .from('portfolio_view_sessions')
    .select(
      'id, started_at, country_code, active_seconds, visitor_name, recipient_id, shared_portfolio_recipients(label)'
    )
    .eq('shared_portfolio_id', spId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error || !sessions?.length) return []

  return sessions.map((s) => {
    const rec = s.shared_portfolio_recipients as { label?: string } | null
    return {
      id: String(s.id),
      startedAt: String(s.started_at),
      countryCode: (s.country_code as string | null) ?? null,
      activeSeconds: Number(s.active_seconds) || 0,
      recipientLabel: rec?.label?.trim() || null,
      visitorName: (s.visitor_name as string | null) ?? null,
    }
  })
}

export async function getReferencesByIdsImpl(ids: string[]): Promise<ReferenceRow[]> {
  if (!ids.length) return []
  const supabase = await createServerSupabaseClient()
  const { data: rows } = await supabase
    .from('references')
    .select(
      `
      id, title, summary, industry, country, website, employee_count,
      volume_eur, contract_type, incumbent_provider, competitors,
      customer_challenge, our_solution, status, customer_approval_status, created_at, updated_at,
      company_id, contact_id, file_path, tags, project_status, project_start, project_end,
      is_nda_deal,
      companies ( name, logo_url )
    `
    )
    .in('id', ids)
    .is('deleted_at', null)
  if (!rows?.length) return []
  return rows.map((r: Record<string, unknown>) => {
    const raw = r.companies
    const company =
      Array.isArray(raw) && raw.length > 0
        ? (raw[0] as { name?: string; logo_url?: string | null })
        : (raw as { name?: string; logo_url?: string | null } | null)
    const start = r.project_start as string | null
    const end = r.project_end as string | null
    let duration_months: number | null = null
    if (start && end) {
      const s = new Date(start)
      const e = new Date(end)
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
        duration_months = Math.max(
          0,
          (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
        )
      }
    }
    return {
      id: r.id as string,
      title: r.title as string,
      summary: (r.summary as string | null) ?? null,
      industry: (r.industry as string | null) ?? null,
      country: (r.country as string | null) ?? null,
      website: (r.website as string | null) ?? null,
      employee_count: (r.employee_count as number | null) ?? null,
      volume_eur: (r.volume_eur as string | null) ?? null,
      contract_type: (r.contract_type as string | null) ?? null,
      incumbent_provider: (r.incumbent_provider as string | null) ?? null,
      competitors: (r.competitors as string | null) ?? null,
      customer_challenge: (r.customer_challenge as string | null) ?? null,
      our_solution: (r.our_solution as string | null) ?? null,
      status: normalizeStatus(r.status),
      customer_approval_status: (r.customer_approval_status as string | null) ?? null,
      created_at: r.created_at as string,
      updated_at: (r.updated_at as string | null) ?? null,
      company_id: r.company_id as string,
      company_name: company?.name ?? '—',
      company_logo_url: company?.logo_url ?? null,
      contact_id: (r.contact_id as string | null) ?? null,
      contact_email: null,
      contact_display: null,
      customer_contact: null,
      file_path: (r.file_path as string | null) ?? null,
      is_favorited: false,
      tags: (r.tags as string | null) ?? null,
      project_status: (r.project_status as 'active' | 'completed' | null) ?? null,
      project_start: (r.project_start as string | null) ?? null,
      project_end: (r.project_end as string | null) ?? null,
      duration_months,
      is_nda_deal: (r.is_nda_deal as boolean | undefined) ?? false,
    }
  })
}

