'use server'

import { revalidatePath } from 'next/cache'

import { canManageDealDocuments } from '@/lib/deals/can-manage-deal-documents'
import {
  buildDealDocumentStoragePath,
  validateDealDocumentUpload,
} from '@/lib/deals/deal-document-upload'
import {
  isDealDocumentKind,
  type DealDocumentKind,
} from '@/lib/deals/deal-document-kinds'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { ROUTES } from '@/lib/routes'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type DealDocumentRow = {
  id: string
  deal_id: string
  organization_id: string
  file_name: string
  kind: DealDocumentKind
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  uploaded_by: string | null
  uploaded_by_name: string | null
  created_at: string
  updated_at: string
}

const DEAL_DOCUMENTS_BUCKET = 'deal-documents'
const SIGNED_URL_TTL_SEC = 3600

const DEAL_DOCUMENT_SELECT =
  'id, deal_id, organization_id, file_name, kind, storage_path, mime_type, size_bytes, uploaded_by, created_at, updated_at'

type DocumentAuth =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
      orgId: string
      userId: string
      systemRole: ReturnType<typeof parseProfileRoles>['systemRole']
      functionRole: ReturnType<typeof parseProfileRoles>['functionRole']
    }

async function getDocumentAuth(): Promise<DocumentAuth> {
  const user = await getRequestUser()
  if (!user) return { error: 'Nicht eingeloggt.' }

  const profile = await getRequestProfile()
  if (!profile?.organization_id) return { error: 'Onboarding unvollständig.' }

  const { systemRole, functionRole } = parseProfileRoles(profile)
  const supabase = await createServerSupabaseClient()

  return {
    supabase,
    orgId: profile.organization_id,
    userId: user.id,
    systemRole,
    functionRole,
  }
}

type DealAccessRow = {
  id: string
  organization_id: string
  sales_manager_id: string | null
  account_manager_id: string | null
}

