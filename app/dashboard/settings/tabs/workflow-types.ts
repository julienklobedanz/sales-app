import type { ExportSettings } from '../settings-export-templates-actions'
import type { RegisterSettingsTab } from './settings-tab-shared'

export type WorkflowSimulationItem = {
  day: number
  label: string
  detail: string
  tone: 'neutral' | 'info' | 'warning'
}

export type WorkflowSettingsShape = {
  linkExpiryDays: number
  requireInternalApproval: boolean
  reminder1Days: number
  reminder2Days: number
  escalationAfterDays: number
  autoNotifyRequesterOnEscalation: boolean
  autoAllowDelegation: boolean
}

export type WorkflowTabProps = {
  org: {
    id: string | null
    exportSettings: ExportSettings
    workflowSettings: WorkflowSettingsShape
  }
  register: RegisterSettingsTab
}

export type MeddpiccRequiredState = {
  metricsPain: boolean
  economicBuyer: boolean
  decisionCriteria: boolean
  decisionProcess: boolean
  identifyPain: boolean
  champion: boolean
  competition: boolean
}

export const MEDDPICC_FIELDS = [
  ['metricsPain', 'Metrics & Pain'],
  ['economicBuyer', 'Economic Buyer'],
  ['decisionCriteria', 'Decision Criteria'],
  ['decisionProcess', 'Decision Process'],
  ['identifyPain', 'Identify Pain'],
  ['champion', 'Champion'],
  ['competition', 'Competition'],
] as const satisfies ReadonlyArray<readonly [keyof MeddpiccRequiredState, string]>

export const DEFAULT_MEDDPICC_REQUIRED: MeddpiccRequiredState = {
  metricsPain: true,
  economicBuyer: true,
  decisionCriteria: false,
  decisionProcess: false,
  identifyPain: true,
  champion: true,
  competition: false,
}
