import type { BidTeamAssignment, DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import { DEFAULT_BID_TEAM } from '@/lib/deal-desk/mock-analysis'
import {
  parseSmeAssignments,
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
  opts?: { useDemoBidTeam?: boolean }
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

export function parseWorkspaceState(
  raw: unknown,
  fallbackRedFlags: DealDeskRedFlag[] = [],
  opts?: { useDemoBidTeam?: boolean }
): DealDeskWorkspaceState {
  if (!raw || typeof raw !== 'object') {
    return defaultWorkspaceState(fallbackRedFlags, opts)
  }
  const o = raw as Record<string, unknown>
  const redFlagsRaw = Array.isArray(o.redFlags) ? (o.redFlags as DealDeskRedFlag[]) : []
  const redFlags = redFlagsRaw.length > 0 ? redFlagsRaw : fallbackRedFlags
  const smeRoutes =
    o.smeRoutes && typeof o.smeRoutes === 'object' && !Array.isArray(o.smeRoutes)
      ? (o.smeRoutes as Record<string, string>)
      : {}
  const smeAssignments = parseSmeAssignments(o.smeAssignments, smeRoutes)
  const smeCustomExperts = Array.isArray(o.smeCustomExperts)
    ? (o.smeCustomExperts as SmeExpertOption[]).filter(
        (e) => e && typeof e.id === 'string' && typeof e.name === 'string'
      )
    : []
  const decision =
    o.decision === 'go' || o.decision === 'no-bid' ? o.decision : null
  const bidTeamRaw = Array.isArray(o.bidTeam) ? (o.bidTeam as BidTeamAssignment[]) : []
  const bidTeam =
    bidTeamRaw.length > 0
      ? bidTeamRaw
      : opts?.useDemoBidTeam
        ? DEFAULT_BID_TEAM
        : []
  return {
    redFlags: redFlags.map((f) => ({ ...f })),
    smeRoutes: { ...smeRoutes },
    smeAssignments,
    smeCustomExperts,
    decision,
    bidTeam: bidTeam.map((b) => ({ ...b })),
  }
}
