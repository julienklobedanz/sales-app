'use server'

import { revalidatePath } from 'next/cache'

import { logDealDeskAudit } from '@/lib/deal-desk/deal-desk-audit'
import {
  DEMO_SEED_FILE_NAMES,
  DEMO_SEED_PROJECT_NAME,
  seedDealDeskDemoProject,
} from '@/lib/deal-desk/demo-seed'
import type { DealDeskProject, DealDeskProjectOwner } from '@/lib/deal-desk/deal-desk-project'
import {
  projectToWorkspaceState,
  rowToDealDeskProject,
  type DealDeskDocumentRow,
  type DealDeskProjectRow,
} from '@/lib/deal-desk/project-mapper'
import { buildReferencePrefillFromAnalysis } from '@/lib/deal-desk/build-harvest-from-snapshot'
import type { DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import {
  collectLegalAttachmentDocuments,
  enrichRedFlagsWithDocuments,
} from '@/lib/deal-desk/red-flag-document-match'
import { sendLegalRedFlagsEmail } from '@/lib/deal-desk/send-legal-red-flags-email'
import {
  loadNormalizedWorkspaceOverlaysBatch,
  loadNormalizedWorkspaceOverlay,
  persistNormalizedWorkspace,
} from '@/lib/deal-desk/workspace-persistence'
import { asJson, asTableInsert, asTableUpdate } from '@/lib/supabase/db-types'
import { looseSelect } from '@/lib/supabase/loose-select'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { profileCanManageOrgData } from '@/lib/roles/profile-guards'
import { parseProfileRoles } from '@/lib/roles/profile-roles'

const DESK_PATH = ROUTES.dealDesk

const DEAL_DESK_PROJECT_SELECT_WITH_ARCHIVE =
  'id, organization_id, project_name, customer_name, analysis_status, analysis_snapshot, analysis_source, win_probability, error_message, deal_id, archived_at, created_by, created_at, updated_at'

const DEAL_DESK_PROJECT_SELECT_LEGACY =
  'id, organization_id, project_name, customer_name, analysis_status, analysis_snapshot, analysis_source, win_probability, error_message, deal_id, created_by, created_at, updated_at'

function isMissingArchivedColumnError(message: string | undefined): boolean {
  return Boolean(message && /archived_at/i.test(message))
}

async function fetchDealDeskProjectRows(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgId: string,
  opts?: { dealId?: string }
): Promise<
  | { rows: DealDeskProjectRow[]; error: null }
  | { rows: null; error: string }
> {
  const withArchiveQuery = supabase
    .from('deal_desk_projects')
    .select(looseSelect(DEAL_DESK_PROJECT_SELECT_WITH_ARCHIVE))
    .eq('organization_id', orgId)
  const withArchive = await (opts?.dealId
    ? withArchiveQuery.eq('deal_id', opts.dealId)
    : withArchiveQuery
  ).order('created_at', { ascending: false })

  if (!withArchive.error) {
    return { rows: (withArchive.data ?? []) as unknown as DealDeskProjectRow[], error: null }
  }

  if (!isMissingArchivedColumnError(withArchive.error.message)) {
    return { rows: null, error: withArchive.error.message }
  }

  const legacyQuery = supabase
    .from('deal_desk_projects')
    .select(looseSelect(DEAL_DESK_PROJECT_SELECT_LEGACY))
    .eq('organization_id', orgId)
  const legacy = await (opts?.dealId
    ? legacyQuery.eq('deal_id', opts.dealId)
    : legacyQuery
  ).order('created_at', { ascending: false })

  if (legacy.error) {
    return { rows: null, error: legacy.error.message }
  }

  const rows = (legacy.data ?? []).map((row) => ({
    ...(row as unknown as Omit<DealDeskProjectRow, 'archived_at'>),
    archived_at: null,
    created_by: (row as { created_by?: string | null }).created_by ?? null,
  })) as DealDeskProjectRow[]

  return { rows, error: null }
}

async function fetchDealDeskProjectRow(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  projectId: string,
  orgId: string
): Promise<
  | { row: DealDeskProjectRow; error: null }
  | { row: null; error: string }
> {
  const withArchive = await supabase
    .from('deal_desk_projects')
    .select(looseSelect(DEAL_DESK_PROJECT_SELECT_WITH_ARCHIVE))
    .eq('id', projectId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!withArchive.error && withArchive.data) {
    return { row: withArchive.data as unknown as DealDeskProjectRow, error: null }
  }

  if (withArchive.error && !isMissingArchivedColumnError(withArchive.error.message)) {
    return { row: null, error: withArchive.error.message }
  }

  const legacy = await supabase
    .from('deal_desk_projects')
    .select(looseSelect(DEAL_DESK_PROJECT_SELECT_LEGACY))
    .eq('id', projectId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (legacy.error) return { row: null, error: legacy.error.message }
  if (!legacy.data) return { row: null, error: 'Projekt nicht gefunden.' }

  return {
    row: {
      ...(legacy.data as unknown as Omit<DealDeskProjectRow, 'archived_at'>),
      archived_at: null,
      created_by: (legacy.data as { created_by?: string | null }).created_by ?? null,
    },
    error: null,
  }
}

async function loadProjectOwnersByUserIds(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userIds: string[]
): Promise<Map<string, DealDeskProjectOwner>> {
  const unique = [...new Set(userIds.filter((id) => typeof id === 'string' && id.length > 0))]
  const map = new Map<string, DealDeskProjectOwner>()
  if (unique.length === 0) return map

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', unique)

  if (error) return map

  for (const row of data ?? []) {
    const id = row.id as string
    const fullName = String((row as { full_name?: string | null }).full_name ?? '').trim()
    const avatarRaw = (row as { avatar_url?: string | null }).avatar_url
    const avatarUrl =
      typeof avatarRaw === 'string' && avatarRaw.trim().length > 0 ? avatarRaw.trim() : null
    map.set(id, {
      userId: id,
      fullName: fullName || 'Unbekannt',
      avatarUrl,
    })
  }

  return map
}

type DeskAuth =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
      user: { id: string }
      orgId: string
      systemRole: ReturnType<typeof parseProfileRoles>['systemRole']
      functionRole: ReturnType<typeof parseProfileRoles>['functionRole']
      fullName: string | null
      email: string | null
    }

async function getDeskAuth(): Promise<DeskAuth> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { error: 'Profil konnte nicht geladen werden.' }
  }

  if (!profile?.organization_id) {
    return {
      error:
        'Onboarding unvollständig — bitte zuerst Ihre Organisation im Onboarding abschließen.',
    }
  }

  const { systemRole, functionRole } = parseProfileRoles(profile)

  return {
    supabase,
    user,
    orgId: profile.organization_id as string,
    systemRole,
    functionRole,
    fullName: (profile.full_name as string) ?? null,
    email: user.email ?? null,
  }
}

