'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { createHash } from 'crypto'
import type { Json } from '@/lib/database.types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { nullToUndefined } from '@/lib/supabase/db-types'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { resetReferencesAfterCustomerAccessRevoke } from '@/lib/references/reset-after-customer-access-revoke'
import { ROUTES } from '@/lib/routes'
import { publicPortfolioUnlockCookieName } from '@/lib/public-portfolio-cookie'
import { log } from '@/lib/observability/logger'
import { writeAuditLog } from '@/lib/audit/log-audit'

/** Referenz-Objekt wie von get_public_portfolio RPC zurückgegeben (kompatibel mit ReferenceRow) */
export type PublicReference = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  status: string
  company_name: string
  company_logo_url: string | null
  website: string | null
  employee_count: number | null
  volume_eur: string | null
  contract_type: string | null
  incumbent_provider: string | null
  competitors: string | null
  customer_challenge: string | null
  our_solution: string | null
  tags: string | null
  project_status: string | null
  project_start: string | null
  project_end: string | null
  duration_months: number | null
  approval_quote_approved: string | null
  approval_reference_giver_name: string | null
  /** Nur bei gültigem Sperr-Link (?manage=…) — für „Meine Freigabe bearbeiten“. */
  approval_token?: string | null
}

export type PublicPortfolioResult =
  | {
      found: true
      slug: string
      view_count: number
      canDeactivate: boolean
      references: PublicReference[]
    }
  | {
      found: false
      reason?: 'not_found' | 'expired' | 'locked'
      slug?: string
      gateMode?: 'password' | 'email' | 'none'
    }

export type ResolvedPortfolioRecipient =
  | {
      found: true
      recipientId: string
      label: string
      companyId: string | null
      companyName: string | null
      companyLogoUrl: string | null
    }
  | { found: false }

export type PublicPortfolioBranding =
  | {
      found: true
      name: string
      logo_url: string | null
      primary_color: string
      secondary_color: string
    }
  | { found: false }

export type PublicShareOwner =
  | {
      found: true
      name: string
      position: string
      avatar_url: string | null
      email: string | null
      phone: string | null
      booking_url: string | null
    }
  | { found: false }

/** RPC-Returns sind `Json` — Record-Guard statt Row-Cast. */
function rpcRecord(data: Json | null | undefined): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  return data as Record<string, unknown>
}

function rpcString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key]
  return typeof v === 'string' ? v : undefined
}

function rpcBool(obj: Record<string, unknown>, key: string): boolean | undefined {
  const v = obj[key]
  return typeof v === 'boolean' ? v : undefined
}

function rpcNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function rpcNullableString(
  obj: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const v = obj[key]
  if (v === null) return null
  return typeof v === 'string' ? v : undefined
}

function parsePublicReferences(raw: unknown): PublicReference[] {
  if (!Array.isArray(raw)) return []
  const out: PublicReference[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const r = item as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id : ''
    if (!id) continue
    out.push({
      id,
      title: typeof r.title === 'string' ? r.title : '',
      summary: typeof r.summary === 'string' ? r.summary : null,
      industry: typeof r.industry === 'string' ? r.industry : null,
      country: typeof r.country === 'string' ? r.country : null,
      status: typeof r.status === 'string' ? r.status : '',
      company_name: typeof r.company_name === 'string' ? r.company_name : '',
      company_logo_url: typeof r.company_logo_url === 'string' ? r.company_logo_url : null,
      website: typeof r.website === 'string' ? r.website : null,
      employee_count:
        typeof r.employee_count === 'number' && Number.isFinite(r.employee_count)
          ? r.employee_count
          : null,
      volume_eur: typeof r.volume_eur === 'string' ? r.volume_eur : null,
      contract_type: typeof r.contract_type === 'string' ? r.contract_type : null,
      incumbent_provider:
        typeof r.incumbent_provider === 'string' ? r.incumbent_provider : null,
      competitors: typeof r.competitors === 'string' ? r.competitors : null,
      customer_challenge:
        typeof r.customer_challenge === 'string' ? r.customer_challenge : null,
      our_solution: typeof r.our_solution === 'string' ? r.our_solution : null,
      tags: typeof r.tags === 'string' ? r.tags : null,
      project_status: typeof r.project_status === 'string' ? r.project_status : null,
      project_start: typeof r.project_start === 'string' ? r.project_start : null,
      project_end: typeof r.project_end === 'string' ? r.project_end : null,
      duration_months:
        typeof r.duration_months === 'number' && Number.isFinite(r.duration_months)
          ? r.duration_months
          : null,
      approval_quote_approved:
        typeof r.approval_quote_approved === 'string' ? r.approval_quote_approved : null,
      approval_reference_giver_name:
        typeof r.approval_reference_giver_name === 'string'
          ? r.approval_reference_giver_name
          : null,
      approval_token:
        typeof r.approval_token === 'string'
          ? r.approval_token
          : r.approval_token === null
            ? null
            : undefined,
    })
  }
  return out
}

