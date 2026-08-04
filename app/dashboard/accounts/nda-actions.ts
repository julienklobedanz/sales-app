'use server'

import { revalidatePath } from 'next/cache'
import {
  isMissingNdaFileStorageColumn,
  isMissingNdaTitleColumn,
  NDA_AGREEMENT_SELECT_BASE,
  NDA_AGREEMENT_SELECT_LEGACY,
  NDA_AGREEMENT_SELECT_LEGACY_WITH_TITLE,
  NDA_AGREEMENT_SELECT_WITH_TITLE,
  NDA_TITLE_MIGRATION_HINT,
  withNdaFileFieldsNull,
} from '@/lib/accounts/nda-schema'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { profileCanManageOrgData } from '@/lib/roles/profile-guards'

export type NdaAgreementRow = {
  id: string
  company_id: string
  title: string | null
  status: 'active' | 'expired' | 'pending'
  valid_until: string | null
  notes: string | null
  file_storage_path: string | null
  file_name: string | null
  document_version: string | null
  signed_at: string | null
  created_at: string
  updated_at: string
}

const NDA_BUCKET = 'nda-documents'

type NdaAuth =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
      orgId: string
      canManage: boolean
    }

async function getNdaAuth(): Promise<NdaAuth> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return { error: 'Onboarding unvollständig.' }

  const { systemRole, functionRole } = parseProfileRoles(profile)
  return {
    supabase,
    orgId: profile.organization_id,
    canManage: profileCanManageOrgData(systemRole, functionRole),
  }
}

async function assertCompanyInOrg(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  companyId: string,
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!data) return { ok: false, error: 'Firma nicht gefunden.' }
  return { ok: true }
}

export async function getNdaAgreementsByCompanyId(
  companyId: string,
): Promise<
  { success: true; rows: NdaAgreementRow[] } | { success: false; error: string }
> {
  const auth = await getNdaAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const companyCheck = await assertCompanyInOrg(auth.supabase, companyId, auth.orgId)
  if (!companyCheck.ok) return { success: false, error: companyCheck.error }

  const { data, error: initialError } = await auth.supabase
    .from('nda_agreements')
    .select(NDA_AGREEMENT_SELECT_WITH_TITLE)
    .eq('company_id', companyId)
    .eq('organization_id', auth.orgId)
    .order('created_at', { ascending: false })

  let error = initialError

  if (error && isMissingNdaTitleColumn(error.message)) {
    const fallback = await auth.supabase
      .from('nda_agreements')
      .select(NDA_AGREEMENT_SELECT_BASE)
      .eq('company_id', companyId)
      .eq('organization_id', auth.orgId)
      .order('created_at', { ascending: false })
    if (fallback.error) {
      error = fallback.error
    } else {
      const rows = (fallback.data ?? []).map((row) => ({
        ...(row as Omit<NdaAgreementRow, 'title'>),
        title: null,
      }))
      return { success: true, rows: rows as NdaAgreementRow[] }
    }
  }

  if (error && isMissingNdaFileStorageColumn(error.message)) {
    const legacyWithTitle = await auth.supabase
      .from('nda_agreements')
      .select(NDA_AGREEMENT_SELECT_LEGACY_WITH_TITLE)
      .eq('company_id', companyId)
      .eq('organization_id', auth.orgId)
      .order('created_at', { ascending: false })

    const legacyRes =
      legacyWithTitle.error && isMissingNdaTitleColumn(legacyWithTitle.error.message)
        ? await auth.supabase
            .from('nda_agreements')
            .select(NDA_AGREEMENT_SELECT_LEGACY)
            .eq('company_id', companyId)
            .eq('organization_id', auth.orgId)
            .order('created_at', { ascending: false })
        : legacyWithTitle

    if (legacyRes.error) {
      error = legacyRes.error
    } else {
      const rows = (legacyRes.data ?? []).map((row) =>
        withNdaFileFieldsNull({
          ...(row as Record<string, unknown>),
          title: (row as { title?: string | null }).title ?? null,
        }),
      )
      return { success: true, rows: rows as NdaAgreementRow[] }
    }
  }

  if (error) {
    if ((error.message ?? '').includes('nda_agreements')) {
      return { success: true, rows: [] }
    }
    return { success: false, error: error.message }
  }

  const rows = (data ?? []).map((row) => ({
    ...(row as Omit<NdaAgreementRow, 'title'>),
    title: (row as { title?: string | null }).title ?? null,
  }))

  return { success: true, rows: rows as NdaAgreementRow[] }
}

