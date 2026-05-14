'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SubmitForApprovalOptions } from '@/app/dashboard/references/approval-submit-types'
import { logEventForCurrentOrg } from '@/lib/events/log-event'
import { getAppOrigin } from '@/lib/env/app-origin'
import { getPortfolioManageAndPreviewUrlsForApprovalEmail } from '@/app/dashboard/references/sharing'
import { parseOrgPublicLinkPolicy } from '@/lib/organization-link-policy'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildClientApprovalEmailHtml(args: {
  firstName: string
  requesterBlock: string
  companyName: string
  refTitle: string
  approvalUrl: string
  portfolio: { manageUrl: string; publicPreviewUrl: string } | null
}): string {
  const portfolioSection = args.portfolio
    ? `
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
          <h2 style="font-size:16px;margin:0 0 12px;">Kundenansicht & Zugriff beenden</h2>
          <p style="margin:0 0 12px;line-height:1.5;">Mit dem <strong>ersten Link</strong> prüfen und freigeben Sie die Referenz. Der <strong>zweite Link</strong> zeigt dieselbe Kundenansicht – er ist nur für Sie bestimmt: Dort können Sie den öffentlichen Zugriff bei Bedarf <strong>sofort sperren</strong>. Bitte den zweiten Link nicht an Dritte weiterleiten.</p>
          <p style="margin:0 0 16px;"><a href="${escapeHtml(args.portfolio.manageUrl)}"
            style="display:inline-block;background:#b45309;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:600;">
            Persönlicher Link (mit Sperrrecht)
          </a></p>
          <p style="font-size:13px;color:#64748b;margin:0;line-height:1.5;">Öffentliche Kundenansicht ohne Sperrrecht (zum Weitergeben im Unternehmen):<br/>
          <a href="${escapeHtml(args.portfolio.publicPreviewUrl)}" style="color:#2563eb;word-break:break-all;">${escapeHtml(args.portfolio.publicPreviewUrl)}</a></p>
        `
    : ''

  return `
          <h1 style="font-size:20px;">Hallo${args.firstName ? ` ${escapeHtml(args.firstName)}` : ''}!</h1>
          ${args.requesterBlock}
          <p>Für das Unternehmen <strong>${escapeHtml(args.companyName)}</strong>:</p>
          <p><em>"${escapeHtml(args.refTitle)}"</em></p>
          <p>Bitte öffnen Sie den Link, um die Referenz zu prüfen und zu entscheiden:</p>
          <p style="margin:16px 0;"><a href="${escapeHtml(args.approvalUrl)}"
            style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:600;">
            Zur Freigabe-Seite
          </a></p>
          ${portfolioSection}
        `
}

type ReferenceApprovalRow = {
  id?: string
  title: string
  status: string | null
  company_id: string
  contact_id: string | null
  customer_contact_id: string | null
  approval_contact_id?: string | null
  approval_external_contact_id?: string | null
  customer_approval_status: string | null
  approval_reference_status_snapshot: string | null
  approval_requested_by?: string | null
  approval_owner_name?: string | null
  approval_expires_at?: string | null
  approval_scope_named_mention?: boolean | null
  approval_scope_anonymous_mention?: boolean | null
  approval_scope_reference_call?: boolean | null
  approval_scope_logo_use?: boolean | null
  approval_scope_press_release?: boolean | null
  approval_reference_giver_name?: string | null
  approval_reference_giver_title?: string | null
  approval_competitor_blacklist?: string[] | null
  approval_quote_proposed?: string | null
  companies: { name?: string } | { name?: string }[] | null
}

type ResolvedApprovalRecipient = {
  email: string
  firstName: string
  approvalContactId: string | null
  approvalExternalContactId: string | null
}