async function getUnlockTokenForSlug(slug: string): Promise<string | null> {
  const jar = await cookies()
  const v = jar.get(publicPortfolioUnlockCookieName(slug))?.value
  return v && v.length > 0 ? v : null
}

/** Öffentliches Portfolio per Slug laden (RPC; berücksichtigt Passwort-Session-Cookie). */
export async function getPublicPortfolio(
  slug: string,
  manageToken?: string | null,
): Promise<PublicPortfolioResult> {
  const supabase = await createServerSupabaseClient()
  const token = await getUnlockTokenForSlug(slug)
  const { data, error } = await supabase.rpc('get_public_portfolio', {
    p_slug: slug,
    p_unlock_token: nullToUndefined(token),
    p_manage_token: nullToUndefined(
      manageToken && manageToken.length > 0 ? manageToken : undefined,
    ),
  })
  if (error) return { found: false, reason: 'not_found' }
  const payload = rpcRecord(data)
  if (!payload) return { found: false, reason: 'not_found' }

  const access = rpcString(payload, 'access')
  if (access === 'denied') {
    const r = rpcString(payload, 'reason') === 'expired' ? 'expired' : 'not_found'
    return { found: false, reason: r }
  }
  if (access === 'locked') {
    const gm = rpcString(payload, 'gate_mode')
    const gateMode =
      gm === 'email' ? 'email' : gm === 'password' ? 'password' : ('password' as const)
    return { found: false, reason: 'locked', slug: rpcString(payload, 'slug'), gateMode }
  }
  const portfolioSlug = rpcString(payload, 'slug')
  if (access !== 'ok' || !portfolioSlug) {
    return { found: false, reason: 'not_found' }
  }
  return {
    found: true,
    slug: portfolioSlug,
    view_count: rpcNumber(payload, 'view_count') ?? 0,
    canDeactivate: Boolean(rpcBool(payload, 'can_deactivate')),
    references: parsePublicReferences(payload.references),
  }
}

/** Aufrufzähler / Telemetrie nur bei freigeschalteter Ansicht */
export async function incrementPortfolioViews(slug: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const token = await getUnlockTokenForSlug(slug)
  try {
    await supabase.rpc('increment_portfolio_views', {
      p_slug: slug,
      p_unlock_token: nullToUndefined(token),
    })
  } catch (e) {
    // Views-Zähler/Telemetrie soll die öffentliche Seite niemals komplett blockieren.
    log.error('incrementPortfolioViews.countFailed', { slug }, e)
  }
  try {
    await supabase.rpc('log_share_link_viewed', {
      p_slug: slug,
      p_unlock_token: nullToUndefined(token),
    })
  } catch (e) {
    log.error('incrementPortfolioViews.telemetryFailed', { slug }, e)
  }
}

