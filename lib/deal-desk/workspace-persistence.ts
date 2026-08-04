import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { BidTeamAssignment, DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import type { DealDeskSmeAssignment } from '@/lib/deal-desk/sme-routing'
import type { DealDeskWorkspaceState } from '@/lib/deal-desk/workspace-state'
import {
  bidDecisionFromDb,
  bidDecisionToDb,
  type NormalizedWorkspaceOverlay,
} from '@/lib/deal-desk/workspace-merge'
import { log } from '@/lib/observability/logger'

function isProfileUuid(value: string | null | undefined): value is string {
  if (!value?.trim()) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  )
}

export type { NormalizedWorkspaceOverlay } from '@/lib/deal-desk/workspace-merge'

function isMissingNormalizedTableError(message: string | undefined): boolean {
  return Boolean(
    message &&
    (/deal_desk_sme_routes|deal_desk_bid_team|deal_desk_red_flags|bid_decision/i.test(
      message,
    ) ||
      message.includes('does not exist')),
  )
}

export async function loadNormalizedWorkspaceOverlaysBatch(
  supabase: SupabaseClient,
  projectIds: string[],
  organizationId: string,
): Promise<Map<string, NormalizedWorkspaceOverlay>> {
  const map = new Map<string, NormalizedWorkspaceOverlay>()
  if (projectIds.length === 0) return map

  const [projectsRes, smeRes, bidRes, flagsRes] = await Promise.all([
    supabase
      .from('deal_desk_projects')
      .select('id, bid_decision')
      .in('id', projectIds)
      .eq('organization_id', organizationId),
    supabase
      .from('deal_desk_sme_routes')
      .select('project_id, requirement_key, assignee_profile_id')
      .in('project_id', projectIds)
      .eq('organization_id', organizationId),
    supabase
      .from('deal_desk_bid_team')
      .select('project_id, profile_id, email, role')
      .in('project_id', projectIds)
      .eq('organization_id', organizationId),
    supabase
      .from('deal_desk_red_flags')
      .select('project_id, id, flag_key, label, severity, sent_to_legal')
      .in('project_id', projectIds)
      .eq('organization_id', organizationId),
  ])

  if (
    [projectsRes.error, smeRes.error, bidRes.error, flagsRes.error].some(
      (e) => e && !isMissingNormalizedTableError(e.message),
    )
  ) {
    return map
  }

  for (const row of projectsRes.data ?? []) {
    const id = String((row as { id: string }).id)
    const decision = bidDecisionFromDb(
      (row as { bid_decision?: string | null }).bid_decision,
    )
    if (decision) map.set(id, { ...(map.get(id) ?? {}), decision })
  }

  for (const row of flagsRes.data ?? []) {
    const projectId = String((row as { project_id: string }).project_id)
    const cur = map.get(projectId) ?? {}
    const flags = cur.redFlags ?? []
    flags.push({
      id: String((row as { flag_key?: string | null }).flag_key ?? row.id),
      severity: ((row as { severity?: string }).severity ??
        'medium') as DealDeskRedFlag['severity'],
      title: String((row as { label?: string }).label ?? 'Red Flag'),
      excerpt: '',
      markedForLegal: Boolean((row as { sent_to_legal?: boolean }).sent_to_legal),
    })
    map.set(projectId, { ...cur, redFlags: flags })
  }

  for (const row of smeRes.data ?? []) {
    const projectId = String((row as { project_id: string }).project_id)
    const cur = map.get(projectId) ?? {}
    const key = String((row as { requirement_key: string }).requirement_key)
    const profileId = (row as { assignee_profile_id?: string | null }).assignee_profile_id
    const smeRoutes = { ...(cur.smeRoutes ?? {}), [key]: 'routed' }
    const smeAssignments: Record<string, DealDeskSmeAssignment> = {
      ...(cur.smeAssignments ?? {}),
    }
    if (profileId && isProfileUuid(profileId)) {
      smeAssignments[key] = {
        route: 'routed',
        assigneeId: profileId,
        assigneeName: 'Teammitglied',
      }
    }
    map.set(projectId, { ...cur, smeRoutes, smeAssignments })
  }

  for (const row of bidRes.data ?? []) {
    const projectId = String((row as { project_id: string }).project_id)
    const cur = map.get(projectId) ?? {}
    const team = cur.bidTeam ?? []
    const role = String((row as { role?: string | null }).role ?? `member_${team.length}`)
    const profileId = (row as { profile_id?: string | null }).profile_id
    team.push({
      role: role as BidTeamAssignment['role'],
      label: role,
      assigneeId: profileId && isProfileUuid(profileId) ? profileId : '',
      assigneeName: profileId && isProfileUuid(profileId) ? 'Teammitglied' : '—',
    })
    map.set(projectId, { ...cur, bidTeam: team })
  }

  return map
}

