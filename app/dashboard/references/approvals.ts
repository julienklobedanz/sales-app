'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SubmitForApprovalOptions } from '@/app/dashboard/references/approval-submit-types'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

type ReferenceApprovalRow = {
  title: string
  status: string | null
  company_id: string
  contact_id: string | null
  customer_contact_id: string | null
  approval_contact_id?: string | null
  customer_approval_status: string | null
  approval_reference_status_snapshot: string | null
  approval_requested_by?: string | null
  companies: { name?: string } | { name?: string }[] | null
}

async function resolveContactForApproval(
  supabase: SupabaseClient,
  row: ReferenceApprovalRow,
  companyId: string,
  options?: SubmitForApprovalOptions
): Promise<{ contactId: string; email: string; firstName: string }> {
  const pickEmail = (c: { email?: string | null; first_name?: string | null } | null) => {
    const email = typeof c?.email === 'string' && c.email.includes('@') ? c.email : null
    const firstName = typeof c?.first_name === 'string' ? c.first_name : ''
    return { email, firstName }
  }

  if (options?.contactId) {
    const { data: c, error } = await supabase
      .from('contact_persons')
      .select('id, email, first_name')
      .eq('id', options.contactId)
      .eq('company_id', companyId)
      .single()
    if (error || !c) throw new Error('Ungültiger Kontakt für dieses Unternehmen')
    const { email, firstName } = pickEmail(c)
    if (!email) throw new Error('Der gewählte Kontakt hat keine gültige E-Mail-Adresse')
    return { contactId: c.id, email, firstName }
  }

  const tryId = row.approval_contact_id ?? row.customer_contact_id ?? row.contact_id
  if (tryId) {
    const { data: c } = await supabase
      .from('contact_persons')
      .select('id, email, first_name')
      .eq('id', tryId)
      .eq('company_id', companyId)
      .maybeSingle()
    const { email, firstName } = pickEmail(c)
    if (email && c?.id) {
      return { contactId: c.id, email, firstName }
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

  const newToken = crypto.randomUUID()

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

  const company =
    Array.isArray(ref.companies) && ref.companies.length > 0
      ? (ref.companies[0] as { name?: string })
      : (ref.companies as { name?: string } | null)
  const company_name = company?.name ?? 'Referenz'

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()
  const requesterName =
    typeof (profile as { full_name?: string } | null)?.full_name === 'string'
      ? (profile as { full_name: string }).full_name.trim()
      : ''

  const { contactId, email: contactEmail, firstName } = await resolveContactForApproval(
    supabase,
    ref,
    ref.company_id,
    options
  )

  const snapshot = computeStatusSnapshot(ref)

  const { error: updateError } = await supabase
    .from('references')
    .update({
      approval_token: newToken,
      customer_approval_status: 'pending',
      approval_message: options?.message?.trim() ? options.message.trim() : null,
      approval_contact_id: contactId,
      approval_requested_at: new Date().toISOString(),
      approval_requested_by: user.id,
      approval_requester_name: requesterName || null,
      approval_reference_status_snapshot: snapshot,
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

  const resend = getResend()
  if (contactEmail && resend) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const msgBlock = options?.message?.trim()
        ? `<p><strong>Persönliche Nachricht:</strong></p><p>${escapeHtml(options.message.trim())}</p>`
        : ''
      const requesterBlock = requesterName
        ? `<p><strong>${escapeHtml(requesterName)}</strong> bittet Sie um Freigabe dieser Referenz.</p>`
        : '<p>Es liegt eine Freigabe-Anfrage für diese Referenz vor.</p>'
      await resend.emails.send({
        from: 'Refstack <onboarding@resend.dev>',
        to: contactEmail,
        subject: `Freigabe-Anfrage: ${company_name} – ${ref.title}`,
        html: `
          <h1>Hallo${firstName ? ` ${escapeHtml(firstName)}` : ''}!</h1>
          ${requesterBlock}
          ${msgBlock}
          <p>Für das Unternehmen <strong>${escapeHtml(company_name)}</strong>:</p>
          <p><em>"${escapeHtml(ref.title)}"</em></p>
          <p>Bitte öffnen Sie den Link, um die Referenz zu prüfen und zu entscheiden:</p>
          <a href="${baseUrl}/approval/${newToken}"
             style="display:inline-block;background:var(--primary,#0f172a);color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;">
            Zur Freigabe-Seite
          </a>
        `,
      })
    } catch (e) {
      console.error('E-Mail-Versand fehlgeschlagen:', e)
    }
  }

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.evidence.detail(id))
  revalidatePath(ROUTES.evidence.root)
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

  const { email: contactEmail, firstName } = await resolveContactForApproval(
    supabase,
    ref,
    ref.company_id,
    ref.approval_contact_id ? { contactId: ref.approval_contact_id } : undefined
  )

  const resend = getResend()
  if (contactEmail && resend) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
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
          <a href="${baseUrl}/approval/${newToken}"
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