async function sendClientApprovalEmail(args: {
  supabase: SupabaseClient
  referenceId: string
  ref: ReferenceApprovalRow
  requesterName: string
  contactEmail: string
  firstName: string
  companyName: string
  /** Gleiches Update wie Token/Freigabe: interne Freigabe inkl. Prüfer (ohne zweites Roundtrip). */
  internalReviewerId?: string | null
  /**
   * Wenn false (Standard): kein Resend an den Kunden — Account Manager stellt den Kontakt her und sendet den Link manuell.
   */
  sendResendToCustomer?: boolean
}): Promise<{ success: boolean; token: string }> {
  const newToken = crypto.randomUUID()
  const reviewedAt = new Date().toISOString()
  const patch: {
    approval_token: string
    customer_approval_status: string
    approval_internal_status: string
    approval_internal_reviewed_at: string
    approval_internal_reviewer_id?: string
  } = {
    approval_token: newToken,
    customer_approval_status: 'pending',
    approval_internal_status: 'approved_internal',
    approval_internal_reviewed_at: reviewedAt,
  }
  if (args.internalReviewerId) {
    patch.approval_internal_reviewer_id = args.internalReviewerId
  }
  const { error: updateError } = await args.supabase.from('references').update(patch).eq('id', args.referenceId)
  if (updateError) throw new Error(updateError.message)

  const resend = getResend()
  const sendMail = args.sendResendToCustomer === true
  if (args.contactEmail && resend && sendMail) {
    const requesterBlock = args.requesterName
      ? `<p><strong>${escapeHtml(args.requesterName)}</strong> bittet Sie um Freigabe dieser Referenz.</p>`
      : '<p>Es liegt eine Freigabe-Anfrage für diese Referenz vor.</p>'
    let portfolio: { manageUrl: string; publicPreviewUrl: string } | null = null
    try {
      portfolio = await getPortfolioManageAndPreviewUrlsForApprovalEmail(args.supabase, args.referenceId)
    } catch (e) {
      console.error('[sendClientApprovalEmail] portfolio links:', e)
    }
    const approvalUrl = `${getAppOrigin()}/approval/${newToken}`
    try {
      await resend.emails.send({
        from: 'Refstack <onboarding@resend.dev>',
        to: args.contactEmail,
        subject: `Freigabe-Anfrage: ${args.companyName} – ${args.ref.title}`,
        html: buildClientApprovalEmailHtml({
          firstName: args.firstName,
          requesterBlock,
          companyName: args.companyName,
          refTitle: args.ref.title,
          approvalUrl,
          portfolio,
        }),
      })
    } catch (e) {
      console.error('E-Mail-Versand fehlgeschlagen:', e)
    }
  }
  return { success: true, token: newToken }
}

async function resolveContactForApproval(
  supabase: SupabaseClient,
  row: ReferenceApprovalRow,
  companyId: string,
  options?: SubmitForApprovalOptions,
  resolveOpts?: { requireRecipientEmail?: boolean }
): Promise<ResolvedApprovalRecipient> {
  const requireEmail = resolveOpts?.requireRecipientEmail !== false
  const fromPerson = (c: { id: string; email?: string | null; first_name?: string | null } | null) => {
    const email = typeof c?.email === 'string' && c.email.includes('@') ? c.email : ''
    const firstName = typeof c?.first_name === 'string' ? c.first_name : ''
    return {
      email,
      firstName,
      approvalContactId: c?.id ?? null,
      approvalExternalContactId: null as string | null,
    }
  }

  const fromExternal = (c: { id: string; email?: string | null; first_name?: string | null } | null) => {
    const email = typeof c?.email === 'string' && c.email.includes('@') ? c.email : ''
    const firstName = typeof c?.first_name === 'string' ? c.first_name : ''
    return {
      email,
      firstName,
      approvalContactId: null as string | null,
      approvalExternalContactId: c?.id ?? null,
    }
  }

  if (options?.externalContactId) {
    const { data: c, error } = await supabase
      .from('external_contacts')
      .select('id, email, first_name')
      .eq('id', options.externalContactId)
      .eq('company_id', companyId)
      .single()
    if (error || !c) throw new Error('Ungültiger Kundenkontakt für dieses Unternehmen')
    const r = fromExternal(c)
    if (requireEmail && !r.email) throw new Error('Der gewählte Kundenkontakt hat keine gültige E-Mail-Adresse')
    return r
  }

  if (options?.contactId) {
    const { data: c, error } = await supabase
      .from('contact_persons')
      .select('id, email, first_name')
      .eq('id', options.contactId)
      .eq('company_id', companyId)
      .single()
    if (error || !c) throw new Error('Ungültiger Kontakt für dieses Unternehmen')
    const r = fromPerson(c)
    if (requireEmail && !r.email) throw new Error('Der gewählte Kontakt hat keine gültige E-Mail-Adresse')
    return r
  }

  if (row.approval_contact_id) {
    const { data: c } = await supabase
      .from('contact_persons')
      .select('id, email, first_name')
      .eq('id', row.approval_contact_id)
      .eq('company_id', companyId)
      .maybeSingle()
    if (c?.id) {
      const r = fromPerson(c)
      if (r.email) return r
    }
  }

  if (row.approval_external_contact_id) {
    const { data: c } = await supabase
      .from('external_contacts')
      .select('id, email, first_name')
      .eq('id', row.approval_external_contact_id)
      .eq('company_id', companyId)
      .maybeSingle()
    if (c?.id) {
      const r = fromExternal(c)
      if (r.email) return r
    }
  }

  const tryIds = [row.customer_contact_id, row.contact_id].filter(Boolean) as string[]
  for (const id of tryIds) {
    const { data: cp } = await supabase
      .from('contact_persons')
      .select('id, email, first_name')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()
    if (cp?.id) {
      const r = fromPerson(cp)
      if (r.email) return r
    }
    const { data: ec } = await supabase
      .from('external_contacts')
      .select('id, email, first_name')
      .eq('id', id)
      .eq('company_id', companyId)
      .maybeSingle()
    if (ec?.id) {
      const r = fromExternal(ec)
      if (r.email) return r
    }
  }

  throw new Error(
    'Kein Empfänger: Bitte in der Referenz einen Kundenkontakt mit gültiger E-Mail hinterlegen (oder im Account pflegen).'
  )
}

