'use client'

import { TabsContent } from '@/components/ui/tabs'

import { SettingsExportTemplatesCard } from '../settings-export-templates-card'
import { SETTINGS_CARD_CLASS } from './settings-tab-shared'
import { useRegisterSettingsTab } from './use-register-settings-tab'
import { useWorkflowSettings } from './use-workflow-settings'
import { useWorkflowSimulation } from './use-workflow-simulation'
import { WorkflowFreigabeSettingsCard } from './workflow-freigabe-settings-card'
import { WorkflowMeddpiccCard } from './workflow-meddpicc-card'
import {
  WorkflowApprovalProcessCard,
  WorkflowAutomationCard,
} from './workflow-static-cards'
import type { WorkflowTabProps } from './workflow-types'

export function WorkflowTab({ org, register }: WorkflowTabProps) {
  const settings = useWorkflowSettings(org.workflowSettings)
  const simulation = useWorkflowSimulation(org.workflowSettings, {
    requireInternalApproval: settings.requireInternalApproval,
    reminder1Days: settings.reminder1Days,
    reminder2Days: settings.reminder2Days,
    escalationAfterDays: settings.escalationAfterDays,
    linkExpiryDays: settings.linkExpiryDays,
    autoNotifyRequesterOnEscalation: settings.autoNotifyRequesterOnEscalation,
    autoAllowDelegation: settings.autoAllowDelegation,
  })

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
        <WorkflowAutomationCard />
        <WorkflowMeddpiccCard />
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
          liveSettings={org.workflowSettings}
          simulation={simulation}
        />
      </div>
    </TabsContent>
  )
}
