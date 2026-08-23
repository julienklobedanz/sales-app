import type { ExportSettings } from '../settings-export-templates-actions'
import type { RegisterSettingsTab } from './settings-tab-shared'

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