async function loadProjectDocuments(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  projectId: string,
  orgId: string
): Promise<DealDeskDocumentRow[]> {
  const { data } = await supabase
    .from('deal_desk_documents')
    .select('id, project_id, file_name, storage_path, mime_type, size_bytes, extract_status, sort_order')
    .eq('project_id', projectId)
    .eq('organization_id', orgId)
    .order('sort_order', { ascending: true })

  return (data ?? []) as DealDeskDocumentRow[]
}

function shouldAutoSeed(): boolean {
  return process.env.DEAL_DESK_AUTO_SEED === 'true' || process.env.DEAL_DESK_AUTO_SEED === '1'
}

export async function listDealDeskProjects(): Promise<
  { success: true; projects: DealDeskProject[] } | { success: false; error: string }
> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { supabase, orgId, user } = auth

  let fetched = await fetchDealDeskProjectRows(supabase, orgId)
  if (fetched.error || !fetched.rows) return { success: false, error: fetched.error ?? 'Projekte konnten nicht geladen werden.' }
  let rows = fetched.rows

  if (rows.length === 0 && shouldAutoSeed()) {
    const seeded = await seedDealDeskDemoProject(supabase, orgId, user.id)
    if ('projectId' in seeded) {
      fetched = await fetchDealDeskProjectRows(supabase, orgId)
      if (fetched.error || !fetched.rows) {
        return { success: false, error: fetched.error ?? 'Projekte konnten nicht geladen werden.' }
      }
      rows = fetched.rows
    }
  }

  const ownerIds = rows.map((r) => r.created_by).filter((id): id is string => Boolean(id))
  const ownersByUserId = await loadProjectOwnersByUserIds(supabase, ownerIds)
  const projectIds = rows.map((r) => r.id)
  const overlays = await loadNormalizedWorkspaceOverlaysBatch(supabase, projectIds, orgId)

  const projects: DealDeskProject[] = []
  for (const row of rows) {
    const docs = await loadProjectDocuments(supabase, row.id, orgId)
    projects.push(rowToDealDeskProject(row, docs, ownersByUserId, overlays.get(row.id) ?? null))
  }

  return { success: true, projects }
}