async function loadDealForDocuments(
  auth: Extract<DocumentAuth, { orgId: string }>,
  dealId: string,
): Promise<{ deal: DealAccessRow } | { error: string }> {
  const { data: deal, error } = await auth.supabase
    .from('deals')
    .select('id, organization_id, sales_manager_id, account_manager_id')
    .eq('id', dealId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (error || !deal) {
    return { error: 'Deal nicht gefunden.' }
  }

  return { deal: deal as DealAccessRow }
}

async function loadDocumentRow(
  auth: Extract<DocumentAuth, { orgId: string }>,
  documentId: string,
): Promise<{ row: Omit<DealDocumentRow, 'uploaded_by_name'> } | { error: string }> {
  const { data, error } = await auth.supabase
    .from('deal_documents')
    .select(DEAL_DOCUMENT_SELECT)
    .eq('id', documentId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (error || !data) {
    return { error: 'Dokument nicht gefunden.' }
  }

  return { row: data as Omit<DealDocumentRow, 'uploaded_by_name'> }
}

async function attachUploaderNames(
  auth: Extract<DocumentAuth, { orgId: string }>,
  rows: Omit<DealDocumentRow, 'uploaded_by_name'>[],
): Promise<DealDocumentRow[]> {
  const uploaderIds = [
    ...new Set(rows.map((r) => r.uploaded_by).filter(Boolean)),
  ] as string[]
  const names: Record<string, string> = {}

  if (uploaderIds.length > 0) {
    const { data: profiles } = await auth.supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', uploaderIds)

    for (const p of profiles ?? []) {
      names[p.id] = p.full_name?.trim() || p.id.slice(0, 8)
    }
  }

  return rows.map((r) => ({
    ...r,
    uploaded_by_name: r.uploaded_by ? (names[r.uploaded_by] ?? null) : null,
  }))
}

function assertCanManageDeal(
  auth: Extract<DocumentAuth, { userId: string }>,
  deal: DealAccessRow,
): { success: true } | { error: string } {
  if (!canManageDealDocuments(deal, auth.userId, auth.systemRole, auth.functionRole)) {
    return { error: 'Keine Berechtigung, Dokumente an diesem Deal zu verwalten.' }
  }
  return { success: true }
}

function revalidateDealPage(dealId: string) {
  revalidatePath(ROUTES.deals.detail(dealId), 'page')
}

export async function listDealDocuments(
  dealId: string,
): Promise<
  { success: true; rows: DealDocumentRow[] } | { success: false; error: string }
> {
  const auth = await getDocumentAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const dealRes = await loadDealForDocuments(auth, dealId)
  if ('error' in dealRes) return { success: false, error: dealRes.error }

  const { data, error } = await auth.supabase
    .from('deal_documents')
    .select(DEAL_DOCUMENT_SELECT)
    .eq('deal_id', dealId)
    .eq('organization_id', auth.orgId)
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  const rows = await attachUploaderNames(
    auth,
    (data ?? []) as Omit<DealDocumentRow, 'uploaded_by_name'>[],
  )
  return { success: true, rows }
}

export async function uploadDealDocument(
  dealId: string,
  formData: FormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const auth = await getDocumentAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const dealRes = await loadDealForDocuments(auth, dealId)
  if ('error' in dealRes) return { success: false, error: dealRes.error }

  const manage = assertCanManageDeal(auth, dealRes.deal)
  if ('error' in manage) return { success: false, error: manage.error }

  const file = formData.get('file')
  const kindRaw = formData.get('kind')
  const kindStr = typeof kindRaw === 'string' ? kindRaw.trim() : 'sonstiges'
  const kind: DealDocumentKind = isDealDocumentKind(kindStr) ? kindStr : 'sonstiges'

  if (!(file instanceof File) || !file.size) {
    return { success: false, error: 'Keine gültige Datei.' }
  }

  const validation = validateDealDocumentUpload(file, kind)
  if (!validation.success) {
    return { success: false, error: validation.error }
  }

  const docId = crypto.randomUUID()
  const storagePath = buildDealDocumentStoragePath(
    dealRes.deal.organization_id,
    dealId,
    docId,
    file.name,
  )

  const { error: insertError } = await auth.supabase.from('deal_documents').insert({
    id: docId,
    deal_id: dealId,
    organization_id: dealRes.deal.organization_id,
    file_name: file.name.trim() || 'Dokument',
    kind,
    storage_path: storagePath,
    mime_type: file.type || null,
    size_bytes: file.size,
    uploaded_by: auth.userId,
  })

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await auth.supabase.storage
    .from(DEAL_DOCUMENTS_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    await auth.supabase.from('deal_documents').delete().eq('id', docId)
    return { success: false, error: uploadError.message }
  }

  revalidateDealPage(dealId)
  return { success: true, id: docId }
}

export async function renameDealDocument(
  documentId: string,
  fileName: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await getDocumentAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const trimmed = fileName.trim()
  if (!trimmed) return { success: false, error: 'Dateiname ist erforderlich.' }

  const docRes = await loadDocumentRow(auth, documentId)
  if ('error' in docRes) return { success: false, error: docRes.error }

  const dealRes = await loadDealForDocuments(auth, docRes.row.deal_id)
  if ('error' in dealRes) return { success: false, error: dealRes.error }

  const manage = assertCanManageDeal(auth, dealRes.deal)
  if ('error' in manage) return { success: false, error: manage.error }

  const { error } = await auth.supabase
    .from('deal_documents')
    .update({ file_name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  revalidateDealPage(docRes.row.deal_id)
  return { success: true }
}

export async function setDealDocumentKind(
  documentId: string,
  kind: DealDocumentKind,
): Promise<{ success: boolean; error?: string }> {
  const auth = await getDocumentAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  if (!isDealDocumentKind(kind)) {
    return { success: false, error: 'Ungültiger Dokumenttyp.' }
  }

  const docRes = await loadDocumentRow(auth, documentId)
  if ('error' in docRes) return { success: false, error: docRes.error }

  const dealRes = await loadDealForDocuments(auth, docRes.row.deal_id)
  if ('error' in dealRes) return { success: false, error: dealRes.error }

  const manage = assertCanManageDeal(auth, dealRes.deal)
  if ('error' in manage) return { success: false, error: manage.error }

  if (kind === 'ausschreibung' && docRes.row.size_bytes != null) {
    const pseudoFile = {
      name: docRes.row.file_name,
      type: docRes.row.mime_type ?? '',
      size: Number(docRes.row.size_bytes),
    }
    const validation = validateDealDocumentUpload(pseudoFile, kind)
    if (!validation.success) {
      return { success: false, error: validation.error }
    }
  }

  const { error } = await auth.supabase
    .from('deal_documents')
    .update({ kind, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  revalidateDealPage(docRes.row.deal_id)
  return { success: true }
}

export async function deleteDealDocument(
  documentId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await getDocumentAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const docRes = await loadDocumentRow(auth, documentId)
  if ('error' in docRes) return { success: false, error: docRes.error }

  const dealRes = await loadDealForDocuments(auth, docRes.row.deal_id)
  if ('error' in dealRes) return { success: false, error: dealRes.error }

  const manage = assertCanManageDeal(auth, dealRes.deal)
  if ('error' in manage) return { success: false, error: manage.error }

  const { error: storageError } = await auth.supabase.storage
    .from(DEAL_DOCUMENTS_BUCKET)
    .remove([docRes.row.storage_path])

  if (storageError) {
    return { success: false, error: storageError.message }
  }

  const { error } = await auth.supabase
    .from('deal_documents')
    .delete()
    .eq('id', documentId)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  revalidateDealPage(docRes.row.deal_id)
  return { success: true }
}

export async function getDealDocumentSignedUrl(
  documentId: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const auth = await getDocumentAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const docRes = await loadDocumentRow(auth, documentId)
  if ('error' in docRes) return { success: false, error: docRes.error }

  const { data, error } = await auth.supabase.storage
    .from(DEAL_DOCUMENTS_BUCKET)
    .createSignedUrl(docRes.row.storage_path, SIGNED_URL_TTL_SEC, {
      download: docRes.row.file_name,
    })

  if (error || !data?.signedUrl) {
    return {
      success: false,
      error: error?.message ?? 'Download-URL konnte nicht erstellt werden.',
    }
  }

  return { success: true, url: data.signedUrl }
}
