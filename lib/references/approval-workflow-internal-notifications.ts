import 'server-only'

import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildRefstackEmailHtml,
  buildReferenceMetaRows,
  escapeRefstackEmailHtml,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import { getAppOrigin } from '@/lib/env/app-origin'
import { ROUTES } from '@/lib/routes'
import { resolveApprovalWorkflowNotifyEmails } from '@/lib/references/approval-workflow-notify-recipients'

function referenceDetailUrl(referenceId: string): string {
  return `${getAppOrigin()}${ROUTES.evidence.detail(referenceId)}`
}

async function sendToRecipients(args: {
  to: string[]
  subject: string
  html: string
}): Promise<boolean> {
  if (!args.to.length) return false

  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return false

  const resend = new Resend(key)
  let sent = false

  for (const recipient of args.to) {
    try {
      await resend.emails.send({
        from: getRefstackResendFrom(),
        to: recipient,
        subject: args.subject,
        html: args.html,
      })
      sent = true
    } catch (e) {
      console.error('[approval-workflow-internal-notifications] send failed:', e)
    }
  }

  return sent
}

type ReferenceNotifyContext = {
  referenceId: string
  referenceTitle: string
  companyId: string
  companyName: string
  requesterId: string | null
  coordinatorEmail: string | null
}

export async function loadReferenceNotifyContext(
  admin: SupabaseClient,
  referenceId: string
): Promise<ReferenceNotifyContext | null> {
  const { data: row, error } = await admin
    .from('references')
    .select(
      `
      id,
      title,
      company_id,
      approval_requested_by,
      approval_coordinator_email,
      companies ( name )
    `
    )
    .eq('id', referenceId)
    .maybeSingle()

  if (error || !row?.id) return null

  const company =
    Array.isArray(row.companies) && row.companies.length > 0
      ? row.companies[0]
      : (row.companies as { name?: string } | null)

  return {
    referenceId: row.id as string,
    referenceTitle: String(row.title ?? 'Referenz').trim() || 'Referenz',
    companyId: String(row.company_id),
    companyName: String(company?.name ?? '').trim() || 'Referenz',
    requesterId: (row as { approval_requested_by?: string | null }).approval_requested_by ?? null,
    coordinatorEmail:
      typeof (row as { approval_coordinator_email?: string | null }).approval_coordinator_email ===
      'string'
        ? (row as { approval_coordinator_email: string }).approval_coordinator_email
        : null,
  }
}

async function notify(args: {
  admin: SupabaseClient
  context: ReferenceNotifyContext
  badge: string
  subject: string
  bodyHtml: string
  metaExtraHtml?: string
  ctaLabel?: string
}): Promise<boolean> {
  const recipients = await resolveApprovalWorkflowNotifyEmails(args.admin, {
    companyId: args.context.companyId,
    requesterId: args.context.requesterId,
    coordinatorEmail: args.context.coordinatorEmail,
  })
  if (!recipients.length) return false

  const detailUrl = referenceDetailUrl(args.context.referenceId)
  const html = buildRefstackEmailHtml({
    audience: 'internal',
    badge: args.badge,
    greeting: 'Hallo,',
    bodyHtml: args.bodyHtml,
    meta: {
      rows: buildReferenceMetaRows(args.context.referenceTitle, args.context.companyName),
      extraHtml: args.metaExtraHtml,
    },
    ctas: args.ctaLabel ? [{ label: args.ctaLabel, href: detailUrl }] : undefined,
    footerLink: { label: 'Referenz in RefStack öffnen:', url: detailUrl },
  })

  return sendToRecipients({
    to: recipients,
    subject: args.subject,
    html,
  })
}

export async function notifyInternalTeamCustomerChangesNeeded(args: {
  admin: SupabaseClient
  referenceId: string
  comment: string
}): Promise<boolean> {
  const context = await loadReferenceNotifyContext(args.admin, args.referenceId)
  if (!context) return false

  const comment = args.comment.trim()
  const commentBlock = comment
    ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#334155;"><strong>Änderungswünsche:</strong><br/>${escapeRefstackEmailHtml(comment).replace(/\n/g, '<br/>')}</p>`
    : ''

  return notify({
    admin: args.admin,
    context,
    badge: 'Änderungswünsche',
    subject: `Änderungswünsche: ${context.referenceTitle} (${context.companyName})`,
    bodyHtml: `<p style="margin:0 0 16px;">Der Kunde hat bei der Referenz-Freigabe <strong>Änderungswünsche</strong> geäußert.</p>
      <p style="margin:0;">Bitte passen Sie die Referenz an und fordern Sie die Freigabe erneut an.</p>`,
    metaExtraHtml: commentBlock,
    ctaLabel: 'Referenz bearbeiten',
  })
}

export async function notifyInternalTeamCustomerApproved(args: {
  admin: SupabaseClient
  referenceId: string
}): Promise<boolean> {
  const context = await loadReferenceNotifyContext(args.admin, args.referenceId)
  if (!context) return false

  return notify({
    admin: args.admin,
    context,
    badge: 'Kunde hat freigegeben',
    subject: `Freigabe erteilt: ${context.referenceTitle} (${context.companyName})`,
    bodyHtml: `<p style="margin:0 0 16px;">Der Kunde hat die Referenz <strong>freigegeben</strong>.</p>
      <p style="margin:0;">Die Referenz kann nun verwendet werden.</p>`,
    ctaLabel: 'Referenz ansehen',
  })
}

