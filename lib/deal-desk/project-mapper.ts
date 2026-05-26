import type { DealDeskMockAnalysis } from '@/lib/deal-desk/mock-analysis'
import { buildMockDealDeskAnalysis } from '@/lib/deal-desk/mock-analysis'
import type { DealDeskProject } from '@/lib/deal-desk/deal-desk-project'
import { parseWorkspaceState } from '@/lib/deal-desk/workspace-state'

export type DealDeskAnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type DealDeskProjectRow = {
  id: string
  organization_id: string
  project_name: string
  customer_name: string | null
  analysis_status: DealDeskAnalysisStatus
  analysis_snapshot: unknown
  analysis_source: string | null
  workspace_state: unknown
  win_probability: number | null
  error_message: string | null
  deal_id: string | null
  created_at: string
  updated_at: string
}

export type DealDeskDocumentRow = {
  id: string
  project_id: string
  file_name: string
  storage_path: string | null
  mime_type: string | null
  size_bytes: number | null
  extract_status: string
  sort_order: number
}

function parseAnalysisSnapshot(
  raw: unknown,
  documentNames: string[],
  customerName: string | null,
  winProbability: number | null
): DealDeskMockAnalysis {
  if (raw && typeof raw === 'object' && 'documentNames' in (raw as object)) {
    const partial = raw as Partial<DealDeskMockAnalysis>
    const fallback = buildMockDealDeskAnalysis(
      partial.documentNames?.length ? partial.documentNames : documentNames.length > 0 ? documentNames : ['RFP-Paket']
    )
    return {
      ...fallback,
      ...partial,
      documentNames:
        partial.documentNames?.length ? partial.documentNames : fallback.documentNames,
      draftRows: Array.isArray(partial.draftRows) ? partial.draftRows : fallback.draftRows,
      smeTasks: Array.isArray(partial.smeTasks) ? partial.smeTasks : fallback.smeTasks,
      redFlags: Array.isArray(partial.redFlags) ? partial.redFlags : fallback.redFlags,
      winProbability:
        typeof partial.winProbability === 'number' ? partial.winProbability : fallback.winProbability,
      customerName: partial.customerName ?? customerName ?? fallback.customerName,
      icpFitLabel: partial.icpFitLabel ?? fallback.icpFitLabel,
      icpSummary: partial.icpSummary ?? fallback.icpSummary,
    }
  }
  if (documentNames.length > 0) {
    const mock = buildMockDealDeskAnalysis(documentNames)
    if (customerName) mock.customerName = customerName
    if (winProbability != null) mock.winProbability = winProbability
    return mock
  }
  return buildMockDealDeskAnalysis(['RFP-Paket'])
}

export function rowToDealDeskProject(
  row: DealDeskProjectRow,
  documents: DealDeskDocumentRow[] = []
): DealDeskProject {
  const documentNames =
    documents.length > 0
      ? documents.sort((a, b) => a.sort_order - b.sort_order).map((d) => d.file_name)
      : parseAnalysisSnapshot(row.analysis_snapshot, [], row.customer_name, row.win_probability)
          .documentNames

  const analysis = parseAnalysisSnapshot(
    row.analysis_snapshot,
    documentNames,
    row.customer_name,
    row.win_probability
  )

  if (row.win_probability != null) {
    analysis.winProbability = row.win_probability
  }

  const workspace = parseWorkspaceState(row.workspace_state, analysis.redFlags)

  return {
    id: row.id,
    projectName: row.project_name,
    analysis,
    redFlags: workspace.redFlags,
    smeRoutes: workspace.smeRoutes,
    decision: workspace.decision,
    bidTeam: workspace.bidTeam,
    analysisStatus: row.analysis_status,
    analysisSource: row.analysis_source,
    errorMessage: row.error_message,
    showDemoBadge: row.analysis_status !== 'completed' || row.analysis_source === 'mock',
  }
}

export function projectToWorkspaceState(project: DealDeskProject) {
  return {
    redFlags: project.redFlags,
    smeRoutes: project.smeRoutes,
    decision: project.decision,
    bidTeam: project.bidTeam,
  }
}
