'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import type { WorkflowSettingsShape, WorkflowSimulationItem } from './workflow-types'

export function WorkflowSimulationPanel({
  liveSettings,
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
}: {
  liveSettings: WorkflowSettingsShape
  workflowSimulation: WorkflowSimulationItem[]
  simulationSandboxEnabled: boolean
  setSimulationSandboxEnabled: (value: boolean) => void
  simRequireInternalApproval: boolean
  setSimRequireInternalApproval: (value: boolean) => void
  simReminder1Days: string
  setSimReminder1Days: (value: string) => void
  simReminder2Days: string
  setSimReminder2Days: (value: string) => void
  simEscalationAfterDays: string
  setSimEscalationAfterDays: (value: string) => void
  simLinkExpiryDays: string
  setSimLinkExpiryDays: (value: string) => void
  simAutoNotifyRequesterOnEscalation: boolean
  setSimAutoNotifyRequesterOnEscalation: (value: boolean) => void
  simAutoAllowDelegation: boolean
  setSimAutoAllowDelegation: (value: boolean) => void
  runWorkflowSimulation: () => void
  resetWorkflowSandbox: () => void
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Testlauf</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={runWorkflowSimulation}>
          Testlauf starten
        </Button>
      </div>
      <div className="mt-3 rounded-md border border-border p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">What-if-Sandbox</p>
          </div>
          <Switch
            checked={simulationSandboxEnabled}
            onCheckedChange={setSimulationSandboxEnabled}
          />
        </div>
        {simulationSandboxEnabled ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sim-reminder-1">Reminder #1</Label>
              <Input
                id="sim-reminder-1"
                value={simReminder1Days}
                onChange={(e) => setSimReminder1Days(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sim-reminder-2">Reminder #2</Label>
              <Input
                id="sim-reminder-2"
                value={simReminder2Days}
                onChange={(e) => setSimReminder2Days(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sim-escalation">Eskalation ab Tag</Label>
              <Input
                id="sim-escalation"
                value={simEscalationAfterDays}
                onChange={(e) => setSimEscalationAfterDays(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sim-ttl">Link Expiry (Tage)</Label>
              <Input
                id="sim-ttl"
                value={simLinkExpiryDays}
                onChange={(e) => setSimLinkExpiryDays(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-2.5 sm:col-span-2">
              <span className="text-xs text-muted-foreground">Interne Freigabe aktiv</span>
              <Switch
                checked={simRequireInternalApproval}
                onCheckedChange={setSimRequireInternalApproval}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-2.5 sm:col-span-2">
              <span className="text-xs text-muted-foreground">
                Requester bei Eskalation benachrichtigen
              </span>
              <Switch
                checked={simAutoNotifyRequesterOnEscalation}
                onCheckedChange={setSimAutoNotifyRequesterOnEscalation}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-2.5 sm:col-span-2">
              <span className="text-xs text-muted-foreground">Delegation erlauben</span>
              <Switch
                checked={simAutoAllowDelegation}
                onCheckedChange={setSimAutoAllowDelegation}
              />
            </div>
            <div className="rounded-md border border-border bg-muted p-2.5 sm:col-span-2">
              <p className="text-xs font-medium text-foreground">
                Delta zur Live-Konfiguration
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                <li>
                  Reminder #1: Live {liveSettings.reminder1Days}d → Sandbox{' '}
                  {simReminder1Days || '—'}d
                </li>
                <li>
                  Reminder #2: Live {liveSettings.reminder2Days}d → Sandbox{' '}
                  {simReminder2Days || '—'}d
                </li>
                <li>
                  Eskalation: Live {liveSettings.escalationAfterDays}d → Sandbox{' '}
                  {simEscalationAfterDays || '—'}d
                </li>
                <li>
                  TTL: Live {liveSettings.linkExpiryDays}d → Sandbox{' '}
                  {simLinkExpiryDays || '—'}d
                </li>
                <li>
                  Interne Freigabe: Live{' '}
                  {liveSettings.requireInternalApproval ? 'an' : 'aus'} → Sandbox{' '}
                  {simRequireInternalApproval ? 'an' : 'aus'}
                </li>
                <li>
                  Eskalations-Notify: Live{' '}
                  {liveSettings.autoNotifyRequesterOnEscalation ? 'an' : 'aus'} → Sandbox{' '}
                  {simAutoNotifyRequesterOnEscalation ? 'an' : 'aus'}
                </li>
                <li>
                  Delegation: Live {liveSettings.autoAllowDelegation ? 'an' : 'aus'} →
                  Sandbox {simAutoAllowDelegation ? 'an' : 'aus'}
                </li>
              </ul>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={resetWorkflowSandbox}
              >
                Sandbox zurücksetzen
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      {workflowSimulation.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {workflowSimulation.map((item, idx) => (
            <li
              key={`${item.day}-${item.label}-${idx}`}
              className={`rounded-md border px-3 py-2 ${
                item.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50'
                  : item.tone === 'info'
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-border bg-muted'
              }`}
            >
              <p className="text-sm font-medium text-foreground">
                Tag {item.day}: {item.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
