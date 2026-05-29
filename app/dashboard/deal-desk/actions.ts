'use server'

import { revalidatePath } from 'next/cache'

import { logDealDeskAudit } from '@/lib/deal-desk/deal-desk-audit'
import {
  DEMO_SEED_FILE_NAMES,
  DEMO_SEED_PROJECT_NAME,
  seedDealDeskDemoProject,
} from '@/lib/deal-desk/demo-seed'
import type { DealDeskProject } from '@/lib/deal-desk/deal-desk-project'
import {
  projectToWorkspaceState,
  rowToDealDeskProject,
  type DealDeskDocumentRow,
  type DealDeskProjectRow,
} from '@/lib/deal-desk/project-mapper'
import { buildReferencePrefillFromAnalysis } from '@/lib/deal-desk/build-harvest-from-snapshot'
import { defaultWorkspaceState } from '@/lib/deal-desk/workspace-state'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const DESK_PATH = ROUTES.dealDesk

const DEAL_DESK_PROJECT_SELECT_WITH_ARCHIVE =
  'id, organization_id, project_name, customer_name, analysis_status, analysis_snapshot, analysis_source, workspace_state, win_probability, error_message, deal_id, archived_at, created_at, updated_at'

const DEAL_DESK_PROJECT_SELECT_LEGACY =
  'id, organization_id, project_name, customer_name, analysis_status, analysis_snapshot, analysis_source, workspace_state, win_probability, error_message, deal_id, created_at, updated_at'

function isMissingArchivedColumnError(message: string | undefined): boolean {
  return Boolean(message && /archived_at/i.test(message))
}

async function fetchDealDeskProjectRows(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgId: string
): Promise<
  | { rows: DealDeskProjectRow[]; error: null }
  | { rows: null; error: string }
> {
  const withArchive = await supabase
    .from('deal_desk_projects')
    .select(DEAL_DESK_PROJECT_SELECT_WITH_ARCHIVE)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (!withArchive.error) {
    return { rows: (withArchive.data ?? []) as DealDeskProjectRow[], error: null }
  }

  if (!isMissingArchivedColumnError(withArchive.error.message)) {
    return { rows: null, error: withArchive.error.message }
  }

  const legacy = await supabase
    .from('deal_desk_projects')
    .select(DEAL_DESK_PROJECT_SELECT_LEGACY)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (legacy.error) {
    return { rows: null, error: legacy.error.message }
  }

  const rows = (legacy.data ?? []).map((row) => ({
    ...(row as Omit<DealDeskProjectRow, 'archived_at'>),
    archived_at: null,
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
    .select(DEAL_DESK_PROJECT_SELECT_WITH_ARCHIVE)
    .eq('id', projectId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!withArchive.error && withArchive.data) {
    return { row: withArchive.data as DealDeskProjectRow, error: null }
  }

  if (withArchive.error && !isMissingArchivedColumnError(withArchive.error.message)) {
    return { row: null, error: withArchive.error.message }
  }

  const legacy = await supabase
    .from('deal_desk_projects')
    .select(DEAL_DESK_PROJECT_SELECT_LEGACY)
    .eq('id', projectId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (legacy.error) return { row: null, error: legacy.error.message }
  if (!legacy.data) return { row: null, error: 'Projekt nicht gefunden.' }

  return {
    row: { ...(legacy.data as Omit<DealDeskProjectRow, 'archived_at'>), archived_at: null },
    error: null,
  }
}

type DeskAuth =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
      user: { id: string }
      orgId: string
      role: string
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
    .select('organization_id, role, full_name')
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

  return {
    supabase,
    user,
    orgId: profile.organization_id as string,
    role: (profile.role as string) ?? 'sales',
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

  const projects: DealDeskProject[] = []
  for (const row of rows) {
    const docs = await loadProjectDocuments(supabase, row.id, orgId)
    projects.push(rowToDealDeskProject(row, docs))
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
  return { success: true, project: rowToDealDeskProject(fetched.row, docs) }
}

export async function createDealDeskProjectAction(input: {
  projectName: string
  fileNames: string[]
}): Promise<{ success: true; projectId: string } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }

  const { supabase, orgId, user } = auth

  const { data, error } = await supabase
    .from('deal_desk_projects')
    .insert({
      organization_id: orgId,
      created_by: user.id,
      project_name: input.projectName.trim() || 'Neues Projekt',
      analysis_status: 'pending',
      workspace_state: defaultWorkspaceState(),
    })
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
  if (patch.workspaceState != null) update.workspace_state = patch.workspaceState

  const { error } = await supabase
    .from('deal_desk_projects')
    .update(update)
    .eq('id', projectId)
    .eq('organization_id', orgId)

  if (error) return { success: false, error: error.message }
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
    .update({ archived_at: archived ? new Date().toISOString() : null })
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
      .update({ analysis_snapshot: snap })
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

export async function logDealDeskLegalSendAction(
  projectId: string,
  details: { flagIds: string[]; emailDomain?: string }
): Promise<{ success: true } | { success: false; error: string }> {
  const auth = await getDeskAuth()
  if ('error' in auth) return { success: false, error: auth.error }
  const email = details.emailDomain?.trim()
  await logDealDeskAudit(auth.supabase, {
    orgId: auth.orgId,
    userId: auth.user.id,
    action: 'deal_desk_legal_send',
    entityId: projectId,
    details: {
      flag_count: details.flagIds.length,
      flag_ids: details.flagIds,
      ...(email ? { legal_contact_domain: email.split('@')[1] ?? 'unknown' } : {}),
    },
  })
  return { success: true }
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

  if (auth.role !== 'admin' && auth.role !== 'account_manager') {
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
  const workspace = defaultWorkspaceState(analysis.redFlags)

  await auth.supabase
    .from('deal_desk_projects')
    .update({
      analysis_status: 'completed',
      analysis_snapshot: analysis,
      analysis_source: 'mock',
      workspace_state: workspace,
      win_probability: analysis.winProbability,
      customer_name: analysis.customerName,
    })
    .eq('id', created.projectId)

  return { success: true, projectId: created.projectId }
}
