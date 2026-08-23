'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { updateWorkflowSettings } from '../settings-consolidation-actions'

import type { WorkflowSettingsShape } from './workflow-types'

export function useWorkflowSettings(initial: WorkflowSettingsShape) {
  const [linkExpiryDays, setLinkExpiryDays] = useState(String(initial.linkExpiryDays))
  const [requireInternalApproval, setRequireInternalApproval] = useState(
    initial.requireInternalApproval,
  )
  const [reminder1Days, setReminder1Days] = useState(String(initial.reminder1Days))
  const [reminder2Days, setReminder2Days] = useState(String(initial.reminder2Days))
  const [escalationAfterDays, setEscalationAfterDays] = useState(
    String(initial.escalationAfterDays),
  )
  const [autoNotifyRequesterOnEscalation, setAutoNotifyRequesterOnEscalation] = useState(
    initial.autoNotifyRequesterOnEscalation,
  )
  const [autoAllowDelegation, setAutoAllowDelegation] = useState(
    initial.autoAllowDelegation,
  )
  const [workflowPending, startWorkflowTransition] = useTransition()

  const workflowDirty =
    linkExpiryDays !== String(initial.linkExpiryDays) ||
    requireInternalApproval !== initial.requireInternalApproval ||
    reminder1Days !== String(initial.reminder1Days) ||
    reminder2Days !== String(initial.reminder2Days) ||
    escalationAfterDays !== String(initial.escalationAfterDays) ||
    autoNotifyRequesterOnEscalation !== initial.autoNotifyRequesterOnEscalation ||
    autoAllowDelegation !== initial.autoAllowDelegation

  function saveWorkflow() {
    startWorkflowTransition(async () => {
      const parsed = Number(linkExpiryDays)
      const rem1 = Number(reminder1Days)
      const rem2 = Number(reminder2Days)
      const escal = Number(escalationAfterDays)
      const result = await updateWorkflowSettings({
        linkExpiryDays: Number.isFinite(parsed) ? parsed : 14,
        requireInternalApproval,
        reminder1Days: Number.isFinite(rem1) ? rem1 : 3,
        reminder2Days: Number.isFinite(rem2) ? rem2 : 7,
        escalationAfterDays: Number.isFinite(escal) ? escal : 10,
        autoNotifyRequesterOnEscalation,
        autoAllowDelegation,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Workflow-Einstellungen gespeichert')
    })
  }

  return {
    linkExpiryDays,
    setLinkExpiryDays,
    requireInternalApproval,
    setRequireInternalApproval,
    reminder1Days,
    setReminder1Days,
    reminder2Days,
    setReminder2Days,
    escalationAfterDays,
    setEscalationAfterDays,
    autoNotifyRequesterOnEscalation,
    setAutoNotifyRequesterOnEscalation,
    autoAllowDelegation,
    setAutoAllowDelegation,
    workflowPending,
    workflowDirty,
    saveWorkflow,
  }
}
