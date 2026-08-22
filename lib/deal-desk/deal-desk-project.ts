import type { DealDeskMockAnalysis, DealDeskRedFlag } from '@/lib/deal-desk/deal-analysis-types'
import type { BidTeamAssignment } from '@/lib/deal-desk/deal-analysis-types'
import type { DealDeskSmeAssignment, SmeExpertOption } from '@/lib/deal-desk/sme-routing'

export type DealDeskAnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

/** Nutzer, der das RFP-Projekt angelegt / hochgeladen hat (`deal_desk_projects.created_by`). */
export type DealDeskProjectOwner = {
  userId: string
  fullName: string
  avatarUrl: string | null
}

export type DealDeskProject = {
  id: string
  projectName: string
  archivedAt: string | null
  owner: DealDeskProjectOwner | null
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