export async function listDealDeskProjectsByDealId(
  dealId: string
): Promise<{ success: true; projects: DealDeskProject[] } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { supabase, orgId } = auth
  const fetched = await fetchDealDeskProjectRows(supabase, orgId, { dealId })
  if (fetched.error || !fetched.rows) {
    return { success: false, error: fetched.error ?? 'Projekte konnten nicht geladen werden.' }
  }

  const ownerIds = fetched.rows.map((r) => r.created_by).filter((id): id is string => Boolean(id))
  const ownersByUserId = await loadProjectOwnersByUserIds(supabase, ownerIds)
  const projectIds = fetched.rows.map((r) => r.id)
  const overlays = await loadNormalizedWorkspaceOverlaysBatch(supabase, projectIds, orgId)

  const projects: DealDeskProject[] = []
  for (const row of fetched.rows) {
    const docs = await loadProjectDocuments(supabase, row.id, orgId)
    projects.push(rowToDealDeskProject(row, docs, ownersByUserId, overlays.get(row.id) ?? null))
  }

  return { success: true, projects }
}

export async function getDealDeskProject(
  projectId: string
): Promise<{ success: true; project: DealDeskProject } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { supabase, orgId } = auth

  const fetched = await fetchDealDeskProjectRow(supabase, projectId, orgId)
  if (fetched.error || !fetched.row) {
    return { success: false, error: fetched.error ?? 'Projekt nicht gefunden.' }
  }

  const docs = await loadProjectDocuments(supabase, projectId, orgId)
  const ownersByUserId = await loadProjectOwnersByUserIds(
    supabase,
    fetched.row.created_by ? [fetched.row.created_by] : []
  )
  const overlay = await loadNormalizedWorkspaceOverlay(supabase, projectId, orgId)
  return {
    success: true,
    project: rowToDealDeskProject(fetched.row, docs, ownersByUserId, overlay),
  }
}

export async function createDealDeskProjectAction(input: {
  projectName: string
  fileNames: string[]
  dealId?: string
}): Promise<{ success: true; projectId: string } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { supabase, orgId, user } = auth

  const insertPayload: Record<string, unknown> = {
    organization_id: orgId,
    created_by: user.id,
    project_name: input.projectName.trim() || 'Neues Projekt',
    analysis_status: 'pending',
  }
  if (input.dealId) {
    insertPayload.deal_id = input.dealId
  }

  const { data, error } = await supabase
    .from('deal_desk_projects')
    .insert(asTableInsert<'deal_desk_projects'>(insertPayload))
    .select('id')
    .single()

  if (error || !data?.id) {
    return { success: false, error: error?.message ?? 'Projekt konnte nicht angelegt werden.' }
  }

  revalidatePath(DESK_PATH)
  return { success: true, projectId: data.id as string }
}

