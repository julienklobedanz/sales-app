'use server'

import { revalidatePath } from 'next/cache'

import { getCachedOrgComplianceDocuments } from '@/lib/cache/cached-org-reads'
import { revalidateOrgCompliance } from '@/lib/cache/revalidate-org'
import { inferComplianceDocumentTypeFromUpload } from '@/lib/compliance/document-icon'
import { extractCertificateExpiryFromText } from '@/lib/compliance/extract-certificate-expiry'
import { buildComplianceStorageFileName } from '@/lib/compliance/upload-filename'
import { extractPdfPlainText } from '@/lib/pdf-text-extract'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { isSystemAdmin } from '@/lib/roles/capability-access'

export type ComplianceDocumentRow = {
  id: string
  organization_id: string
  document_type: string
  title: string
  valid_until: string | null
  file_storage_path: string | null
  file_name: string | null
  is_current: boolean
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

const COMPLIANCE_BUCKET = 'compliance-documents'
const SIGNED_URL_TTL_SEC = 3600

export type ComplianceDocumentAccessUrls = {
  viewUrl: string
  downloadUrl: string
}

type ComplianceAuth =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
      orgId: string
      orgName: string
      userId: string
      isAdmin: boolean
    }

async function getComplianceAuth(): Promise<ComplianceAuth> {
  const user = await getRequestUser()
  if (!user) return { error: 'Nicht eingeloggt.' }

  const profile = await getRequestProfile()
  if (!profile?.organization_id) return { error: 'Onboarding unvollständig.' }

  const supabase = await createServerSupabaseClient()
  const { systemRole } = parseProfileRoles(profile)

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .maybeSingle()

  return {
    supabase,
    orgId: profile.organization_id,
    orgName: String(org?.name ?? '').trim() || 'Organisation',
    userId: user.id,
    isAdmin: isSystemAdmin(systemRole),
  }
}

export async function listComplianceDocuments(): Promise<
  { success: true; rows: ComplianceDocumentRow[] } | { success: false; error: string }
> {
  const auth = await getComplianceAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const rows = await getCachedOrgComplianceDocuments(auth.orgId)
  return { success: true, rows }
}

async function createComplianceDocument(payload: {
  documentType: string
  title: string
  validUntil?: string | null
  file: { name: string; bytes: ArrayBuffer }
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const auth = await getComplianceAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.isAdmin)
    return { success: false, error: 'Nur Admins dürfen Compliance-Dokumente verwalten.' }

  const title = payload.title.trim()
  if (!title) return { success: false, error: 'Titel ist erforderlich.' }

  const documentType =
    payload.documentType.trim() ||
    inferComplianceDocumentTypeFromUpload({
      title,
      fileName: payload.file.name,
    }) ||
    'iso_27001'

  const { data: inserted, error: insertError } = await auth.supabase
    .from('organization_compliance_documents')
    .insert({
      organization_id: auth.orgId,
      document_type: documentType,
      title,
      valid_until: payload.validUntil || null,
      is_current: true,
      uploaded_by: auth.userId,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return { success: false, error: insertError?.message ?? 'Speichern fehlgeschlagen.' }
  }

  const docId = String(inserted.id)
  const safeName = buildComplianceStorageFileName({
    organizationName: auth.orgName,
    documentType,
  })
  const path = `${auth.orgId}/${docId}/${safeName}`

  const { error: uploadError } = await auth.supabase.storage
    .from(COMPLIANCE_BUCKET)
    .upload(path, payload.file.bytes, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    await auth.supabase.from('organization_compliance_documents').delete().eq('id', docId)
    return { success: false, error: uploadError.message }
  }

  const { error: updateError } = await auth.supabase
    .from('organization_compliance_documents')
    .update({
      file_storage_path: path,
      file_name: safeName,
    })
    .eq('id', docId)
    .eq('organization_id', auth.orgId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.references.root)
  revalidateOrgCompliance(auth.orgId)
  return { success: true, id: docId }
}

export type ExtractComplianceCertificateMetadataResult =
  | {
      success: true
      validUntil: string | null
      expiryConfidence: 'high' | 'medium' | 'low' | 'none'
      documentType: string | null
    }
  | { success: false; error: string }

function readCompliancePdfUpload(formData: FormData): { file: File } | { error: string } {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'PDF-Datei fehlt.' }
  }
  if (file.size > 20 * 1024 * 1024) {
    return { error: 'PDF ist zu groß (max. 20 MB).' }
  }
  if (file.type && file.type !== 'application/pdf') {
    return { error: 'Nur PDF-Dateien werden unterstützt.' }
  }
  return { file }
}

