import type { DealDeskMockAnalysis } from '@/lib/deal-desk/mock-analysis'
import { normalizeExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import {
  buildDemoDealDeskAnalysis,
  buildMockDealDeskAnalysis,
  DEMO_SAMPLE_RED_FLAGS,
} from '@/lib/deal-desk/mock-analysis'
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
  archived_at: string | null
  created_at: string
  updated_at: string
}

/** Keine rohen API-Fehler in der UI (z. B. dauerhaft gespeichertes OpenAI-429). */
function sanitizeProjectErrorMessage(
  status: DealDeskAnalysisStatus,
  message: string | null
): string | null {
  if (!message || status !== 'failed') return message
  const lower = message.toLowerCase()
  if (
    lower.includes('openai (429)') ||
    lower.includes('openai (402)') ||
    lower.includes('insufficient_quota') ||
    lower.includes('exceeded your current quota') ||
    lower.includes('billing') ||
    lower.startsWith('openai (')
  ) {
    return null
  }
  return message
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
      timelineItems:
        Array.isArray(partial.timelineItems) && partial.timelineItems.length > 0
          ? partial.timelineItems
          : fallback.timelineItems,
      redFlags:
        Array.isArray(partial.redFlags) && partial.redFlags.length > 0
          ? partial.redFlags
          : fallback.redFlags,
      winProbability:
        typeof partial.winProbability === 'number' ? partial.winProbability : fallback.winProbability,
      customerName: partial.customerName ?? customerName ?? fallback.customerName,
      icpFitLabel: partial.icpFitLabel ?? fallback.icpFitLabel,
      icpSummary: partial.icpSummary ?? fallback.icpSummary,
      executiveBriefing: partial.executiveBriefing
        ? normalizeExecutiveBriefingFields(partial.executiveBriefing)
        : fallback.executiveBriefing,
    }
  }
  if (documentNames.length > 0) {
    const mock = buildDemoDealDeskAnalysis(documentNames)
    if (customerName) mock.customerName = customerName
    if (winProbability != null) mock.winProbability = winProbability
    return mock
  }
  return buildDemoDealDeskAnalysis(['RFP-Paket'])
}

/** Kein echtes API-Ergebnis → Demo-Daten (Mock, Quota-Fallback, fehlgeschlagene Analyse). */
function isDealDeskDemoRow(row: DealDeskProjectRow): boolean {
  return row.analysis_source !== 'api'
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

  const isDemo = isDealDeskDemoRow(row)
  const demoFlags = DEMO_SAMPLE_RED_FLAGS.map((f) => ({ ...f }))

  if (isDemo) {
    analysis.redFlags =
      analysis.redFlags.length > 0
        ? analysis.redFlags
        : demoFlags
  }

  const workspace = parseWorkspaceState(
    row.workspace_state,
    isDemo ? demoFlags : analysis.redFlags
  )

  let redFlags = workspace.redFlags
  if (redFlags.length === 0 && isDemo) {
    redFlags = demoFlags
  }

  return {
    id: row.id,
    projectName: row.project_name,
    archivedAt: row.archived_at ?? null,
    analysis,
    redFlags,
    smeRoutes: workspace.smeRoutes,
    smeAssignments: workspace.smeAssignments,
    smeCustomExperts: workspace.smeCustomExperts,
    decision: workspace.decision,
    bidTeam: workspace.bidTeam,
    analysisStatus: row.analysis_status,
    analysisSource: row.analysis_source,
    errorMessage: sanitizeProjectErrorMessage(row.analysis_status, row.error_message),
    showDemoBadge: isDemo,
  }
}

export function projectToWorkspaceState(project: DealDeskProject) {
  return {
    redFlags: project.redFlags,
    smeRoutes: project.smeRoutes,
    smeAssignments: project.smeAssignments,
    smeCustomExperts: project.smeCustomExperts,
    decision: project.decision,
    bidTeam: project.bidTeam,
  }
}
