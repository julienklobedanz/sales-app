'use server'

import { revalidatePath } from 'next/cache'

import { inferComplianceDocumentTypeFromUpload } from '@/lib/compliance/document-icon'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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

const COMPLIANCE_SELECT =
  'id,organization_id,document_type,title,valid_until,file_storage_path,file_name,is_current,uploaded_by,created_at,updated_at'

type ComplianceAuth =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
      orgId: string
      userId: string
      isAdmin: boolean
    }

async function getComplianceAuth(): Promise<ComplianceAuth> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return { error: 'Onboarding unvollständig.' }

  return {
    supabase,
    orgId: profile.organization_id,
    userId: user.id,
    isAdmin: profile.role === 'admin',
  }
}

export async function listComplianceDocuments(): Promise<
  { success: true; rows: ComplianceDocumentRow[] } | { success: false; error: string }
> {
  const auth = await getComplianceAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { data, error } = await auth.supabase
    .from('organization_compliance_documents')
    .select(COMPLIANCE_SELECT)
    .eq('organization_id', auth.orgId)
    .order('document_type', { ascending: true })
    .order('is_current', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) {
    if ((error.message ?? '').includes('organization_compliance_documents')) {
      return { success: true, rows: [] }
    }
    return { success: false, error: error.message }
  }

  return { success: true, rows: (data ?? []) as ComplianceDocumentRow[] }
}

export async function createComplianceDocument(payload: {
  documentType: string
  title: string
  validUntil?: string | null
  file: { name: string; bytes: ArrayBuffer }
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const auth = await getComplianceAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.isAdmin) return { success: false, error: 'Nur Admins dürfen Compliance-Dokumente verwalten.' }

  const title = payload.title.trim()
  if (!title) return { success: false, error: 'Titel ist erforderlich.' }

  const inferredType = inferComplianceDocumentTypeFromUpload({
    title,
    fileName: payload.file.name,
  })
  const documentType = inferredType ?? payload.documentType

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
  const safeName = payload.file.name.replace(/[^\w.\-()+ ]/g, '_').slice(0, 180) || 'document.pdf'
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
  revalidatePath(ROUTES.evidence.root)
  return { success: true, id: docId }
}

export async function uploadComplianceDocument(
  formData: FormData
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

export async function listCurrentComplianceDocuments(): Promise<
  { success: true; rows: ComplianceDocumentRow[] } | { success: false; error: string }
> {
  const listed = await listComplianceDocuments()
  if (!listed.success) return listed
  return {
    success: true,
    rows: listed.rows.filter((row) => row.is_current),
  }
}

async function createComplianceFileAccessUrls(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  fileStoragePath: string,
  fileName: string | null
): Promise<ComplianceDocumentAccessUrls | null> {
  const downloadName = fileName?.trim() || 'dokument.pdf'
  const [viewRes, downloadRes] = await Promise.all([
    supabase.storage.from(COMPLIANCE_BUCKET).createSignedUrl(fileStoragePath, SIGNED_URL_TTL_SEC),
    supabase.storage
      .from(COMPLIANCE_BUCKET)
      .createSignedUrl(fileStoragePath, SIGNED_URL_TTL_SEC, { download: downloadName }),
  ])

  if (!viewRes.data?.signedUrl || !downloadRes.data?.signedUrl) return null
  return { viewUrl: viewRes.data.signedUrl, downloadUrl: downloadRes.data.signedUrl }
}

export async function getComplianceDocumentAccessUrls(
  documentId: string
): Promise<
  { success: true; urls: ComplianceDocumentAccessUrls } | { success: false; error: string }
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
    return { success: false, error: 'Dokument nicht gefunden oder keine Datei hinterlegt.' }
  }

  const urls = await createComplianceFileAccessUrls(
    auth.supabase,
    data.file_storage_path,
    data.file_name
  )
  if (!urls) {
    return { success: false, error: 'Download-Link konnte nicht erstellt werden.' }
  }

  return { success: true, urls }
}

/** Signierte URLs für viele Dokumente (Prefetch in der Zertifikate-Tabelle). */
export async function prefetchComplianceDocumentUrls(
  documentIds: string[]
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
        row.file_name
      )
      if (urls) urlsById[row.id] = urls
    })
  )

  return { success: true, urlsById }
}

export async function getComplianceDocumentDownloadUrl(
  documentId: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const result = await getComplianceDocumentAccessUrls(documentId)
  if (!result.success) return result
  return { success: true, url: result.urls.downloadUrl }
}

export async function deleteComplianceDocuments(
  documentIds: string[]
): Promise<{ success: true; deleted: number } | { success: false; error: string }> {
  const auth = await getComplianceAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!auth.isAdmin) return { success: false, error: 'Nur Admins dürfen Compliance-Dokumente verwalten.' }

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
      rows.map((row) => row.id)
    )

  if (deleteError) return { success: false, error: deleteError.message }

  revalidatePath(ROUTES.settings)
  revalidatePath(ROUTES.evidence.root)
  return { success: true, deleted: rows.length }
}
