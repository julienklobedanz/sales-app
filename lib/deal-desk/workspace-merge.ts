import type { BidTeamAssignment, DealDeskRedFlag } from '@/lib/deal-desk/deal-analysis-types'
import {
  parseSmeAssignments,
  type DealDeskSmeAssignment,
  type SmeExpertOption,
} from '@/lib/deal-desk/sme-routing'
import type { DealDeskWorkspaceState } from '@/lib/deal-desk/workspace-state'

export type NormalizedWorkspaceOverlay = {
  redFlags?: DealDeskRedFlag[]
  smeRoutes?: Record<string, string>
  smeAssignments?: Record<string, DealDeskSmeAssignment>
  decision?: 'go' | 'no-bid' | null
  bidTeam?: BidTeamAssignment[]
}

export function mergeWorkspaceWithNormalizedOverlay(
  workspace: DealDeskWorkspaceState,
  overlay: NormalizedWorkspaceOverlay | null,
  smeCustomExperts: SmeExpertOption[],
): DealDeskWorkspaceState {
  if (!overlay) return workspace

  const smeAssignments = overlay.smeAssignments
    ? { ...workspace.smeAssignments, ...overlay.smeAssignments }
    : workspace.smeAssignments

  return {
    redFlags: overlay.redFlags?.length ? overlay.redFlags : workspace.redFlags,
    smeRoutes: overlay.smeRoutes
      ? { ...workspace.smeRoutes, ...overlay.smeRoutes }
      : workspace.smeRoutes,
    smeAssignments: parseSmeAssignments(
      smeAssignments,
      overlay.smeRoutes ?? workspace.smeRoutes,
    ),
    smeCustomExperts,
    decision: overlay.decision ?? workspace.decision,
    bidTeam: overlay.bidTeam?.length ? overlay.bidTeam : workspace.bidTeam,
  }
}

export function bidDecisionFromDb(
  value: string | null | undefined,
): 'go' | 'no-bid' | null {
  if (value === 'go') return 'go'
  if (value === 'no_bid') return 'no-bid'
  return null
}

export function bidDecisionToDb(value: 'go' | 'no-bid' | null): string | null {
  if (value === 'go') return 'go'
  if (value === 'no-bid') return 'no_bid'
  return null
}