export async function notifyInternalTeamInternalApproved(args: {
  admin: SupabaseClient
  referenceId: string
}): Promise<boolean> {
  const context = await loadReferenceNotifyContext(args.admin, args.referenceId)
  if (!context) return false

  return notify({
    admin: args.admin,
    context,
    badge: 'Intern freigegeben',
    subject: `Interne Freigabe bestätigt: ${context.referenceTitle} (${context.companyName})`,
    bodyHtml: `<p style="margin:0 0 16px;">Die <strong>interne Freigabe</strong> wurde bestätigt.</p>
      <p style="margin:0;">Sie können jetzt in RefStack die <strong>Kundenfreigabe vorbereiten</strong> und an den Kundenkontakt senden.</p>`,
    ctaLabel: 'Zur Referenz',
  })
}

export async function notifyInternalTeamCustomerRejected(args: {
  admin: SupabaseClient
  referenceId: string
  comment?: string | null
}): Promise<boolean> {
  const context = await loadReferenceNotifyContext(args.admin, args.referenceId)
  if (!context) return false

  const comment = String(args.comment ?? '').trim()
  const commentBlock = comment
    ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#334155;"><strong>Kommentar des Kunden:</strong><br/>${escapeRefstackEmailHtml(comment).replace(/\n/g, '<br/>')}</p>`
    : ''

  return notify({
    admin: args.admin,
    context,
    badge: 'Abgelehnt',
    subject: `Freigabe abgelehnt: ${context.referenceTitle} (${context.companyName})`,
    bodyHtml: `<p style="margin:0;">Der Kunde hat die Referenz-Freigabe <strong>abgelehnt</strong>.</p>`,
    metaExtraHtml: commentBlock,
    ctaLabel: 'Referenz ansehen',
  })
}

export async function notifyInternalTeamApprovalWithdrawn(args: {
  admin: SupabaseClient
  referenceId: string
  referenceTitle: string
  companyId: string
  companyName: string
  requesterId: string | null
  coordinatorEmail: string | null
}): Promise<boolean> {
  const context: ReferenceNotifyContext = {
    referenceId: args.referenceId,
    referenceTitle: args.referenceTitle,
    companyId: args.companyId,
    companyName: args.companyName,
    requesterId: args.requesterId,
    coordinatorEmail: args.coordinatorEmail,
  }

  return notify({
    admin: args.admin,
    context,
    badge: 'Widerrufen',
    subject: `Freigabeanfrage widerrufen: ${context.referenceTitle} (${context.companyName})`,
    bodyHtml: `<p style="margin:0 0 16px;">Die Freigabeanfrage wurde <strong>widerrufen</strong>.</p>
      <p style="margin:0;">Die Referenz befindet sich wieder im Entwurf. Interne und Kunden-Freigabe wurden zurückgesetzt.</p>`,
    ctaLabel: 'Zur Referenz',
  })
}

export async function notifyInternalTeamCustomerAccessRevoked(args: {
  admin: SupabaseClient
  referenceId: string
  reasonLabel: string
  details?: string | null
}): Promise<boolean> {
  const context = await loadReferenceNotifyContext(args.admin, args.referenceId)
  if (!context) return false

  const details = String(args.details ?? '').trim()
  const detailsBlock = details
    ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#334155;"><strong>Details:</strong><br/>${escapeRefstackEmailHtml(details).replace(/\n/g, '<br/>')}</p>`
    : ''

  const reasonBlock = `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#334155;"><strong>Grund:</strong> ${escapeRefstackEmailHtml(args.reasonLabel.trim() || 'Nicht angegeben')}</p>`

  return notify({
    admin: args.admin,
    context,
    badge: 'Zugriff gesperrt',
    subject: `Kunde hat Zugriff gesperrt: ${context.referenceTitle} (${context.companyName})`,
    bodyHtml: `<p style="margin:0 0 16px;">Der Kunde hat den <strong>öffentlichen Zugriff</strong> auf die Referenz gesperrt.</p>
      <p style="margin:0;">Bitte klären Sie mit dem Kunden, warum der Zugriff beendet wurde.</p>`,
    metaExtraHtml: `${reasonBlock}${detailsBlock}`,
    ctaLabel: 'Referenz ansehen',
  })
}

export async function notifyInternalTeamCustomerApprovalPendingReminder(args: {
  admin: SupabaseClient
  referenceId: string
  referenceTitle: string
  companyId: string
  companyName: string
  requesterId: string | null
  coordinatorEmail: string | null
  daysWaiting: number
}): Promise<boolean> {
  const context: ReferenceNotifyContext = {
    referenceId: args.referenceId,
    referenceTitle: args.referenceTitle,
    companyId: args.companyId,
    companyName: args.companyName,
    requesterId: args.requesterId,
    coordinatorEmail: args.coordinatorEmail,
  }

  return notify({
    admin: args.admin,
    context,
    badge: `Erinnerung · ${args.daysWaiting} Tage`,
    subject: `Erinnerung: Kundenfreigabe ausstehend – ${context.referenceTitle} (${context.companyName})`,
    bodyHtml: `<p style="margin:0 0 16px;">Seit <strong>${args.daysWaiting} Tagen</strong> liegt eine Freigabe-Anfrage beim Kunden <strong>ohne Antwort</strong>.</p>
      <p style="margin:0;">Bitte prüfen Sie den Status beim Kunden (Legal/Marketing) und entscheiden Sie, ob Sie nachfassen oder den Freigabe-Link erneuern möchten.</p>`,
    ctaLabel: 'Referenz ansehen',
  })
}