export async function getPublicPortfolioBranding(
  slug: string,
): Promise<PublicPortfolioBranding> {
  const supabase = await createServerSupabaseClient()
  const token = await getUnlockTokenForSlug(slug)
  const { data, error } = await supabase.rpc('get_public_portfolio_branding', {
    p_slug: slug,
    p_unlock_token: nullToUndefined(token),
  })
  if (error) return { found: false }
  const payload = rpcRecord(data)
  if (!payload || !rpcBool(payload, 'found')) return { found: false }
  const name = rpcString(payload, 'name')
  if (!name) return { found: false }
  return {
    found: true,
    name,
    logo_url: rpcNullableString(payload, 'logo_url') ?? null,
    primary_color: rpcString(payload, 'primary_color') ?? '#2563EB',
    secondary_color: rpcString(payload, 'secondary_color') ?? '#1D4ED8',
  }
}

export async function getPublicPortfolioShareOwner(
  slug: string,
): Promise<PublicShareOwner> {
  const supabase = await createServerSupabaseClient()
  const token = await getUnlockTokenForSlug(slug)
  const { data, error } = await supabase.rpc('get_public_portfolio_share_owner', {
    p_slug: slug,
    p_unlock_token: nullToUndefined(token),
  })
  if (error) return { found: false }
  const payload = rpcRecord(data)
  if (!payload || !rpcBool(payload, 'found')) return { found: false }
  const name = rpcString(payload, 'name')
  if (!name) return { found: false }
  const booking = rpcNullableString(payload, 'booking_url')
  return {
    found: true,
    name,
    position: rpcString(payload, 'position') ?? 'Sales Ansprechpartner',
    avatar_url: rpcNullableString(payload, 'avatar_url') ?? null,
    email: rpcNullableString(payload, 'email') ?? null,
    phone: rpcNullableString(payload, 'phone') ?? null,
    booking_url: booking?.trim() ? booking.trim() : null,
  }
}

export type UnlockPortfolioResult =
  | { success: true }
  | {
      success: false
      error:
        | 'not_found'
        | 'expired'
        | 'invalid_password'
        | 'no_password_required'
        | 'rate_limited'
        | 'unknown'
    }

function extractClientIpFromHeaders(headerMap: Pick<Headers, 'get'>): string | null {
  const forwarded = headerMap.get('x-forwarded-for') ?? headerMap.get('x-real-ip') ?? null
  if (!forwarded) return null
  const ip = forwarded.split(',')[0]?.trim() ?? ''
  return ip || null
}

async function getUnlockAuditContext(
  slug: string,
): Promise<{ orgId: string | null; referenceId: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('shared_portfolios')
    .select('reference_ids')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle()
  const referenceId = Array.isArray(data?.reference_ids)
    ? (data.reference_ids[0] ?? null)
    : null
  if (!referenceId) return { orgId: null, referenceId: null }
  const { data: ref } = await supabase
    .from('references')
    .select('organization_id')
    .eq('id', referenceId)
    .single()
  return { orgId: ref?.organization_id ?? null, referenceId }
}