/** Benachrichtigt den am Account hinterlegten internen Referenzfreigabe-Kontakt (Metadaten → konkreter Mail-Hinweis). */
async function notifyInternalReferenceCoordinatorAboutPendingReview(args: {
  supabase: SupabaseClient
  referenceId: string
  referenceTitle: string
  accountCompanyId: string
  accountCompanyName: string
  requesterName: string
}): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const { data: companyRow } = await args.supabase
    .from('companies')
    .select('internal_reference_approval_contact_id')
    .eq('id', args.accountCompanyId)
    .maybeSingle()

  const contactId = (companyRow as { internal_reference_approval_contact_id?: string | null } | null)
    ?.internal_reference_approval_contact_id
  if (!contactId) return

  const { data: person } = await args.supabase
    .from('contact_persons')
    .select('email, first_name')
    .eq('id', contactId)
    .eq('company_id', args.accountCompanyId)
    .maybeSingle()

  const email = String(person?.email ?? '').trim()
  if (!email.toLowerCase().includes('@')) return

  const detailUrl = `${getAppOrigin()}${ROUTES.evidence.detail(args.referenceId)}`
  const greeting = person?.first_name
    ? `Hallo ${escapeHtml(String(person.first_name).trim())},`
    : 'Hallo,'
  const who = args.requesterName.trim()
    ? `<p><strong>${escapeHtml(args.requesterName.trim())}</strong> hat eine Kundenfreigabe zur internen Prüfung eingereicht.</p>`
    : '<p>Es liegt eine neue Freigabe zur internen Prüfung vor.</p>'

  try {
    await resend.emails.send({
      from: 'Refstack <onboarding@resend.dev>',
      to: email,
      subject: `Interne Referenzfreigabe: ${args.accountCompanyName} – ${args.referenceTitle}`,
      html: `
        ${greeting}
        ${who}
        <p>Referenz: <strong>${escapeHtml(args.referenceTitle)}</strong><br/>
        Account: <strong>${escapeHtml(args.accountCompanyName)}</strong></p>
        <p>Bitte in RefStack prüfen und bei Bedarf die interne Freigabe erteilen (Vier-Augen), danach Versand an den Kunden:</p>
        <p><a href="${escapeHtml(detailUrl)}">Zur Referenz</a></p>
      `,
    })
  } catch (e) {
    console.error('[notifyInternalReferenceCoordinatorAboutPendingReview]', e)
  }
}

function computeStatusSnapshot(row: ReferenceApprovalRow): string {
  const existing = row.approval_reference_status_snapshot
  if (row.customer_approval_status === 'pending' && existing) {
    return existing
  }
  const s = String(row.status ?? 'draft')
  if (s === 'pending') {
    return existing ?? 'draft'
  }
  return s
}

