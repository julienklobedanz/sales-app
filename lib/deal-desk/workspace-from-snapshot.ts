import type { DealDeskMockAnalysis } from '@/lib/deal-desk/mock-analysis'
import { defaultWorkspaceState, type DealDeskWorkspaceState } from '@/lib/deal-desk/workspace-state'

/** Workspace für `persistNormalizedWorkspace` aus Analyse-Snapshot (inkl. SME-Routes). */
export function workspaceFromRfpSnapshot(snapshot: DealDeskMockAnalysis): DealDeskWorkspaceState {
  const base = defaultWorkspaceState(snapshot.redFlags)
  const smeRoutes: Record<string, string> = {}
  for (const task of snapshot.smeTasks ?? []) {
    smeRoutes[task.id] = 'open'
  }
  return { ...base, smeRoutes }
}