export async function updateDealDeskProjectAction(
  projectId: string,
  patch: {
    projectName?: string
    workspaceState?: ReturnType<typeof projectToWorkspaceState>
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { supabase, orgId } = auth

  const update: Record<string, unknown> = {}
  if (patch.projectName != null) update.project_name = patch.projectName.trim()

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from('deal_desk_projects')
      .update(update)
      .eq('id', projectId)
      .eq('organization_id', orgId)

    if (error) return { success: false, error: error.message }
  }

  if (patch.workspaceState != null) {
    await persistNormalizedWorkspace(supabase, projectId, orgId, {
      redFlags: patch.workspaceState.redFlags,
      smeRoutes: patch.workspaceState.smeRoutes,
      smeAssignments: patch.workspaceState.smeAssignments,
      smeCustomExperts: patch.workspaceState.smeCustomExperts,
      decision: patch.workspaceState.decision,
      bidTeam: patch.workspaceState.bidTeam,
    })
  }

  return { success: true }
}

export async function setDealDeskProjectArchivedAction(
  projectId: string,
  archived: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { supabase, orgId } = auth

  const { error } = await supabase
    .from('deal_desk_projects')
    .update(
      asTableUpdate<'deal_desk_projects'>({
        archived_at: archived ? new Date().toISOString() : null,
      })
    )
    .eq('id', projectId)
    .eq('organization_id', orgId)

  if (error) {
    if (isMissingArchivedColumnError(error.message)) {
      return {
        success: false,
        error:
          'Archiv-Funktion benötigt ein Datenbank-Update. Bitte Migration ausführen: supabase db push',
      }
    }
    return { success: false, error: error.message }
  }
  revalidatePath(DESK_PATH)
  return { success: true }
}

export async function deleteDealDeskProjectAction(
  projectId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { supabase, orgId } = auth

  const docs = await loadProjectDocuments(supabase, projectId, orgId)
  const paths = docs.map((d) => d.storage_path).filter(Boolean) as string[]
  if (paths.length > 0) {
    await supabase.storage.from('rfp-documents').remove(paths)
  }

  const { error } = await supabase
    .from('deal_desk_projects')
    .delete()
    .eq('id', projectId)
    .eq('organization_id', orgId)

  if (error) return { success: false, error: error.message }
  revalidatePath(DESK_PATH)
  return { success: true }
}

export async function removeDealDeskDocumentAction(
  projectId: string,
  fileName: string
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { supabase, orgId } = auth

  const { data: doc } = await supabase
    .from('deal_desk_documents')
    .select('id, storage_path')
    .eq('project_id', projectId)
    .eq('organization_id', orgId)
    .eq('file_name', fileName)
    .maybeSingle()

  if (!doc) return { success: false, error: 'Dokument nicht gefunden.' }

  if (doc.storage_path) {
    await supabase.storage.from('rfp-documents').remove([doc.storage_path as string])
  }

  await supabase.from('deal_desk_documents').delete().eq('id', doc.id)

  const { data: project } = await supabase
    .from('deal_desk_projects')
    .select('analysis_snapshot')
    .eq('id', projectId)
    .single()

  if (project?.analysis_snapshot && typeof project.analysis_snapshot === 'object') {
    const snap = { ...(project.analysis_snapshot as Record<string, unknown>) }
    const names = Array.isArray(snap.documentNames)
      ? (snap.documentNames as string[]).filter((n) => n !== fileName)
      : []
    snap.documentNames = names
    snap.documentName = names[0] ?? 'RFP-Paket'
    await supabase
      .from('deal_desk_projects')
      .update({ analysis_snapshot: asJson(snap) })
      .eq('id', projectId)
  }

  revalidatePath(DESK_PATH)
  return { success: true }
}

export async function logDealDeskGoAction(
  projectId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  await logDealDeskAudit(auth.supabase, {
    orgId: auth.orgId,
    userId: auth.user.id,
    action: 'deal_desk_go',
    entityId: projectId,
  })
  return { success: true }
}

