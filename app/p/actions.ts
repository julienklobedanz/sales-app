'use server'

import { cookies, headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { publicPortfolioUnlockCookieName } from '@/lib/public-portfolio-cookie'
import { writeAuditLog } from '@/lib/audit/log-audit'
import { createHash } from 'crypto'

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
  | { found: false; reason?: 'not_found' | 'expired' | 'locked'; slug?: string }

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

async function getUnlockTokenForSlug(slug: string): Promise<string | null> {
  const jar = await cookies()
  const v = jar.get(publicPortfolioUnlockCookieName(slug))?.value
  return v && v.length > 0 ? v : null
}

/** Öffentliches Portfolio per Slug laden (RPC; berücksichtigt Passwort-Session-Cookie). */
export async function getPublicPortfolio(
  slug: string,
  manageToken?: string | null
): Promise<PublicPortfolioResult> {
  const supabase = await createServerSupabaseClient()
  const token = await getUnlockTokenForSlug(slug)
  const { data, error } = await supabase.rpc('get_public_portfolio', {
    p_slug: slug,
    p_unlock_token: token,
    p_manage_token: manageToken && manageToken.length > 0 ? manageToken : null,
  })
  if (error) return { found: false, reason: 'not_found' }
  const payload = data as
    | {
        access?: string
        reason?: string
        slug?: string
        found?: boolean
        view_count?: number
        references?: PublicReference[]
      }
    | null

  if (payload?.access === 'denied') {
    const r = payload.reason === 'expired' ? 'expired' : 'not_found'
    return { found: false, reason: r }
  }
  if (payload?.access === 'locked') {
    return { found: false, reason: 'locked', slug: payload.slug }
  }
  if (payload?.access !== 'ok' || !payload.slug) {
    return { found: false, reason: 'not_found' }
  }
  return {
    found: true,
    slug: payload.slug,
    view_count: payload.view_count ?? 0,
    canDeactivate: Boolean((payload as { can_deactivate?: boolean }).can_deactivate),
    references: Array.isArray(payload.references) ? payload.references : [],
  }
}

/** Aufrufzähler / Telemetrie nur bei freigeschalteter Ansicht */
export async function incrementPortfolioViews(slug: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const token = await getUnlockTokenForSlug(slug)
  try {
    await supabase.rpc('increment_portfolio_views', { p_slug: slug, p_unlock_token: token })
  } catch (e) {
    // Views-Zähler/Telemetrie soll die öffentliche Seite niemals komplett blockieren.
    console.error('[incrementPortfolioViews] increment_portfolio_views failed:', e)
  }
  try {
    await supabase.rpc('log_share_link_viewed', { p_slug: slug, p_unlock_token: token })
  } catch (e) {
    console.error('[incrementPortfolioViews] log_share_link_viewed failed:', e)
  }
}

export async function getPublicPortfolioBranding(
  slug: string
): Promise<PublicPortfolioBranding> {
  const supabase = await createServerSupabaseClient()
  const token = await getUnlockTokenForSlug(slug)
  const { data, error } = await supabase.rpc('get_public_portfolio_branding', {
    p_slug: slug,
    p_unlock_token: token,
  })
  if (error) return { found: false }
  const payload = data as {
    found?: boolean
    name?: string
    logo_url?: string | null
    primary_color?: string
    secondary_color?: string
  } | null
  if (!payload?.found || !payload.name) return { found: false }
  return {
    found: true,
    name: payload.name,
    logo_url: payload.logo_url ?? null,
    primary_color: payload.primary_color ?? '#2563EB',
    secondary_color: payload.secondary_color ?? '#1D4ED8',
  }
}

export async function getPublicPortfolioShareOwner(
  slug: string
): Promise<PublicShareOwner> {
  const supabase = await createServerSupabaseClient()
  const token = await getUnlockTokenForSlug(slug)
  const { data, error } = await supabase.rpc('get_public_portfolio_share_owner', {
    p_slug: slug,
    p_unlock_token: token,
  })
  if (error) return { found: false }
  const payload = data as {
    found?: boolean
    name?: string
    position?: string
    avatar_url?: string | null
    email?: string | null
    phone?: string | null
    booking_url?: string | null
  } | null
  if (!payload?.found || !payload.name) return { found: false }
  return {
    found: true,
    name: payload.name,
    position: payload.position ?? 'Sales Ansprechpartner',
    avatar_url: payload.avatar_url ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    booking_url: payload.booking_url?.trim() ? payload.booking_url.trim() : null,
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

function extractClientIpFromHeaders(
  headerMap: Pick<Headers, 'get'>
): string | null {
  const forwarded = headerMap.get('x-forwarded-for') ?? headerMap.get('x-real-ip') ?? null
  if (!forwarded) return null
  const ip = forwarded.split(',')[0]?.trim() ?? ''
  return ip || null
}

async function getUnlockAuditContext(
  slug: string
): Promise<{ orgId: string | null; referenceId: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('shared_portfolios')
    .select('reference_ids')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle()
  const referenceId =
    data && Array.isArray((data as { reference_ids?: unknown }).reference_ids)
      ? (data as { reference_ids: string[] }).reference_ids[0] ?? null
      : null
  if (!referenceId) return { orgId: null, referenceId: null }
  const { data: ref } = await supabase
    .from('references')
    .select('organization_id')
    .eq('id', referenceId)
    .single()
  return { orgId: (ref?.organization_id as string | null) ?? null, referenceId }
}

/** Kundenansicht: Passwort prüfen und Session-Cookie setzen (ohne Login). */
export async function unlockPublicPortfolio(
  slug: string,
  password: string
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
        actionDetails: { slug, reference_id: unlockCtx.referenceId, ip_hash: String(ipHash) },
      })
      return { success: false, error: 'rate_limited' }
    }
  }

  const { data, error } = await supabase.rpc('try_unlock_shared_portfolio', {
    p_slug: slug,
    p_password: password,
  })
  if (error) return { success: false, error: 'unknown' }
  const payload = data as { success?: boolean; token?: string; error?: string } | null
  if (!payload?.success || !payload.token) {
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
      actionDetails: { slug, reference_id: unlockCtx.referenceId, ip_hash: ipHash ?? null },
    })
    const e = payload?.error
    if (e === 'expired') return { success: false, error: 'expired' }
    if (e === 'invalid_password') return { success: false, error: 'invalid_password' }
    if (e === 'no_password_required') return { success: false, error: 'no_password_required' }
    if (e === 'not_found') return { success: false, error: 'not_found' }
    return { success: false, error: 'unknown' }
  }

  const maxAgeRaw = (payload as { max_age_seconds?: number }).max_age_seconds
  const maxAgeSec =
    typeof maxAgeRaw === 'number' && Number.isFinite(maxAgeRaw)
      ? Math.max(60, Math.min(2592000, Math.trunc(maxAgeRaw)))
      : 86400

  const jar = await cookies()
  const name = publicPortfolioUnlockCookieName(slug)

  jar.set(name, payload.token, {
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

/** Kunden-Killswitch: nur mit gültigem ?manage=-Token (oder authentifiziert als Org). */
export async function deactivatePortfolio(
  slug: string,
  manageToken?: string | null
): Promise<{ success: boolean }> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('deactivate_portfolio', {
    p_slug: slug,
    p_manage_token: manageToken && manageToken.length > 0 ? manageToken : null,
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

/** Showcase-Sperrlink: Zugriff widerrufen inkl. dokumentiertem Grund. */
export async function revokePortfolioAccess(params: {
  slug: string
  manageToken?: string | null
  reason: string
  details?: string
}): Promise<{ success: boolean }> {
  const reasonLabel = REVOKE_REASON_LABELS[params.reason] ?? params.reason
  // TODO: Trigger Admin-Notification (Toast/Email) und setze Referenz-Status auf 'Vom Kunden gesperrt'
  void reasonLabel
  void params.details

  return deactivatePortfolio(params.slug, params.manageToken)
}
