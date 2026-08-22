import type { BidTeamAssignment, DealDeskRedFlag } from '@/lib/deal-desk/deal-analysis-types'
import { DEFAULT_BID_TEAM } from '@/lib/deal-desk/deal-analysis-types'
import {
  type DealDeskSmeAssignment,
  type SmeExpertOption,
} from '@/lib/deal-desk/sme-routing'

export type DealDeskWorkspaceState = {
  redFlags: DealDeskRedFlag[]
  smeRoutes: Record<string, string>
  smeAssignments: Record<string, DealDeskSmeAssignment>
  smeCustomExperts: SmeExpertOption[]
  decision: 'go' | 'no-bid' | null
  bidTeam: BidTeamAssignment[]
}

export function defaultWorkspaceState(
  redFlags: DealDeskRedFlag[] = [],
  opts?: { useDemoBidTeam?: boolean },
): DealDeskWorkspaceState {
  return {
    redFlags: redFlags.map((f) => ({ ...f })),
    smeRoutes: {},
    smeAssignments: {},
    smeCustomExperts: [],
    decision: null,
    bidTeam: opts?.useDemoBidTeam ? DEFAULT_BID_TEAM.map((b) => ({ ...b })) : [],
  }
}