export async function logDealDeskNoBidAction(
  projectId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  await logDealDeskAudit(auth.supabase, {
    orgId: auth.orgId,
    userId: auth.user.id,
    action: 'deal_desk_no_bid',
    entityId: projectId,
  })
  return { success: true }
}

export async function sendDealDeskRedFlagsToLegalAction(
  projectId: string,
  details: {
    legalEmail: string
    flags: Array<{
      id: string
      severity: string
      title: string
      excerpt: string
      pageHint?: string
      sourceFileName?: string | null
      sourceDocumentId?: string | null
      markedForLegal?: boolean
    }>
  }
): Promise<
  | { success: true; attachedCount: number }
  | { success: false; error: string }
> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const legalEmail = details.legalEmail.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legalEmail)) {
    return { success: false, error: 'Ungültige E-Mail-Adresse.' }
  }

  const marked = details.flags.filter((f) => f.markedForLegal)
  if (marked.length === 0) {
    return { success: false, error: 'Keine markierten Red Flags.' }
  }

  const projectFetch = await fetchDealDeskProjectRow(auth.supabase, projectId, auth.orgId)
  if (projectFetch.error || !projectFetch.row) {
    return { success: false, error: projectFetch.error ?? 'Projekt nicht gefunden.' }
  }

  const documents = await loadProjectDocuments(auth.supabase, projectId, auth.orgId)
  const project = rowToDealDeskProject(projectFetch.row, documents)

  const markedEnriched = enrichRedFlagsWithDocuments(
    marked as DealDeskRedFlag[],
    documents
  )

  const attachmentDocs = collectLegalAttachmentDocuments(markedEnriched, documents)

  const sendResult = await sendLegalRedFlagsEmail({
    legalEmail,
    projectName: project.projectName,
    customerName: project.analysis.customerName,
    senderName: auth.fullName ?? auth.email,
    flags: markedEnriched,
    documents: attachmentDocs,
  })

  if (!sendResult.success) {
    return { success: false, error: sendResult.error }
  }

  await logDealDeskAudit(auth.supabase, {
    orgId: auth.orgId,
    userId: auth.user.id,
    action: 'deal_desk_legal_send',
    entityId: projectId,
    details: {
      flag_count: marked.length,
      flag_ids: marked.map((f) => f.id),
      legal_email: legalEmail,
      attachments_count: sendResult.attachedCount,
    },
  })

  return { success: true, attachedCount: sendResult.attachedCount }
}

/** @deprecated Nutze sendDealDeskRedFlagsToLegalAction */
export async function logDealDeskLegalSendAction(
  projectId: string,
  details: { flagIds: string[]; emailDomain?: string }
): Promise<{ success: true } | { success: false; error: string }> {
  return { success: false, error: 'Bitte sendDealDeskRedFlagsToLegalAction verwenden.' }
}

export async function logDealDeskSmeRouteAction(
  projectId: string,
  details: {
    taskId: string
    route: string
    assigneeId?: string
    assigneeName?: string
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  await logDealDeskAudit(auth.supabase, {
    orgId: auth.orgId,
    userId: auth.user.id,
    action: 'deal_desk_sme_route',
    entityId: projectId,
    details: {
      task_id: details.taskId,
      route: details.route,
      ...(details.assigneeId ? { assignee_id: details.assigneeId } : {}),
      ...(details.assigneeName ? { assignee_name: details.assigneeName } : {}),
    },
  })
  return { success: true }
}

export type DealDeskBidTeamMember = {
  id: string
  name: string
  email: string | null
}

export async function listDealDeskBidTeamMembers(): Promise<
  { success: true; members: DealDeskBidTeamMember[] } | { success: false; error: string }
> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { supabase, orgId, user, fullName, email } = auth

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('organization_id', orgId)
    .order('full_name', { ascending: true })
    .limit(40)

  const members: DealDeskBidTeamMember[] = [
    {
      id: user.id,
      name: fullName?.trim() || 'Du (aktueller Nutzer)',
      email: email,
    },
  ]

  for (const p of profiles ?? []) {
    if (p.id === user.id) continue
    members.push({
      id: p.id as string,
      name: (p.full_name as string)?.trim() || 'Teammitglied',
      email: null,
    })
  }

  return { success: true, members }
}

