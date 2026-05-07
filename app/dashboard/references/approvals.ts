'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SubmitForApprovalOptions } from '@/app/dashboard/references/approval-submit-types'
import { logEventForCurrentOrg } from '@/lib/events/log-event'
import { getAppOrigin } from '@/lib/env/app-origin'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
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
  if (args.contactEmail && resend) {
    const requesterBlock = args.requesterName
      ? `<p><strong>${escapeHtml(args.requesterName)}</strong> bittet Sie um Freigabe dieser Referenz.</p>`
      : '<p>Es liegt eine Freigabe-Anfrage für diese Referenz vor.</p>'
    try {
      await resend.emails.send({
        from: 'Refstack <onboarding@resend.dev>',
        to: args.contactEmail,
        subject: `Freigabe-Anfrage: ${args.companyName} – ${args.ref.title}`,
        html: `
          <h1>Hallo${args.firstName ? ` ${escapeHtml(args.firstName)}` : ''}!</h1>
          ${requesterBlock}
          <p>Für das Unternehmen <strong>${escapeHtml(args.companyName)}</strong>:</p>
          <p><em>"${escapeHtml(args.ref.title)}"</em></p>
          <p>Bitte öffnen Sie den Link, um die Referenz zu prüfen und zu entscheiden:</p>
          <a href="${getAppOrigin()}/approval/${newToken}"
            style="display:inline-block;background:var(--primary,#0f172a);color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;">
            Zur Freigabe-Seite
          </a>
        `,
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
  options?: SubmitForApprovalOptions
): Promise<ResolvedApprovalRecipient> {
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
    if (!r.email) throw new Error('Der gewählte Kundenkontakt hat keine gültige E-Mail-Adresse')
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
    if (!r.email) throw new Error('Der gewählte Kontakt hat keine gültige E-Mail-Adresse')
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
    'Kein Empfänger: Bitte im Dialog einen Kontakt mit E-Mail wählen oder in der Referenz einen Kundenkontakt hinterlegen.'
  )
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
      customer_approval_status,
      approval_reference_status_snapshot,
      approval_requested_by,
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

  let requireInternalApproval = true
  if (organizationId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('workflow_settings')
      .eq('id', organizationId)
      .maybeSingle()
    const workflow =
      org?.workflow_settings && typeof org.workflow_settings === 'object'
        ? (org.workflow_settings as Record<string, unknown>)
        : {}
    if (workflow.require_internal_approval === false) {
      requireInternalApproval = false
    }
  }

  const resolvedRecipient = await resolveContactForApproval(supabase, ref, ref.company_id, options)
  const { email: contactEmail, firstName } = resolvedRecipient
  const company =
    Array.isArray(ref.companies) && ref.companies.length > 0
      ? (ref.companies[0] as { name?: string })
      : (ref.companies as { name?: string } | null)
  const companyName = company?.name ?? 'Referenz'

  const snapshot = computeStatusSnapshot(ref)

  const { error: updateError } = await supabase
    .from('references')
    .update({
      approval_token: null,
      customer_approval_status: null,
      approval_internal_status: requireInternalApproval ? 'pending_internal' : 'approved_internal',
      approval_message: options?.message?.trim() ? options.message.trim() : null,
      approval_contact_id: resolvedRecipient.approvalContactId,
      approval_external_contact_id: resolvedRecipient.approvalExternalContactId,
      approval_requested_at: new Date().toISOString(),
      approval_requested_by: user.id,
      approval_requester_name: requesterName || null,
      approval_internal_reviewer_id: requireInternalApproval ? null : user.id,
      approval_internal_reviewed_at: requireInternalApproval ? null : new Date().toISOString(),
      approval_reference_status_snapshot: snapshot,
      approval_owner_name: options?.ownerName?.trim() ? options.ownerName.trim() : null,
      approval_expires_at: options?.approvalExpiresInDays
        ? new Date(Date.now() + Math.max(1, Math.min(365, options.approvalExpiresInDays)) * 24 * 60 * 60 * 1000).toISOString()
        : null,
      approval_grace_until: options?.approvalExpiresInDays
        ? new Date(Date.now() + (Math.max(1, Math.min(365, options.approvalExpiresInDays)) + 30) * 24 * 60 * 60 * 1000).toISOString()
        : null,
      approval_scope_named_mention: options?.scope?.namedMention ?? true,
      approval_scope_anonymous_mention: options?.scope?.anonymousMention ?? true,
      approval_scope_reference_call: options?.scope?.referenceCall ?? false,
      approval_scope_logo_use: options?.scope?.logoUse ?? false,
      approval_scope_press_release: options?.scope?.pressRelease ?? false,
      approval_reference_giver_name: options?.referenceGiverName?.trim() ? options.referenceGiverName.trim() : null,
      approval_reference_giver_title: options?.referenceGiverTitle?.trim() ? options.referenceGiverTitle.trim() : null,
      approval_competitor_blacklist: options?.competitorBlacklist ?? [],
      approval_quote_proposed: options?.proposedQuote?.trim() ? options.proposedQuote.trim() : null,
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

  if (requireInternalApproval) {
    await logEventForCurrentOrg({
      eventType: 'internal_approval_requested',
      referenceId: id,
      payload: {},
    })
  } else {
    await sendClientApprovalEmail({
      supabase,
      referenceId: id,
      ref,
      requesterName,
      contactEmail,
      firstName,
      companyName,
    })
    await logEventForCurrentOrg({
      eventType: 'customer_approval_requested',
      referenceId: id,
      payload: {},
    })
  }

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.evidence.detail(id))
  revalidatePath(ROUTES.evidence.root)
  return {
    success: true as const,
    stage: requireInternalApproval
      ? ('internal_review_pending' as const)
      : ('customer_review_pending' as const),
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
    const resolved = await resolveContactForApproval(supabase, ref, ref.company_id, {
      contactId: recipient?.contactId,
      externalContactId: recipient?.externalContactId,
    })
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

/** Erneuter Versand der Freigabe-E-Mail (gleicher Flow, neuer Token-Link). */
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
    throw new Error('Keine Berechtigung, eine Erinnerung zu senden.')
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

  const company =
    Array.isArray(ref.companies) && ref.companies.length > 0
      ? (ref.companies[0] as { name?: string })
      : (ref.companies as { name?: string } | null)
  const company_name = company?.name ?? 'Referenz'

  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', ref.approval_requested_by ?? user.id)
    .maybeSingle()
  const requesterName =
    typeof (requesterProfile as { full_name?: string } | null)?.full_name === 'string'
      ? (requesterProfile as { full_name: string }).full_name.trim()
      : ''

  const { email: contactEmail, firstName } = await resolveContactForApproval(supabase, ref, ref.company_id)

  const resend = getResend()
  if (contactEmail && resend) {
    try {
      const requesterBlock = requesterName
        ? `<p><strong>${escapeHtml(requesterName)}</strong> bittet Sie um Freigabe dieser Referenz.</p>`
        : '<p>Es liegt eine Freigabe-Anfrage für diese Referenz vor.</p>'
      await resend.emails.send({
        from: 'Refstack <onboarding@resend.dev>',
        to: contactEmail,
        subject: `Erinnerung: Freigabe ${company_name} – ${ref.title}`,
        html: `
          <h1>Hallo${firstName ? ` ${escapeHtml(firstName)}` : ''}!</h1>
          ${requesterBlock}
          <p>Für das Unternehmen <strong>${escapeHtml(company_name)}</strong>:</p>
          <p><em>"${escapeHtml(ref.title)}"</em></p>
          <p>Bitte öffnen Sie den Link, um die Referenz zu prüfen und zu entscheiden:</p>
          <a href="${getAppOrigin()}/approval/${newToken}"
             style="display:inline-block;background:var(--primary,#0f172a);color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;">
            Zur Freigabe-Seite
          </a>
        `,
      })
    } catch (e) {
      console.error('E-Mail-Versand fehlgeschlagen:', e)
    }
  } else if (!contactEmail) {
    throw new Error('Kein Empfänger mit E-Mail für diese Freigabe hinterlegt.')
  }

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.evidence.detail(referenceId))
  revalidatePath(ROUTES.evidence.root)
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
