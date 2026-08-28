'use server'

import {
  canManageDealDocuments,
  canManageTenderDocuments,
} from '@/lib/deals/can-manage-deal-documents'
import {
  buildDealDocumentStoragePath,
  validateDealDocumentUpload,
} from '@/lib/deals/deal-document-upload'
import {
  isDealDocumentKind,
  type DealDocumentKind,
} from '@/lib/deals/deal-document-kinds'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { revalidateDealWorkspacePaths } from '@/lib/deals/revalidate-deal-workspace-paths'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidateTenderSurfaces } from '@/lib/tenders/revalidate-tender-surfaces'

export type DealDocumentRow = {
  id: string
  deal_id: string | null
  tender_id: string | null
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
  'id, deal_id, tender_id, organization_id, file_name, kind, storage_path, mime_type, size_bytes, uploaded_by, created_at, updated_at'

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
  tender_id: string | null
  sales_manager_id: string | null
  account_manager_id: string | null
}

async function loadDealForDocuments(
  auth: Extract<DocumentAuth, { orgId: string }>,
  dealId: string,
): Promise<{ deal: DealAccessRow } | { error: string }> {
  const { data: deal, error } = await auth.supabase
    .from('deals')
    .select('id, organization_id, tender_id, sales_manager_id, account_manager_id')
    .eq('id', dealId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (error || !deal) {
    return { error: 'Deal nicht gefunden.' }
  }

  return { deal: deal as DealAccessRow }
}

async function loadTenderLotsForDocuments(
  auth: Extract<DocumentAuth, { orgId: string }>,
  tenderId: string,
): Promise<{ lots: DealAccessRow[] } | { error: string }> {
  const { data: tender, error: tenderError } = await auth.supabase
    .from('tenders')
    .select('id')
    .eq('id', tenderId)
    .eq('organization_id', auth.orgId)
    .maybeSingle()

  if (tenderError || !tender) {
    return { error: 'Ausschreibung nicht gefunden.' }
  }

  const { data: lots, error } = await auth.supabase
    .from('deals')
    .select('id, organization_id, tender_id, sales_manager_id, account_manager_id')
    .eq('tender_id', tenderId)
    .eq('organization_id', auth.orgId)

  if (error) return { error: error.message }
  return { lots: (lots ?? []) as DealAccessRow[] }
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

function assertCanManageTender(
  auth: Extract<DocumentAuth, { userId: string }>,
  lots: DealAccessRow[],
): { success: true } | { error: string } {
  if (!canManageTenderDocuments(lots, auth.userId, auth.systemRole, auth.functionRole)) {
    return {
      error: 'Keine Berechtigung, Dokumente an dieser Ausschreibung zu verwalten.',
    }
  }
  return { success: true }
}

async function assertCanMutateDocument(
  auth: Extract<DocumentAuth, { orgId: string; userId: string }>,
  row: Pick<DealDocumentRow, 'deal_id' | 'tender_id'>,
): Promise<{ success: true } | { error: string }> {
  if (row.deal_id) {
    const dealRes = await loadDealForDocuments(auth, row.deal_id)
    if ('error' in dealRes) return dealRes
    return assertCanManageDeal(auth, dealRes.deal)
  }
  if (row.tender_id) {
    const tenderRes = await loadTenderLotsForDocuments(auth, row.tender_id)
    if ('error' in tenderRes) return tenderRes
    return assertCanManageTender(auth, tenderRes.lots)
  }
  return { error: 'Dokument ohne Eigentümer.' }
}

async function revalidateDocumentOwners(
  auth: Extract<DocumentAuth, { orgId: string }>,
  args: { dealId?: string | null; tenderId?: string | null },
) {
  if (args.dealId) revalidateDealWorkspacePaths(args.dealId, 'dokumente')
  if (args.tenderId) {
    await revalidateTenderSurfaces(auth.supabase, {
      organizationId: auth.orgId,
      tenderId: args.tenderId,
      extraDealId: args.dealId ?? undefined,
    })
  }
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

export async function listTenderDocuments(
  tenderId: string,
): Promise<
  { success: true; rows: DealDocumentRow[] } | { success: false; error: string }
> {
  const auth = await getDocumentAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const tenderRes = await loadTenderLotsForDocuments(auth, tenderId)
  if ('error' in tenderRes) return { success: false, error: tenderRes.error }

  const { data, error } = await auth.supabase
    .from('deal_documents')
    .select(DEAL_DOCUMENT_SELECT)
    .eq('tender_id', tenderId)
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

  return insertAndUploadDocument(auth, formData, {
    kind: 'deal',
    id: dealId,
    organizationId: dealRes.deal.organization_id,
  })
}

export async function uploadTenderDocument(
  tenderId: string,
  formData: FormData,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const auth = await getDocumentAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const tenderRes = await loadTenderLotsForDocuments(auth, tenderId)
  if ('error' in tenderRes) return { success: false, error: tenderRes.error }

  const manage = assertCanManageTender(auth, tenderRes.lots)
  if ('error' in manage) return { success: false, error: manage.error }

  return insertAndUploadDocument(auth, formData, {
    kind: 'tender',
    id: tenderId,
    organizationId: auth.orgId,
  })
}

async function insertAndUploadDocument(
  auth: Extract<DocumentAuth, { orgId: string; userId: string }>,
  formData: FormData,
  owner: { kind: 'deal' | 'tender'; id: string; organizationId: string },
): Promise<{ success: true; id: string } | { success: false; error: string }> {
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
    owner.organizationId,
    { kind: owner.kind, id: owner.id },
    docId,
    file.name,
  )

  const { error: insertError } = await auth.supabase.from('deal_documents').insert({
    id: docId,
    deal_id: owner.kind === 'deal' ? owner.id : null,
    tender_id: owner.kind === 'tender' ? owner.id : null,
    organization_id: owner.organizationId,
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

  await revalidateDocumentOwners(auth, {
    dealId: owner.kind === 'deal' ? owner.id : null,
    tenderId: owner.kind === 'tender' ? owner.id : null,
  })
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

  const manage = await assertCanMutateDocument(auth, docRes.row)
  if ('error' in manage) return { success: false, error: manage.error }

  const { error } = await auth.supabase
    .from('deal_documents')
    .update({ file_name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  await revalidateDocumentOwners(auth, {
    dealId: docRes.row.deal_id,
    tenderId: docRes.row.tender_id,
  })
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

  const manage = await assertCanMutateDocument(auth, docRes.row)
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

  await revalidateDocumentOwners(auth, {
    dealId: docRes.row.deal_id,
    tenderId: docRes.row.tender_id,
  })
  return { success: true }
}

export async function deleteDealDocument(
  documentId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await getDocumentAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const docRes = await loadDocumentRow(auth, documentId)
  if ('error' in docRes) return { success: false, error: docRes.error }

  const manage = await assertCanMutateDocument(auth, docRes.row)
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

  await revalidateDocumentOwners(auth, {
    dealId: docRes.row.deal_id,
    tenderId: docRes.row.tender_id,
  })
  return { success: true }
}

/**
 * storage_path is the bucket object key, not a folder.
 * Owner change must not rewrite it — a file under deals/… stays there as a
 * tender document.
 */
export async function assignDealDocumentToTender(
  documentId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await getDocumentAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const docRes = await loadDocumentRow(auth, documentId)
  if ('error' in docRes) return { success: false, error: docRes.error }
  if (!docRes.row.deal_id) {
    return { success: false, error: 'Dokument gehört keinem Los.' }
  }

  const dealRes = await loadDealForDocuments(auth, docRes.row.deal_id)
  if ('error' in dealRes) return { success: false, error: dealRes.error }

  const manage = assertCanManageDeal(auth, dealRes.deal)
  if ('error' in manage) return { success: false, error: manage.error }

  const tenderId = dealRes.deal.tender_id
  if (!tenderId) {
    return { success: false, error: 'Los hängt an keiner Ausschreibung.' }
  }

  const { error } = await auth.supabase
    .from('deal_documents')
    .update({
      deal_id: null,
      tender_id: tenderId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  await revalidateDocumentOwners(auth, { dealId: dealRes.deal.id, tenderId })
  return { success: true }
}

/**
 * storage_path is the bucket object key, not a folder.
 * Owner change must not rewrite it — a file under tenders/… stays there as a
 * lot document.
 */
export async function assignTenderDocumentToDeal(
  documentId: string,
  dealId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await getDocumentAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const docRes = await loadDocumentRow(auth, documentId)
  if ('error' in docRes) return { success: false, error: docRes.error }
  if (!docRes.row.tender_id) {
    return { success: false, error: 'Dokument gehört keiner Ausschreibung.' }
  }

  const tenderId = docRes.row.tender_id
  const tenderRes = await loadTenderLotsForDocuments(auth, tenderId)
  if ('error' in tenderRes) return { success: false, error: tenderRes.error }

  const manage = assertCanManageTender(auth, tenderRes.lots)
  if ('error' in manage) return { success: false, error: manage.error }

  const dealRes = await loadDealForDocuments(auth, dealId)
  if ('error' in dealRes) return { success: false, error: dealRes.error }
  if (dealRes.deal.tender_id !== tenderId) {
    return { success: false, error: 'Los gehört nicht zu dieser Ausschreibung.' }
  }

  const { error } = await auth.supabase
    .from('deal_documents')
    .update({
      deal_id: dealId,
      tender_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  await revalidateDocumentOwners(auth, { dealId, tenderId })
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
