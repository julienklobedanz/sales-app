'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import type {
  WorkflowSettingsShape,
  WorkflowSimulationItem,
} from './workflow-types'

type LiveSource = {
  requireInternalApproval: boolean
  reminder1Days: string
  reminder2Days: string
  escalationAfterDays: string
  linkExpiryDays: string
  autoNotifyRequesterOnEscalation: boolean
  autoAllowDelegation: boolean
}

export function useWorkflowSimulation(
  initial: WorkflowSettingsShape,
  live: LiveSource,
) {
  const [workflowSimulation, setWorkflowSimulation] = useState<WorkflowSimulationItem[]>(
    [],
  )
  const [simulationSandboxEnabled, setSimulationSandboxEnabled] = useState(false)
  const [simRequireInternalApproval, setSimRequireInternalApproval] = useState(
    initial.requireInternalApproval,
  )
  const [simReminder1Days, setSimReminder1Days] = useState(String(initial.reminder1Days))
  const [simReminder2Days, setSimReminder2Days] = useState(String(initial.reminder2Days))
  const [simEscalationAfterDays, setSimEscalationAfterDays] = useState(
    String(initial.escalationAfterDays),
  )
  const [simLinkExpiryDays, setSimLinkExpiryDays] = useState(
    String(initial.linkExpiryDays),
  )
  const [simAutoNotifyRequesterOnEscalation, setSimAutoNotifyRequesterOnEscalation] =
    useState(initial.autoNotifyRequesterOnEscalation)
  const [simAutoAllowDelegation, setSimAutoAllowDelegation] = useState(
    initial.autoAllowDelegation,
  )

  function runWorkflowSimulation() {
    const sourceRequireInternalApproval = simulationSandboxEnabled
      ? simRequireInternalApproval
      : live.requireInternalApproval
    const sourceReminder1Days = simulationSandboxEnabled
      ? simReminder1Days
      : live.reminder1Days
    const sourceReminder2Days = simulationSandboxEnabled
      ? simReminder2Days
      : live.reminder2Days
    const sourceEscalationAfterDays = simulationSandboxEnabled
      ? simEscalationAfterDays
      : live.escalationAfterDays
    const sourceLinkExpiryDays = simulationSandboxEnabled
      ? simLinkExpiryDays
      : live.linkExpiryDays
    const sourceAutoNotifyRequesterOnEscalation = simulationSandboxEnabled
      ? simAutoNotifyRequesterOnEscalation
      : live.autoNotifyRequesterOnEscalation
    const sourceAutoAllowDelegation = simulationSandboxEnabled
      ? simAutoAllowDelegation
      : live.autoAllowDelegation

    const rem1 = Math.max(
      1,
      Number.isFinite(Number(sourceReminder1Days))
        ? Math.trunc(Number(sourceReminder1Days))
        : 3,
    )
    const rem2 = Math.max(
      rem1,
      Number.isFinite(Number(sourceReminder2Days))
        ? Math.trunc(Number(sourceReminder2Days))
        : 7,
    )
    const escal = Math.max(
      rem2,
      Number.isFinite(Number(sourceEscalationAfterDays))
        ? Math.trunc(Number(sourceEscalationAfterDays))
        : 10,
    )
    const ttl = Math.max(
      1,
      Number.isFinite(Number(sourceLinkExpiryDays))
        ? Math.trunc(Number(sourceLinkExpiryDays))
        : 14,
    )

    const items: WorkflowSimulationItem[] = [
      {
        day: 0,
        label: 'Freigabe angefordert',
        detail: sourceRequireInternalApproval
          ? 'Referenz landet zuerst im internen Review (pending_internal).'
          : 'Kundenfreigabe wird direkt versendet (pending).',
        tone: 'info',
      },
      {
        day: rem1,
        label: 'Reminder #1',
        detail: 'Automatischer Follow-up an den aktuellen Empfänger.',
        tone: 'neutral',
      },
      {
        day: rem2,
        label: 'Reminder #2',
        detail: 'Zweiter Reminder, falls weiterhin keine Entscheidung vorliegt.',
        tone: 'neutral',
      },
      {
        day: escal,
        label: 'Eskalation',
        detail: sourceAutoNotifyRequesterOnEscalation
          ? 'Requester wird aktiv benachrichtigt.'
          : 'Eskalation ohne automatische Requester-Benachrichtigung.',
        tone: 'warning',
      },
      {
        day: ttl,
        label: 'Link läuft ab',
        detail: 'Freigabelink erreicht das Ablaufdatum aus den Workflow-Regeln.',
        tone: 'warning',
      },
    ]

    if (sourceAutoAllowDelegation) {
      items.splice(1, 0, {
        day: 1,
        label: 'Delegation möglich',
        detail: 'Empfänger kann Anfrage an Kollegen delegieren.',
        tone: 'info',
      })
    }

    setWorkflowSimulation(items.sort((a, b) => a.day - b.day))
    toast.success('Testlauf aktualisiert')
  }

  function resetWorkflowSandbox() {
    setSimRequireInternalApproval(initial.requireInternalApproval)
    setSimReminder1Days(String(initial.reminder1Days))
    setSimReminder2Days(String(initial.reminder2Days))
    setSimEscalationAfterDays(String(initial.escalationAfterDays))
    setSimLinkExpiryDays(String(initial.linkExpiryDays))
    setSimAutoNotifyRequesterOnEscalation(initial.autoNotifyRequesterOnEscalation)
    setSimAutoAllowDelegation(initial.autoAllowDelegation)
    toast.success('Sandbox auf Live-Werte zurückgesetzt')
  }

  return {
    workflowSimulation,
    simulationSandboxEnabled,
    setSimulationSandboxEnabled,
    simRequireInternalApproval,
    setSimRequireInternalApproval,
    simReminder1Days,
    setSimReminder1Days,
    simReminder2Days,
    setSimReminder2Days,
    simEscalationAfterDays,
    setSimEscalationAfterDays,
    simLinkExpiryDays,
    setSimLinkExpiryDays,
    simAutoNotifyRequesterOnEscalation,
    setSimAutoNotifyRequesterOnEscalation,
    simAutoAllowDelegation,
    setSimAutoAllowDelegation,
    runWorkflowSimulation,
    resetWorkflowSandbox,
  }
}