export async function loadNormalizedWorkspaceOverlay(
  supabase: SupabaseClient,
  projectId: string,
  organizationId: string,
): Promise<NormalizedWorkspaceOverlay | null> {
  const batch = await loadNormalizedWorkspaceOverlaysBatch(
    supabase,
    [projectId],
    organizationId,
  )
  return batch.get(projectId) ?? null
}

export async function persistNormalizedWorkspace(
  supabase: SupabaseClient,
  projectId: string,
  organizationId: string,
  workspace: DealDeskWorkspaceState,
): Promise<void> {
  const bidDecision = bidDecisionToDb(workspace.decision)

  const { error: projectError } = await supabase
    .from('deal_desk_projects')
    .update({ bid_decision: bidDecision })
    .eq('id', projectId)
    .eq('organization_id', organizationId)

  if (projectError && !isMissingNormalizedTableError(projectError.message)) {
    log.error(
      'persistNormalizedWorkspace.bidDecisionFailed',
      { projectId, organizationId },
      projectError,
    )
    return
  }

  const tables = [
    'deal_desk_sme_routes',
    'deal_desk_bid_team',
    'deal_desk_red_flags',
  ] as const
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
    if (error && !isMissingNormalizedTableError(error.message)) {
      log.error(
        'persistNormalizedWorkspace.deleteFailed',
        { table, projectId, organizationId },
        error,
      )
      return
    }
  }

  if (workspace.redFlags.length > 0) {
    const { error } = await supabase.from('deal_desk_red_flags').insert(
      workspace.redFlags.map((flag) => ({
        project_id: projectId,
        organization_id: organizationId,
        flag_key: flag.id,
        label: flag.title,
        severity: flag.severity,
        sent_to_legal: Boolean(flag.markedForLegal),
        status: 'open',
      })),
    )
    if (error && !isMissingNormalizedTableError(error.message)) {
      log.error(
        'persistNormalizedWorkspace.redFlagsFailed',
        { projectId, organizationId },
        error,
      )
    }
  }

  const smeKeys = new Set([
    ...Object.keys(workspace.smeRoutes),
    ...Object.keys(workspace.smeAssignments),
  ])
  if (smeKeys.size > 0) {
    const rows = [...smeKeys].map((requirementKey) => {
      const assignment = workspace.smeAssignments[requirementKey]
      return {
        project_id: projectId,
        organization_id: organizationId,
        requirement_key: requirementKey,
        assignee_profile_id: isProfileUuid(assignment?.assigneeId)
          ? assignment!.assigneeId
          : null,
        status: 'open',
      }
    })
    const { error } = await supabase.from('deal_desk_sme_routes').insert(rows)
    if (error && !isMissingNormalizedTableError(error.message)) {
      log.error(
        'persistNormalizedWorkspace.smeRoutesFailed',
        { projectId, organizationId },
        error,
      )
    }
  }

  if (workspace.bidTeam.length > 0) {
    const { error } = await supabase.from('deal_desk_bid_team').insert(
      workspace.bidTeam
        .filter((member) => isProfileUuid(member.assigneeId))
        .map((member) => ({
          project_id: projectId,
          organization_id: organizationId,
          profile_id: member.assigneeId,
          email: null,
          role: member.role,
        })),
    )
    if (error && !isMissingNormalizedTableError(error.message)) {
      log.error(
        'persistNormalizedWorkspace.bidTeamFailed',
        { projectId, organizationId },
        error,
      )
    }
  }
}
