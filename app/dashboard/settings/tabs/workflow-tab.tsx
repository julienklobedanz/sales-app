'use client'

import { TabsContent } from '@/components/ui/tabs'

import { SettingsExportTemplatesCard } from '../settings-export-templates-card'
import { SETTINGS_CARD_CLASS } from './settings-tab-shared'
import { useRegisterSettingsTab } from './use-register-settings-tab'
import { useWorkflowSettings } from './use-workflow-settings'
import { WorkflowApprovalProcessCard } from './workflow-approval-process-card'
import { WorkflowFreigabeSettingsCard } from './workflow-freigabe-settings-card'
import type { WorkflowTabProps } from './workflow-types'

export function WorkflowTab({ org, register }: WorkflowTabProps) {
  const settings = useWorkflowSettings(org.workflowSettings)

  useRegisterSettingsTab(
    'process',
    {
      dirty: settings.workflowDirty,
      pending: settings.workflowPending,
      save: settings.saveWorkflow,
    },
    register,
  )

  return (
    <TabsContent value="process">
      <div className="space-y-6">
        <WorkflowApprovalProcessCard />
        <div className={SETTINGS_CARD_CLASS}>
          <SettingsExportTemplatesCard
            organizationId={org.id}
            initial={org.exportSettings}
          />
        </div>
        <WorkflowFreigabeSettingsCard
          linkExpiryDays={settings.linkExpiryDays}
          onLinkExpiryDaysChange={settings.setLinkExpiryDays}
          requireInternalApproval={settings.requireInternalApproval}
          onRequireInternalApprovalChange={settings.setRequireInternalApproval}
          autoAllowDelegation={settings.autoAllowDelegation}
          onAutoAllowDelegationChange={settings.setAutoAllowDelegation}
          reminder1Days={settings.reminder1Days}
          onReminder1DaysChange={settings.setReminder1Days}
          reminder2Days={settings.reminder2Days}
          onReminder2DaysChange={settings.setReminder2Days}
          escalationAfterDays={settings.escalationAfterDays}
          onEscalationAfterDaysChange={settings.setEscalationAfterDays}
          autoNotifyRequesterOnEscalation={settings.autoNotifyRequesterOnEscalation}
          onAutoNotifyRequesterOnEscalationChange={
            settings.setAutoNotifyRequesterOnEscalation
          }
        />
      </div>
    </TabsContent>
  )
}
