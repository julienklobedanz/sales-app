import type { BidTeamAssignment, DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import { DEFAULT_BID_TEAM } from '@/lib/deal-desk/mock-analysis'

export type DealDeskWorkspaceState = {
  redFlags: DealDeskRedFlag[]
  smeRoutes: Record<string, string>
  decision: 'go' | 'no-bid' | null
  bidTeam: BidTeamAssignment[]
}

export function defaultWorkspaceState(
  redFlags: DealDeskRedFlag[] = []
): DealDeskWorkspaceState {
  return {
    redFlags: redFlags.map((f) => ({ ...f })),
    smeRoutes: {},
    decision: null,
    bidTeam: DEFAULT_BID_TEAM.map((b) => ({ ...b })),
  }
}

export function parseWorkspaceState(raw: unknown, fallbackRedFlags: DealDeskRedFlag[] = []): DealDeskWorkspaceState {
  if (!raw || typeof raw !== 'object') {
    return defaultWorkspaceState(fallbackRedFlags)
  }
  const o = raw as Record<string, unknown>
  const redFlags = Array.isArray(o.redFlags) ? (o.redFlags as DealDeskRedFlag[]) : fallbackRedFlags
  const smeRoutes =
    o.smeRoutes && typeof o.smeRoutes === 'object' && !Array.isArray(o.smeRoutes)
      ? (o.smeRoutes as Record<string, string>)
      : {}
  const decision =
    o.decision === 'go' || o.decision === 'no-bid' ? o.decision : null
  const bidTeamRaw = Array.isArray(o.bidTeam) ? (o.bidTeam as BidTeamAssignment[]) : []
  const bidTeam = bidTeamRaw.length > 0 ? bidTeamRaw : DEFAULT_BID_TEAM
  return {
    redFlags: redFlags.map((f) => ({ ...f })),
    smeRoutes: { ...smeRoutes },
    decision,
    bidTeam: bidTeam.map((b) => ({ ...b })),
  }
}
