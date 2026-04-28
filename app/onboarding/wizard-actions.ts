'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { extractDataFromDocument } from '@/lib/document-extraction'
import { inviteByEmail } from '@/app/dashboard/settings/invite-actions'
import type { ExtractedReferenceData } from '@/app/dashboard/evidence/new/types'
import {
  attachOriginalDocumentToReference,
  createReference,
} from '@/app/dashboard/evidence/new/actions'

export type FinalizeWorkspaceResult =
  | { success: true }
  | { success: false; error: string }

export async function finalizeWorkspaceAndProfile(params: {
  inviteToken: string | null
  organizationName: string
  logoDataUrl: string | null
  role: 'sales' | 'account_manager' | 'admin' | null
}): Promise<FinalizeWorkspaceResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const tokenFromCookie = (await cookies()).get('invite_token')?.value?.trim() || null
  const inviteToken = params.inviteToken?.trim() || tokenFromCookie

  // Invite: Organisation und Rolle aus Token (Rolle wird bei E-Mail-Einladung gesetzt)
  let organizationId: string | null = null
  let joinedViaInvite = false
  let inviteRole: 'sales' | 'account_manager' | 'admin' = 'sales'
  if (inviteToken) {
    const { data } = await supabase.rpc('get_invite_by_token', { invite_token: inviteToken })
    const parsed = data as { organization_id?: string; role?: string | null } | null
    if (parsed?.organization_id) {
      organizationId = parsed.organization_id
      joinedViaInvite = true
      const r = parsed.role
      if (r === 'admin' || r === 'sales' || r === 'account_manager') {
        inviteRole = r
      }
      ;(await cookies()).set('invite_token', '', { path: '/', maxAge: 0 })
    }
  }

  // Kein Invite: org anlegen
  if (!organizationId) {
    const name = params.organizationName.trim()
    if (!name) return { success: false, error: 'Bitte Arbeitsbereich-Namen eingeben.' }
    const { data: newOrgId, error: orgError } = await supabase.rpc('create_organization', {
      org_name: name,
    })
    if (orgError || !newOrgId) {
      console.error(orgError)
      return { success: false, error: 'Fehler beim Anlegen des Arbeitsbereichs.' }
    }
    organizationId = newOrgId as string

    // Logo direkt in organizations.logo_url (Data URL), wie in Settings-Action
    if (params.logoDataUrl) {
      await supabase
        .from('organizations')
        .update({ logo_url: params.logoDataUrl, updated_at: new Date().toISOString() })
        .eq('id', organizationId)
    }
  }

  const chosenRole =
    params.role === 'admin' || params.role === 'sales' || params.role === 'account_manager'
      ? params.role
      : null

  if (!joinedViaInvite && !chosenRole) {
    return { success: false, error: 'Bitte deine Rolle auswählen.' }
  }

  const upsertPayload: Record<string, unknown> = {
    id: user.id,
    organization_id: organizationId,
    role: joinedViaInvite ? inviteRole : chosenRole,
  }

  const { error } = await supabase.from('profiles').upsert(upsertPayload)
  if (error) return { success: false, error: error.message }

  return { success: true }
}

export type ExtractPreviewResult =
  | { success: true; preview: ExtractedReferenceData }
  | { success: false; error: string }

export async function extractReferencePreview(file: File): Promise<ExtractPreviewResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  try {
    const fd = new FormData()
    fd.set('file', file)
    const extracted = await extractDataFromDocument(fd)
    if (!extracted.success) {
      return { success: false, error: extracted.error ?? 'Extraktion fehlgeschlagen.' }
    }
    return { success: true, preview: extracted.data }
  } catch (e) {
    console.error(e)
    return { success: false, error: 'Extraktion fehlgeschlagen.' }
  }
}

export type SaveOnboardingReferenceResult =
  | { success: true; referenceId: string }
  | { success: false; error: string }

/**
 * Legt die erste Referenz wie im Evidence-„Neu“-Flow an (createReference) und lädt das Originaldokument in den Storage.
 */
export async function saveOnboardingReference(
  file: File,
  data: ExtractedReferenceData
): Promise<SaveOnboardingReferenceResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const title = data.title?.trim() || 'Neue Referenz'
  const companyName =
    data.company_name?.trim() || data.title?.trim() || 'Unbekanntes Unternehmen'

  const fd = new FormData()
  fd.set('companyId', '')
  fd.set('newCompanyName', companyName)
  fd.set('title', title)
  fd.set('summary', data.summary?.trim() || '')
  fd.set('industry', data.industry?.trim() || '')
  fd.set('country', '')
  fd.set('website', '')
  fd.set('tags', (data.tags ?? []).join(','))
  fd.set('customer_challenge', data.customer_challenge?.trim() || '')
  fd.set('our_solution', data.our_solution?.trim() || '')
  fd.set('volume_eur', data.volume_eur?.trim() || '')
  fd.set(
    'employee_count',
    data.employee_count != null && !Number.isNaN(data.employee_count)
      ? String(Math.max(0, Math.trunc(data.employee_count)))
      : ''
  )
  fd.set('contract_type', '')
  fd.set('incumbent_provider', '')
  fd.set('competitors', '')
  fd.set('customer_contact', '')
  fd.set('status', 'draft')
  fd.set('submitMode', 'draft')
  fd.set('nda_deal', '0')

  const created = await createReference(fd)
  if (!created.success) {
    return { success: false, error: created.error }
  }

  const referenceId = created.referenceId

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id as string | undefined
  if (!orgId) {
    return { success: false, error: 'Keine Organisation zugeordnet.' }
  }

  const safeName = (file.name || 'dokument').replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const storagePath = `${orgId}/${referenceId}/${Date.now()}-${safeName}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('references')
    .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' })

  if (uploadError || !uploadData?.path) {
    await supabase.from('references').delete().eq('id', referenceId)
    return {
      success: false,
      error:
        uploadError?.message ??
        'Die Referenz konnte nicht gespeichert werden (Upload fehlgeschlagen). Bitte erneut versuchen.',
    }
  }

  const { data: publicUrlData } = supabase.storage.from('references').getPublicUrl(uploadData.path)
  const originalUrl = publicUrlData?.publicUrl ?? null

  const attach = await attachOriginalDocumentToReference({
    referenceId,
    file_path: uploadData.path,
    original_document_url: originalUrl,
  })

  if (!attach.success) {
    await supabase.from('references').delete().eq('id', referenceId)
    return {
      success: false,
      error: attach.error,
    }
  }

  return { success: true, referenceId }
}

export type SendInvitesResult = { success: true } | { success: false; error: string }

export async function sendTeamInvites(
  invites: Array<{ email: string; role: 'sales' | 'account_manager' | 'admin' }>
): Promise<SendInvitesResult> {
  const unique = invites
    .map((i): { email: string; role: 'admin' | 'sales' } => ({
      email: i.email.trim().toLowerCase(),
      role: i.role === 'admin' ? 'admin' : 'sales',
    }))
    .filter((i) => i.email.length > 0)
    .slice(0, 3)

  for (const inv of unique) {
    const res = await inviteByEmail(inv.email, inv.role)
    if (!res.success) return res
  }
  return { success: true }
}