/** Liest Ablaufdatum und Dokumenttyp aus PDF-Text. */
export async function extractComplianceCertificateMetadataFromPdf(
  formData: FormData,
): Promise<ExtractComplianceCertificateMetadataResult> {
  const auth = await getComplianceAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const upload = readCompliancePdfUpload(formData)
  if ('error' in upload) return { success: false, error: upload.error }

  try {
    const bytes = Buffer.from(await upload.file.arrayBuffer())
    const text = await extractPdfPlainText(bytes)
    const extracted = extractCertificateExpiryFromText(text)
    const documentType = inferComplianceDocumentTypeFromUpload({
      title: '',
      fileName: upload.file.name,
      pdfText: text,
    })
    return {
      success: true,
      validUntil: extracted.validUntil,
      expiryConfidence: extracted.confidence,
      documentType,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: `PDF konnte nicht gelesen werden: ${msg}` }
  }
}

export type UploadComplianceDocumentsBatchResult =
  | { success: true; uploaded: number; errors: string[] }
  | { success: false; error: string }

export async function uploadComplianceDocumentsBatch(
  formData: FormData,
): Promise<UploadComplianceDocumentsBatchResult> {
  const auth = await getComplianceAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.isAdmin) {
    return { success: false, error: 'Nur Admins dürfen Compliance-Dokumente verwalten.' }
  }

  const manifestRaw = formData.get('manifest')
  if (!manifestRaw) return { success: false, error: 'Upload-Liste fehlt.' }

  let manifest: Array<{
    title: string
    documentType: string
    validUntil: string | null
    fileIndex: number
  }>
  try {
    manifest = JSON.parse(String(manifestRaw))
  } catch {
    return { success: false, error: 'Upload-Liste ist ungültig.' }
  }

  if (!Array.isArray(manifest) || manifest.length === 0) {
    return { success: false, error: 'Keine Zertifikate zum Hochladen.' }
  }

  let uploaded = 0
  const errors: string[] = []

  for (const item of manifest) {
    const title = String(item.title ?? '').trim()
    const documentType = String(item.documentType ?? '').trim()
    if (!title) {
      errors.push('Ein Eintrag hat keinen Titel.')
      continue
    }

    const file = formData.get(`file_${item.fileIndex}`)
    if (!(file instanceof File) || file.size === 0) {
      errors.push(`${title}: PDF-Datei fehlt.`)
      continue
    }

    const result = await createComplianceDocument({
      documentType,
      title,
      validUntil: item.validUntil || null,
      file: { name: file.name, bytes: await file.arrayBuffer() },
    })

    if (result.success) {
      uploaded += 1
    } else {
      errors.push(`${title}: ${result.error}`)
    }
  }

  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.references.root)
  revalidateOrgCompliance(auth.orgId)
  return { success: true, uploaded, errors }
}

export async function uploadComplianceDocument(
  formData: FormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'PDF-Datei fehlt.' }
  }
  const documentType = String(formData.get('documentType') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const validUntilRaw = String(formData.get('validUntil') ?? '').trim()
  const bytes = await file.arrayBuffer()

  return createComplianceDocument({
    documentType,
    title,
    validUntil: validUntilRaw || null,
    file: { name: file.name, bytes },
  })
}

async function createComplianceFileAccessUrls(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  fileStoragePath: string,
  fileName: string | null,
): Promise<ComplianceDocumentAccessUrls | null> {
  const downloadName = fileName?.trim() || 'dokument.pdf'
  const [viewRes, downloadRes] = await Promise.all([
    supabase.storage
      .from(COMPLIANCE_BUCKET)
      .createSignedUrl(fileStoragePath, SIGNED_URL_TTL_SEC),
    supabase.storage
      .from(COMPLIANCE_BUCKET)
      .createSignedUrl(fileStoragePath, SIGNED_URL_TTL_SEC, { download: downloadName }),
  ])

  if (!viewRes.data?.signedUrl || !downloadRes.data?.signedUrl) return null
  return { viewUrl: viewRes.data.signedUrl, downloadUrl: downloadRes.data.signedUrl }
}

export async function getComplianceDocumentAccessUrls(
  documentId: string,
): Promise<
  | { success: true; urls: ComplianceDocumentAccessUrls }
  | { success: false; error: string }