export async function createDraftReferenceFromDeskProject(
  projectId: string
): Promise<{ success: true; referenceId: string } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const loaded = await getDealDeskProject(projectId)
  if (!loaded.success) return loaded

  const project = loaded.project
  const prefill = buildReferencePrefillFromAnalysis(project.analysis, project.projectName)

  const { supabase, orgId } = auth

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      organization_id: orgId,
      name: project.analysis.customerName,
      industry: prefill.industry,
    })
    .select('id')
    .maybeSingle()

  let companyId = company?.id as string | undefined
  if (companyError?.code === '23505' || !companyId) {
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('organization_id', orgId)
      .ilike('name', project.analysis.customerName)
      .maybeSingle()
    companyId = existing?.id as string | undefined
  }

  if (!companyId) {
    return { success: false, error: companyError?.message ?? 'Firma konnte nicht angelegt werden.' }
  }

  const { data: reference, error: refError } = await supabase
    .from('references')
    .insert({
      company_id: companyId,
      title: prefill.title,
      summary: prefill.summary,
      industry: prefill.industry,
      customer_challenge: prefill.customer_challenge,
      our_solution: prefill.our_solution,
      status: 'draft',
      project_status: 'completed',
      is_nda_deal: false,
    })
    .select('id')
    .single()

  if (refError || !reference?.id) {
    return { success: false, error: refError?.message ?? 'Referenz-Entwurf fehlgeschlagen.' }
  }

  await logDealDeskAudit(supabase, {
    orgId: auth.orgId,
    userId: auth.user.id,
    action: 'deal_desk_incubator_draft',
    entityId: projectId,
    details: { reference_id: reference.id },
  })

  revalidatePath(ROUTES.evidence.root)
  return { success: true, referenceId: reference.id as string }
}

export async function resetDealDeskDemoForOrg(): Promise<
  { success: true } | { success: false; error: string }
> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  if (!profileCanManageOrgData(auth.systemRole, auth.functionRole)) {
    return { success: false, error: 'Nur Admin oder Account Manager.' }
  }

  const { supabase, orgId, user } = auth

  const { data: projects } = await supabase
    .from('deal_desk_projects')
    .select('id')
    .eq('organization_id', orgId)

  for (const p of projects ?? []) {
    await deleteDealDeskProjectAction(p.id as string)
  }

  await seedDealDeskDemoProject(supabase, orgId, user.id)
  revalidatePath(DESK_PATH)
  return { success: true }
}

export async function runDealDeskDemoAnalyzeAction(): Promise<
  { success: true; projectId: string } | { success: false; error: string }
> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const created = await createDealDeskProjectAction({
    projectName: DEMO_SEED_PROJECT_NAME.replace(/\.pdf$/i, ''),
    fileNames: DEMO_SEED_FILE_NAMES,
  })
  if (!created.success) return created

  const { buildDemoDealDeskAnalysis } = await import('@/lib/deal-desk/mock-analysis')
  const { defaultWorkspaceState } = await import('@/lib/deal-desk/workspace-state')
  const analysis = buildDemoDealDeskAnalysis(DEMO_SEED_FILE_NAMES)
  const workspace = defaultWorkspaceState(analysis.redFlags, { useDemoBidTeam: true })

  await auth.supabase
    .from('deal_desk_projects')
    .update({
      analysis_status: 'completed',
      analysis_snapshot: analysis,
      analysis_source: 'mock',
      win_probability: analysis.winProbability,
      customer_name: analysis.customerName,
    })
    .eq('id', created.projectId)

  await persistNormalizedWorkspace(auth.supabase, created.projectId, auth.orgId, workspace)

  return { success: true, projectId: created.projectId }
}