export async function submitForApprovalImpl(
  id: string,
  options?: SubmitForApprovalOptions
) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const { data: row, error: fetchError } = await supabase
    .from('references')
    .select(
      `
      title,
      status,
      company_id,
      contact_id,
      customer_contact_id,
      approval_contact_id,
      approval_external_contact_id,
      customer_approval_status,
      approval_reference_status_snapshot,
      approval_requested_by,
      approval_reference_giver_name,
      approval_reference_giver_title,
      approval_scope_named_mention,
      approval_scope_anonymous_mention,
      approval_scope_reference_call,
      approval_scope_logo_use,
      approval_scope_press_release,
      approval_competitor_blacklist,
      approval_quote_proposed,
      companies ( name )
    `
    )
    .eq('id', id)
    .single()

  if (fetchError || !row) throw new Error('Referenz nicht gefunden')

  const ref = row as unknown as ReferenceApprovalRow

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id')
    .eq('id', user.id)
    .maybeSingle()
  const organizationId =
    typeof (profile as { organization_id?: string | null } | null)?.organization_id === 'string'
      ? (profile as { organization_id: string }).organization_id
      : null
  const requesterName =
    typeof (profile as { full_name?: string } | null)?.full_name === 'string'
      ? (profile as { full_name: string }).full_name.trim()
      : ''

  let workflowSettingsUnknown: unknown = null
  if (organizationId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('workflow_settings')
      .eq('id', organizationId)
      .maybeSingle()
    workflowSettingsUnknown = org?.workflow_settings ?? null
  }

  const linkPolicy = parseOrgPublicLinkPolicy(workflowSettingsUnknown, 14)
  const defaultApprovalLinkDays = Math.max(1, Math.min(365, linkPolicy.defaultTtlDays))
  const explicitExpiryDays =
    options?.approvalExpiresInDays != null && Number.isFinite(options.approvalExpiresInDays)
      ? Math.max(1, Math.min(365, Math.trunc(Number(options.approvalExpiresInDays))))
      : null
  const expiryDays = explicitExpiryDays ?? defaultApprovalLinkDays
  const expiresAtMs = Date.now() + expiryDays * 24 * 60 * 60 * 1000
  const expiresAtIso = new Date(expiresAtMs).toISOString()
  const graceUntilIso = new Date(expiresAtMs + 30 * 24 * 60 * 60 * 1000).toISOString()

  const resolvedRecipient = await resolveContactForApproval(supabase, ref, ref.company_id, options)
  const company =
    Array.isArray(ref.companies) && ref.companies.length > 0
      ? (ref.companies[0] as { name?: string })
      : (ref.companies as { name?: string } | null)
  const companyName = company?.name ?? 'Referenz'

  const snapshot = computeStatusSnapshot(ref)

  const scope = options?.scope
  const ownerResolved =
    (options?.ownerName?.trim() ? options.ownerName.trim() : null) ??
    (requesterName.trim() ? requesterName.trim() : null)

  const { error: updateError } = await supabase
    .from('references')
    .update({
      approval_token: null,
      customer_approval_status: null,
      approval_internal_status: 'pending_internal',
      approval_message: options?.message?.trim() ? options.message.trim() : null,
      approval_contact_id: resolvedRecipient.approvalContactId,
      approval_external_contact_id: resolvedRecipient.approvalExternalContactId,
      approval_requested_at: new Date().toISOString(),
      approval_requested_by: user.id,
      approval_requester_name: requesterName || null,
      approval_internal_reviewer_id: null,
      approval_internal_reviewed_at: null,
      approval_reference_status_snapshot: snapshot,
      approval_owner_name: ownerResolved,
      approval_expires_at: expiresAtIso,
      approval_grace_until: graceUntilIso,
      approval_scope_named_mention: scope
        ? scope.namedMention
        : (ref.approval_scope_named_mention ?? true),
      approval_scope_anonymous_mention: scope
        ? scope.anonymousMention
        : (ref.approval_scope_anonymous_mention ?? true),
      approval_scope_reference_call: scope
        ? scope.referenceCall
        : (ref.approval_scope_reference_call ?? false),
      approval_scope_logo_use: scope ? scope.logoUse : (ref.approval_scope_logo_use ?? false),
      approval_scope_press_release: scope
        ? scope.pressRelease
        : (ref.approval_scope_press_release ?? false),
      approval_reference_giver_name:
        options?.referenceGiverName !== undefined
          ? options.referenceGiverName.trim() || null
          : (ref.approval_reference_giver_name ?? null),
      approval_reference_giver_title:
        options?.referenceGiverTitle !== undefined
          ? options.referenceGiverTitle.trim() || null
          : (ref.approval_reference_giver_title ?? null),
      approval_competitor_blacklist:
        options?.competitorBlacklist !== undefined
          ? options.competitorBlacklist
          : (ref.approval_competitor_blacklist ?? []),
      approval_quote_proposed:
        options?.proposedQuote !== undefined
          ? options.proposedQuote.trim() || null
          : (ref.approval_quote_proposed ?? null),
    })
    .eq('id', id)

  if (updateError) throw new Error(updateError.message)

  const { data: existing } = await supabase
    .from('approvals')
    .select('id')
    .eq('reference_id', id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!existing) {
    await supabase.from('approvals').insert({
      reference_id: id,
      requester_id: user.id,
      status: 'pending',
    })
  }

  await notifyInternalReferenceCoordinatorAboutPendingReview({
    supabase,
    referenceId: id,
    referenceTitle: ref.title,
    accountCompanyId: ref.company_id,
    accountCompanyName: companyName,
    requesterName,
  })
  await logEventForCurrentOrg({
    eventType: 'internal_approval_requested',
    referenceId: id,
    payload: {},
  })

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.evidence.detail(id))
  revalidatePath(ROUTES.evidence.root)
  return {
    success: true as const,
    stage: 'internal_review_pending' as const,
    requesterRole: (profile as { role?: string } | null)?.role ?? null,
  }
}

