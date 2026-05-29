import type { DealDeskMockAnalysis, DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import { DEFAULT_BID_TEAM, type BidTeamAssignment } from '@/lib/deal-desk/mock-analysis'
import {
  DEMO_SME_PREVIEW_ASSIGNMENT,
  type DealDeskSmeAssignment,
  type SmeExpertOption,
} from '@/lib/deal-desk/sme-routing'

export type DealDeskAnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type DealDeskProject = {
  id: string
  projectName: string
  archivedAt: string | null
  analysis: DealDeskMockAnalysis
  redFlags: DealDeskRedFlag[]
  smeRoutes: Record<string, string>
  smeAssignments: Record<string, DealDeskSmeAssignment>
  smeCustomExperts: SmeExpertOption[]
  decision: 'go' | 'no-bid' | null
  bidTeam: BidTeamAssignment[]
  analysisStatus: DealDeskAnalysisStatus
  analysisSource: string | null
  errorMessage: string | null
  showDemoBadge: boolean
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

export function createDealDeskProject(
  fileNames: string[],
  analysis: DealDeskMockAnalysis,
  opts?: { id?: string; analysisStatus?: DealDeskAnalysisStatus; analysisSource?: string | null }
): DealDeskProject {
  return {
    id: opts?.id ?? crypto.randomUUID(),
    projectName: defaultProjectNameFromFiles(fileNames),
    archivedAt: null,
    analysis,
    redFlags: analysis.redFlags.map((f) => ({ ...f })),
    smeRoutes:
      opts?.analysisSource === 'mock' ? { 's-1': DEMO_SME_PREVIEW_ASSIGNMENT.route } : {},
    smeAssignments:
      opts?.analysisSource === 'mock' ? { 's-1': { ...DEMO_SME_PREVIEW_ASSIGNMENT } } : {},
    smeCustomExperts: [],
    decision: null,
    bidTeam: DEFAULT_BID_TEAM.map((b) => ({ ...b })),
    analysisStatus: opts?.analysisStatus ?? 'completed',
    analysisSource: opts?.analysisSource ?? 'mock',
    errorMessage: null,
    showDemoBadge: opts?.analysisSource !== 'api',
  }
}
