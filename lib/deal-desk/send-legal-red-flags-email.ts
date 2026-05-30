import 'server-only'

import { Resend } from 'resend'

import type { DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import type { DealDeskDocumentRef } from '@/lib/deal-desk/red-flag-document-match'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const RFP_BUCKET = 'rfp-documents'
const MAX_ATTACHMENTS = 8
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

function getResendFrom(): string | null {
  const from = process.env.RESEND_FROM?.trim()
  return from || null
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildLegalEmailHtml(params: {
  projectName: string
  customerName: string
  senderName: string | null
  flags: DealDeskRedFlag[]
  attachedFileNames: string[]
  missingAttachments: string[]
}): string {
  const { projectName, customerName, senderName, flags, attachedFileNames, missingAttachments } =
    params

  const flagBlocks = flags
    .map(
      (f) => `
    <li style="margin-bottom:16px;">
      <strong>[${f.severity.toUpperCase()}] ${escapeHtml(f.title)}</strong>
      ${f.sourceFileName ? `<br/><span style="color:#64748b;font-size:12px;">Quelle: ${escapeHtml(f.sourceFileName)}${f.pageHint ? ` · ${escapeHtml(f.pageHint)}` : ''}</span>` : ''}
      <p style="margin:8px 0 0;font-size:14px;line-height:1.5;">${escapeHtml(f.excerpt)}</p>
    </li>`
    )
    .join('')

  const attachmentNote =
    attachedFileNames.length > 0
      ? `<p style="font-size:13px;"><strong>Angehängte Vertrags-/RFP-Dokumente (${attachedFileNames.length}):</strong><br/>${attachedFileNames.map((n) => escapeHtml(n)).join('<br/>')}</p>`
      : `<p style="font-size:13px;color:#b45309;">Es konnten keine Dateien aus dem Projekt-Speicher angehängt werden. Bitte die Red-Flag-Passagen unten und ggf. das Deal-Desk-Projekt prüfen.</p>`

  const missingNote =
    missingAttachments.length > 0
      ? `<p style="font-size:12px;color:#64748b;">Nicht angehängt (zu groß oder nicht ladbar): ${missingAttachments.map(escapeHtml).join(', ')}</p>`
      : ''

  return `
    <div style="font-family:system-ui,sans-serif;color:#0f172a;max-width:640px;">
      <p>Hallo,</p>
      <p>${escapeHtml(senderName ?? 'Ein Kollege')} bittet um Legal-Review für folgende Red Flags im Deal-Desk-Projekt:</p>
      <p><strong>${escapeHtml(projectName)}</strong><br/>Kunde: ${escapeHtml(customerName)}</p>
      ${attachmentNote}
      ${missingNote}
      <ul style="padding-left:18px;">${flagBlocks}</ul>
      <p style="font-size:12px;color:#64748b;">Intern — keine Weitergabe an Dritte ohne Freigabe.</p>
    </div>
  `.trim()
}

export type SendLegalRedFlagsEmailParams = {
  legalEmail: string
  projectName: string
  customerName: string
  senderName: string | null
  flags: DealDeskRedFlag[]
  documents: DealDeskDocumentRef[]
}

export type SendLegalRedFlagsEmailResult =
  | {
      success: true
      attachedCount: number
      usedResend: boolean
    }
  | { success: false; error: string }

export async function sendLegalRedFlagsEmail(
  params: SendLegalRedFlagsEmailParams
): Promise<SendLegalRedFlagsEmailResult> {
  const resend = getResend()
  const from = getResendFrom()
  if (!resend || !from) {
    return {
      success: false,
      error:
        'E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY / RESEND_FROM). Bitte Administrator kontaktieren.',
    }
  }

  const supabase = await createServerSupabaseClient()
  const attachments: { filename: string; content: Buffer }[] = []
  const missingAttachments: string[] = []

  for (const doc of params.documents.slice(0, MAX_ATTACHMENTS)) {
    if (!doc.storage_path) {
      missingAttachments.push(doc.file_name)
      continue
    }
    const { data, error } = await supabase.storage.from(RFP_BUCKET).download(doc.storage_path)
    if (error || !data) {
      missingAttachments.push(doc.file_name)
      continue
    }
    const buffer = Buffer.from(await data.arrayBuffer())
    if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
      missingAttachments.push(`${doc.file_name} (zu groß)`)
      continue
    }
    attachments.push({ filename: doc.file_name, content: buffer })
  }

  const html = buildLegalEmailHtml({
    projectName: params.projectName,
    customerName: params.customerName,
    senderName: params.senderName,
    flags: params.flags,
    attachedFileNames: attachments.map((a) => a.filename),
    missingAttachments,
  })

  const subject = `Legal Review — ${params.projectName} (${params.flags.length} Red Flag${params.flags.length === 1 ? '' : 's'})`

  const { error: sendError } = await resend.emails.send({
    from,
    to: [params.legalEmail],
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  })

  if (sendError) {
    return { success: false, error: sendError.message ?? 'E-Mail konnte nicht gesendet werden.' }
  }

  return {
    success: true,
    attachedCount: attachments.length,
    usedResend: true,
  }
}