export type ApproveInternalAndSendResult =
  | { success: true }
  | { success: false; error: string }

export type ApproveInternalRecipientOptions = Pick<SubmitForApprovalOptions, 'contactId' | 'externalContactId'>

export async function approveInternalAndSendImpl(
  referenceId: string,
  recipient?: ApproveInternalRecipientOptions
): Promise<ApproveInternalAndSendResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht authentifiziert.' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError || !profile) {
    return { success: false, error: 'Profil nicht gefunden. Bitte Onboarding abschließen.' }
  }
  const role = String((profile as { role?: string }).role ?? '')
  if (role !== 'admin' && role !== 'account_manager') {
    return { success: false, error: 'Nur Admin oder Account Manager dürfen extern versenden.' }
  }

  const { data: row, error } = await supabase
    .from('references')
    .select(
      `id, title, status, company_id, contact_id, customer_contact_id, approval_contact_id, approval_external_contact_id, customer_approval_status, approval_reference_status_snapshot, approval_requested_by, companies(name)`
    )
    .eq('id', referenceId)
    .single()
  if (error || !row) return { success: false, error: 'Referenz nicht gefunden.' }
  const ref = row as unknown as ReferenceApprovalRow
  const company =
    Array.isArray(ref.companies) && ref.companies.length > 0
      ? (ref.companies[0] as { name?: string })
      : (ref.companies as { name?: string } | null)
  const company_name = company?.name ?? 'Referenz'

  let contactEmail: string
  let firstName: string
  try {
    const resolved = await resolveContactForApproval(
      supabase,
      ref,
      ref.company_id,
      {
        contactId: recipient?.contactId,
        externalContactId: recipient?.externalContactId,
      },
      { requireRecipientEmail: false }
    )
    contactEmail = resolved.email
    firstName = resolved.firstName

    const { error: syncErr } = await supabase
      .from('references')
      .update({
        approval_contact_id: resolved.approvalContactId,
        approval_external_contact_id: resolved.approvalExternalContactId,
      })
      .eq('id', referenceId)
    if (syncErr) return { success: false, error: syncErr.message }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Kein gültiger Empfänger für die Freigabe.'
    return { success: false, error: msg }
  }

  const requesterName =
    typeof (profile as { full_name?: string }).full_name === 'string'
      ? (profile as { full_name: string }).full_name.trim()
      : ''

  try {
    await sendClientApprovalEmail({
      supabase,
      referenceId,
      ref,
      requesterName,
      contactEmail,
      firstName,
      companyName: company_name,
      internalReviewerId: user.id,
      sendResendToCustomer: false,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Freigabe konnte nicht gespeichert werden.'
    return { success: false, error: msg }
  }

  await logEventForCurrentOrg({
    eventType: 'customer_approval_requested',
    referenceId,
    payload: {},
  })

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.evidence.detail(referenceId))
  revalidatePath(ROUTES.evidence.root)
  return { success: true }
}