> {
  const auth = await getComplianceAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { data, error } = await auth.supabase
    .from('organization_compliance_documents')
    .select('file_storage_path,file_name')
    .eq('id', documentId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (error || !data?.file_storage_path) {
    return {
      success: false,
      error: 'Dokument nicht gefunden oder keine Datei hinterlegt.',
    }
  }

  const urls = await createComplianceFileAccessUrls(
    auth.supabase,
    data.file_storage_path,
    data.file_name,
  )
  if (!urls) {
    return { success: false, error: 'Download-Link konnte nicht erstellt werden.' }
  }

  return { success: true, urls }
}

/** Signierte URLs für viele Dokumente (Prefetch in der Zertifikate-Tabelle). */
export async function prefetchComplianceDocumentUrls(
  documentIds: string[],
): Promise<
  | { success: true; urlsById: Record<string, ComplianceDocumentAccessUrls> }
  | { success: false; error: string }
> {
  const auth = await getComplianceAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const ids = [...new Set(documentIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0) return { success: true, urlsById: {} }

  const { data, error } = await auth.supabase
    .from('organization_compliance_documents')
    .select('id,file_storage_path,file_name')
    .eq('organization_id', auth.orgId)
    .in('id', ids)

  if (error) return { success: false, error: error.message }

  const urlsById: Record<string, ComplianceDocumentAccessUrls> = {}
  await Promise.all(
    (data ?? []).map(async (row) => {
      if (!row.file_storage_path) return
      const urls = await createComplianceFileAccessUrls(
        auth.supabase,
        row.file_storage_path,
        row.file_name,
      )
      if (urls) urlsById[row.id] = urls
    }),
  )

  return { success: true, urlsById }
}

export async function updateComplianceDocument(payload: {
  documentId: string
  title: string
  validUntil?: string | null
}): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getComplianceAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.isAdmin)
    return { success: false, error: 'Nur Admins dürfen Compliance-Dokumente verwalten.' }

  const id = payload.documentId.trim()
  const title = payload.title.trim()
  if (!id) return { success: false, error: 'Dokument-ID fehlt.' }
  if (!title) return { success: false, error: 'Titel ist erforderlich.' }

  const validUntil =
    payload.validUntil === undefined
      ? undefined
      : payload.validUntil && String(payload.validUntil).trim()
        ? String(payload.validUntil).trim()
        : null

  const updatePayload: {
    title: string
    valid_until?: string | null
    updated_at: string
  } = {
    title,
    updated_at: new Date().toISOString(),
  }
  if (validUntil !== undefined) updatePayload.valid_until = validUntil

  const { error } = await auth.supabase
    .from('organization_compliance_documents')
    .update(updatePayload)
    .eq('id', id)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.references.root)
  revalidateOrgCompliance(auth.orgId)
  return { success: true }
}

export async function deleteComplianceDocuments(
  documentIds: string[],
): Promise<{ success: true; deleted: number } | { success: false; error: string }> {
  const auth = await getComplianceAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.isAdmin)
    return { success: false, error: 'Nur Admins dürfen Compliance-Dokumente verwalten.' }

  const ids = [...new Set(documentIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0) return { success: false, error: 'Keine Dokumente ausgewählt.' }

  const { data: rows, error: fetchError } = await auth.supabase
    .from('organization_compliance_documents')
    .select('id,file_storage_path')
    .eq('organization_id', auth.orgId)
    .in('id', ids)

  if (fetchError) return { success: false, error: fetchError.message }
  if (!rows?.length) return { success: false, error: 'Dokumente nicht gefunden.' }

  const storagePaths = rows
    .map((row) => row.file_storage_path)
    .filter((path): path is string => Boolean(path))

  if (storagePaths.length > 0) {
    const { error: storageError } = await auth.supabase.storage
      .from(COMPLIANCE_BUCKET)
      .remove(storagePaths)
    if (storageError) return { success: false, error: storageError.message }
  }

  const { error: deleteError } = await auth.supabase
    .from('organization_compliance_documents')
    .delete()
    .eq('organization_id', auth.orgId)
    .in(
      'id',
      rows.map((row) => row.id),
    )

  if (deleteError) return { success: false, error: deleteError.message }

  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.references.root)
  revalidateOrgCompliance(auth.orgId)
  return { success: true, deleted: rows.length }
}