/** Kundenansicht: Passwort prüfen und Session-Cookie setzen (ohne Login). */
export async function unlockPublicPortfolio(
  slug: string,
  password: string,
): Promise<UnlockPortfolioResult> {
  const supabase = await createServerSupabaseClient()
  const reqHeaders = await headers()
  const clientIp = extractClientIpFromHeaders(reqHeaders)
  const ipHash = clientIp ? createHash('sha256').update(clientIp).digest('hex') : null
  const rateWindowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const unlockCtx = await getUnlockAuditContext(slug)

  if (ipHash) {
    const { count } = await supabase
      .from('portfolio_unlock_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
      .eq('ip_hash', String(ipHash))
      .eq('was_success', false)
      .gte('attempted_at', rateWindowStart)
    if ((count ?? 0) >= 5) {
      await supabase.from('portfolio_unlock_attempts').insert({
        slug,
        ip_hash: String(ipHash),
        was_success: false,
      })
      void writeAuditLog({
        orgId: unlockCtx.orgId,
        userId: null,
        action: 'unlock_rate_limited',
        entityId: slug,
        actionDetails: {
          slug,
          reference_id: unlockCtx.referenceId,
          ip_hash: String(ipHash),
        },
      })
      return { success: false, error: 'rate_limited' }
    }
  }

  const { data, error } = await supabase.rpc('try_unlock_shared_portfolio', {
    p_slug: slug,
    p_password: password,
  })
  if (error) return { success: false, error: 'unknown' }
  const payload = rpcRecord(data)
  const token = payload ? rpcString(payload, 'token') : undefined
  if (!payload || !rpcBool(payload, 'success') || !token) {
    if (ipHash) {
      await supabase.from('portfolio_unlock_attempts').insert({
        slug,
        ip_hash: String(ipHash),
        was_success: false,
      })
    }
    void writeAuditLog({
      orgId: unlockCtx.orgId,
      userId: null,
      action: 'unlock_failed',
      entityId: slug,
      actionDetails: {
        slug,
        reference_id: unlockCtx.referenceId,
        ip_hash: ipHash ?? null,
      },
    })
    const e = payload ? rpcString(payload, 'error') : undefined
    if (e === 'expired') return { success: false, error: 'expired' }
    if (e === 'invalid_password') return { success: false, error: 'invalid_password' }
    if (e === 'no_password_required')
      return { success: false, error: 'no_password_required' }
    if (e === 'not_found') return { success: false, error: 'not_found' }
    return { success: false, error: 'unknown' }
  }

  const maxAgeRaw = rpcNumber(payload, 'max_age_seconds')
  const maxAgeSec =
    typeof maxAgeRaw === 'number'
      ? Math.max(60, Math.min(2592000, Math.trunc(maxAgeRaw)))
      : 86400

  const jar = await cookies()
  const name = publicPortfolioUnlockCookieName(slug)

  jar.set(name, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSec,
  })

  if (ipHash) {
    await supabase.from('portfolio_unlock_attempts').insert({
      slug,
      ip_hash: String(ipHash),
      was_success: true,
    })
  }
  void writeAuditLog({
    orgId: unlockCtx.orgId,
    userId: null,
    action: 'unlock_success',
    entityId: slug,
    actionDetails: { slug, reference_id: unlockCtx.referenceId, ip_hash: ipHash ?? null },
  })

  return { success: true }
}

export async function getPublicPortfolioManageInsights(
  slug: string,
  manageToken: string | null | undefined,
  referenceId?: string | null,
): Promise<
  | {
      found: true
      viewCount: number
      linkExpiresAt: string | null
      approvalRespondedAt: string | null
      isAnonymous: boolean | null
      lastView: {
        countryCode: string | null
        activeSeconds: number
        startedAt: string
      } | null
    }
  | { found: false }
> {
  if (!manageToken?.trim()) return { found: false }
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('get_portfolio_manage_insights', {
    p_slug: slug,
    p_manage_token: manageToken.trim(),
    p_reference_id: referenceId?.trim() || undefined,
  })
  if (error) return { found: false }
  const payload = rpcRecord(data)
  if (!payload || !rpcBool(payload, 'found')) return { found: false }
  const lvRaw = payload.last_view
  const lv =
    lvRaw && typeof lvRaw === 'object' && !Array.isArray(lvRaw)
      ? (lvRaw as Record<string, unknown>)
      : null
  const startedAt = lv ? rpcString(lv, 'started_at') : undefined
  return {
    found: true,
    viewCount: Number(payload.view_count) || 0,
    linkExpiresAt: rpcNullableString(payload, 'link_expires_at') ?? null,
    approvalRespondedAt: rpcNullableString(payload, 'approval_responded_at') ?? null,
    isAnonymous: rpcBool(payload, 'is_anonymous') ?? null,
    lastView: startedAt
      ? {
          countryCode: rpcNullableString(lv!, 'country_code') ?? null,
          activeSeconds: Number(lv!.active_seconds) || 0,
          startedAt,
        }
      : null,
  }
}