export async function getApprovalLinkImpl(referenceId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('references')
    .select('approval_token')
    .eq('id', referenceId)
    .maybeSingle()
  const token = (data as { approval_token?: string | null } | null)?.approval_token
  if (!token) return null
  return `${getAppOrigin()}/approval/${token}`
}

export async function withdrawApprovalRequestImpl(referenceId: string): Promise<{ success: true }> {
  const supabase = await createServerSupabaseClient()
  await supabase
    .from('references')
    .update({
      approval_token: null,
      customer_approval_status: null,
      approval_internal_status: 'withdrawn_internal',
      approval_requested_at: null,
      approval_contact_id: null,
      approval_external_contact_id: null,
    })
    .eq('id', referenceId)
  await supabase
    .from('approvals')
    .update({ status: 'rejected' })
    .eq('reference_id', referenceId)
    .eq('status', 'pending')
  revalidatePath(ROUTES.evidence.detail(referenceId))
  return { success: true }
}

export async function delegateClientApprovalImpl(params: {
  token: string
  delegateName?: string
  delegateEmail: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const token = params.token.trim()
  const email = params.delegateEmail.trim().toLowerCase()
  if (!token || !email.includes('@')) return { success: false, error: 'Ungültige Delegationsdaten.' }
  const { data: ref } = await supabase
    .from('references')
    .select('id, title, approval_token, approval_delegated_to_name, approval_delegated_to_email')
    .eq('approval_token', token)
    .maybeSingle()
  if (!ref) return { success: false, error: 'Link ungültig.' }
  await supabase
    .from('references')
    .update({
      approval_delegated_to_name: params.delegateName?.trim() || null,
      approval_delegated_to_email: email,
    })
    .eq('id', (ref as { id: string }).id)
  const resend = getResend()
  if (resend) {
    await resend.emails.send({
      from: 'Refstack <onboarding@resend.dev>',
      to: email,
      subject: `Weitergeleitete Freigabe: ${(ref as { title?: string }).title ?? 'Referenz'}`,
      html: `<p>Eine Freigabe wurde an Sie delegiert.</p><a href="${getAppOrigin()}/approval/${token}">Zur Freigabe-Seite</a>`,
    })
  }
  return { success: true }
}

/** Neuen Freigabe-Token setzen (kein Resend — AM sendet den Link manuell). */
export async function resendClientApprovalEmailImpl(referenceId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = String((profile as { role?: string } | null)?.role ?? '')

  const { data: row, error: fetchError } = await supabase
    .from('references')
    .select(
      `
      title,
      status,
      company_id,
      contact_id,
      customer_contact_id,
      customer_approval_status,
      approval_reference_status_snapshot,
      approval_requested_by,
      approval_contact_id,
      approval_external_contact_id,
      companies ( name )
    `
    )
    .eq('id', referenceId)
    .single()

  if (fetchError || !row) throw new Error('Referenz nicht gefunden')

  const ref = row as unknown as ReferenceApprovalRow

  if (ref.customer_approval_status !== 'pending') {
    throw new Error('Es liegt keine ausstehende Kunden-Freigabe vor.')
  }

  const canResend =
    role === 'admin' ||
    role === 'account_manager' ||
    ref.approval_requested_by === user.id
  if (!canResend) {
    throw new Error('Keine Berechtigung, den Freigabe-Link zu erneuern.')
  }

  const newToken = crypto.randomUUID()

  const { error: updateError } = await supabase
    .from('references')
    .update({
      approval_token: newToken,
      approval_requested_at: new Date().toISOString(),
    })
    .eq('id', referenceId)

  if (updateError) throw new Error(updateError.message)

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.evidence.detail(referenceId))
  revalidatePath(ROUTES.evidence.root)
}