export async function createNdaAgreement(payload: {
  companyId: string
  title?: string | null
  status: 'active' | 'expired' | 'pending'
  validUntil: string | null
  unlimited: boolean
  notes?: string | null
}): Promise<
  | { success: true; id: string; titlePersisted: boolean }
  | { success: false; error: string }
> {
  const auth = await getNdaAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.canManage) return { success: false, error: 'Keine Berechtigung.' }

  const companyCheck = await assertCompanyInOrg(
    auth.supabase,
    payload.companyId,
    auth.orgId,
  )
  if (!companyCheck.ok) return { success: false, error: companyCheck.error }

  const baseRow = {
    organization_id: auth.orgId,
    company_id: payload.companyId,
    status: payload.status,
    valid_until: payload.unlimited ? null : payload.validUntil,
    notes: payload.notes?.trim() || null,
  }

  const titleValue = payload.title?.trim() || null

  let { data, error } = await auth.supabase
    .from('nda_agreements')
    .insert({ ...baseRow, title: titleValue })
    .select('id')
    .single()

  let titlePersisted = true

  if (error && isMissingNdaTitleColumn(error.message)) {
    titlePersisted = false
    const fallback = await auth.supabase
      .from('nda_agreements')
      .insert(baseRow)
      .select('id')
      .single()
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    if (isMissingNdaTitleColumn(error.message)) {
      return { success: false, error: NDA_TITLE_MIGRATION_HINT }
    }
    return { success: false, error: error.message }
  }

  revalidatePath(ROUTES.accounts)
  revalidatePath(ROUTES.accountsDetail(payload.companyId))
  return { success: true, id: data!.id, titlePersisted }
}

export async function deleteNdaAgreement(
  ndaId: string,
  companyId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await getNdaAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.canManage) return { success: false, error: 'Keine Berechtigung.' }

  const { data: row } = await auth.supabase
    .from('nda_agreements')
    .select('file_storage_path')
    .eq('id', ndaId)
    .eq('company_id', companyId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (row?.file_storage_path) {
    await auth.supabase.storage.from(NDA_BUCKET).remove([row.file_storage_path])
  }

  const { error } = await auth.supabase
    .from('nda_agreements')
    .delete()
    .eq('id', ndaId)
    .eq('company_id', companyId)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.accounts)
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true }
}

export async function uploadNdaAgreementPdf(
  ndaId: string,
  companyId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const auth = await getNdaAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.canManage) return { success: false, error: 'Keine Berechtigung.' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Keine PDF-Datei ausgewählt.' }
  }
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { success: false, error: 'Nur PDF-Dateien sind erlaubt.' }
  }

  const documentVersion = String(formData.get('document_version') ?? '').trim() || null
  const signedAtRaw = String(formData.get('signed_at') ?? '').trim()
  const signedAt = signedAtRaw || null

  const { data: existing } = await auth.supabase
    .from('nda_agreements')
    .select('id, file_storage_path')
    .eq('id', ndaId)
    .eq('company_id', companyId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (!existing) return { success: false, error: 'NDA nicht gefunden.' }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'nda.pdf'
  const storagePath = `${auth.orgId}/${companyId}/${ndaId}/${Date.now()}-${safeName}`

  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await auth.supabase.storage
    .from(NDA_BUCKET)
    .upload(storagePath, bytes, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) return { success: false, error: uploadError.message }

  if (existing.file_storage_path && existing.file_storage_path !== storagePath) {
    await auth.supabase.storage.from(NDA_BUCKET).remove([existing.file_storage_path])
  }

  const { error: updateError } = await auth.supabase
    .from('nda_agreements')
    .update({
      file_storage_path: storagePath,
      file_name: safeName,
      document_version: documentVersion,
      signed_at: signedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ndaId)

  if (updateError) {
    await auth.supabase.storage.from(NDA_BUCKET).remove([storagePath])
    return { success: false, error: updateError.message }
  }

  revalidatePath(ROUTES.accounts)
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true }
}

export async function getNdaAgreementDownloadUrl(
  ndaId: string,
  companyId: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const auth = await getNdaAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { data: row } = await auth.supabase
    .from('nda_agreements')
    .select('file_storage_path, file_name')
    .eq('id', ndaId)
    .eq('company_id', companyId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (!row?.file_storage_path) {
    return { success: false, error: 'Kein Dokument hochgeladen.' }
  }

  const { data, error } = await auth.supabase.storage
    .from(NDA_BUCKET)
    .createSignedUrl(row.file_storage_path, 120)

  if (error || !data?.signedUrl) {
    return { success: false, error: error?.message ?? 'Download fehlgeschlagen.' }
  }

  return { success: true, url: data.signedUrl }
}
