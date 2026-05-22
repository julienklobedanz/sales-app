import type { DealDeskMockAnalysis, DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import { DEFAULT_BID_TEAM, type BidTeamAssignment } from '@/lib/deal-desk/mock-analysis'

export type DealDeskProject = {
  id: string
  projectName: string
  analysis: DealDeskMockAnalysis
  redFlags: DealDeskRedFlag[]
  smeRoutes: Record<string, string>
  decision: 'go' | 'no-bid' | null
  bidTeam: BidTeamAssignment[]
}

export function stripFileExtension(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return base || 'Neues Projekt'
}

export function defaultProjectNameFromFiles(fileNames: string[]): string {
  if (fileNames.length === 0) return 'Neues Projekt'
  if (fileNames.length === 1) return stripFileExtension(fileNames[0]!)
  return stripFileExtension(fileNames[0]!)
}

export function createDealDeskProject(fileNames: string[], analysis: DealDeskMockAnalysis): DealDeskProject {
  return {
    id: crypto.randomUUID(),
    projectName: defaultProjectNameFromFiles(fileNames),
    analysis,
    redFlags: analysis.redFlags.map((f) => ({ ...f })),
    smeRoutes: {},
    decision: null,
    bidTeam: DEFAULT_BID_TEAM.map((b) => ({ ...b })),
  }
}