export async function resolvePublicPortfolioRecipient(
  slug: string,
  token: string | null | undefined,
): Promise<ResolvedPortfolioRecipient> {
  if (!token?.trim()) return { found: false }
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('resolve_shared_portfolio_recipient', {
    p_slug: slug,
    p_token: token.trim(),
  })
  if (error) return { found: false }
  const payload = rpcRecord(data)
  const recipientId = payload ? rpcString(payload, 'recipient_id') : undefined
  if (!payload || !rpcBool(payload, 'found') || !recipientId) return { found: false }
  return {
    found: true,
    recipientId,
    label: rpcString(payload, 'label') ?? '',
    companyId: rpcNullableString(payload, 'company_id') ?? null,
    companyName: rpcNullableString(payload, 'company_name') ?? null,
    companyLogoUrl: rpcNullableString(payload, 'company_logo_url') ?? null,
  }
}

/** E-Mail-Gate: Name + E-Mail, Session-Cookie wie Passwort-Unlock. */
export async function unlockPublicPortfolioEmail(
  slug: string,
  name: string,
  email: string,
): Promise<UnlockPortfolioResult> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('try_unlock_shared_portfolio_email', {
    p_slug: slug,
    p_name: name,
    p_email: email,
  })
  if (error) return { success: false, error: 'unknown' }
  const payload = rpcRecord(data)
  const unlockToken = payload ? rpcString(payload, 'token') : undefined
  if (!payload || !rpcBool(payload, 'success') || !unlockToken) {
    const e = payload ? rpcString(payload, 'error') : undefined
    if (e === 'expired') return { success: false, error: 'expired' }
    if (e === 'not_found') return { success: false, error: 'not_found' }
    return { success: false, error: 'unknown' }
  }

  const maxAgeRaw = rpcNumber(payload, 'max_age_seconds')
  const maxAgeSec =
    typeof maxAgeRaw === 'number'
      ? Math.max(60, Math.min(2592000, Math.trunc(maxAgeRaw)))
      : 604800

  const jar = await cookies()
  jar.set(publicPortfolioUnlockCookieName(slug), unlockToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSec,
  })

  jar.set(
    `portfolio_email_gate_${slug}`,
    JSON.stringify({
      name: rpcNullableString(payload, 'visitor_name'),
      email: rpcNullableString(payload, 'visitor_email'),
    }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: maxAgeSec,
    },
  )

  return { success: true }
}

/** Kunden-Killswitch: nur mit gültigem ?manage=-Token (oder authentifiziert als Org). */
export async function deactivatePortfolio(
  slug: string,
  manageToken?: string | null,
): Promise<{ success: boolean }> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('deactivate_portfolio', {
    p_slug: slug,
    p_manage_token: nullToUndefined(
      manageToken && manageToken.length > 0 ? manageToken : undefined,
    ),
  })
  if (error) return { success: false }
  return { success: data === true }
}

const REVOKE_REASON_LABELS: Record<string, string> = {
  outdated_content: 'Projektinhalte sind nicht mehr aktuell',
  compliance_change: 'Interne Compliance-Richtlinien haben sich geändert',
  contact_left: 'Ansprechpartner hat das Unternehmen verlassen',
  other: 'Sonstiges (Bitte angeben)',
}

/** Showcase-Sperrlink: Zugriff sperren inkl. dokumentiertem Grund. */
export async function revokePortfolioAccess(params: {
  slug: string
  manageToken?: string | null
  reason: string
  details?: string
}): Promise<{ success: boolean }> {
  const reasonLabel = REVOKE_REASON_LABELS[params.reason] ?? params.reason

  const deactivated = await deactivatePortfolio(params.slug, params.manageToken)
  if (!deactivated.success) return { success: false }

  // Service-Role weil: Referenz-Reset nach Kunden-Sperrlink (kein Org-User-Session).
  // Grenze: slug aus vorher validiertem manage-Token (deactivatePortfolio); Writes nur reference_ids des Slugs.
  const admin = createServiceRoleSupabaseClient()
  if (admin) {
    const { referenceIds } = await resetReferencesAfterCustomerAccessRevoke(admin, {
      slug: params.slug,
      reasonLabel,
      details: params.details,
    })
    for (const referenceId of referenceIds) {
      revalidatePath(ROUTES.references.detail(referenceId))
    }
  }

  return { success: true }
}
