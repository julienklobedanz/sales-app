'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ChevronRight, ShieldCheck, Zap, ClipboardList } from 'lucide-react'
import { SettingsExportTemplatesCard } from '../settings-export-templates-card'
import type { ExportSettings } from '../settings-export-templates-actions'
import { updateWorkflowSettings } from '../settings-consolidation-actions'
import { SETTINGS_CARD_CLASS, type RegisterSettingsTab } from './settings-tab-shared'
import { useRegisterSettingsTab } from './use-register-settings-tab'

type WorkflowSimulationItem = {
  day: number
  label: string
  detail: string
  tone: 'neutral' | 'info' | 'warning'
}

type WorkflowTabProps = {
  org: {
    id: string | null
    exportSettings: ExportSettings
    workflowSettings: {
      linkExpiryDays: number
      requireInternalApproval: boolean
      reminder1Days: number
      reminder2Days: number
      escalationAfterDays: number
      autoNotifyRequesterOnEscalation: boolean
      autoAllowDelegation: boolean
    }
  }
  register: RegisterSettingsTab
}

export function WorkflowTab({ org, register }: WorkflowTabProps) {
  const [linkExpiryDays, setLinkExpiryDays] = useState(
    String(org.workflowSettings.linkExpiryDays)
  )
  const [requireInternalApproval, setRequireInternalApproval] = useState(
    org.workflowSettings.requireInternalApproval
  )
  const [reminder1Days, setReminder1Days] = useState(String(org.workflowSettings.reminder1Days))
  const [reminder2Days, setReminder2Days] = useState(String(org.workflowSettings.reminder2Days))
  const [escalationAfterDays, setEscalationAfterDays] = useState(
    String(org.workflowSettings.escalationAfterDays)
  )
  const [autoNotifyRequesterOnEscalation, setAutoNotifyRequesterOnEscalation] = useState(
    org.workflowSettings.autoNotifyRequesterOnEscalation
  )
  const [autoAllowDelegation, setAutoAllowDelegation] = useState(
    org.workflowSettings.autoAllowDelegation
  )
  const [workflowPending, startWorkflowTransition] = useTransition()
  const [workflowSimulation, setWorkflowSimulation] = useState<WorkflowSimulationItem[]>([])
  const [simulationSandboxEnabled, setSimulationSandboxEnabled] = useState(false)
  const [simRequireInternalApproval, setSimRequireInternalApproval] = useState(
    org.workflowSettings.requireInternalApproval
  )
  const [simReminder1Days, setSimReminder1Days] = useState(String(org.workflowSettings.reminder1Days))
  const [simReminder2Days, setSimReminder2Days] = useState(String(org.workflowSettings.reminder2Days))
  const [simEscalationAfterDays, setSimEscalationAfterDays] = useState(
    String(org.workflowSettings.escalationAfterDays)
  )
  const [simLinkExpiryDays, setSimLinkExpiryDays] = useState(String(org.workflowSettings.linkExpiryDays))
  const [simAutoNotifyRequesterOnEscalation, setSimAutoNotifyRequesterOnEscalation] = useState(
    org.workflowSettings.autoNotifyRequesterOnEscalation
  )
  const [simAutoAllowDelegation, setSimAutoAllowDelegation] = useState(
    org.workflowSettings.autoAllowDelegation
  )
  const [meddpiccRequired, setMeddpiccRequired] = useState({
    metricsPain: true,
    economicBuyer: true,
    decisionCriteria: false,
    decisionProcess: false,
    identifyPain: true,
    champion: true,
    competition: false,
  })

  const workflowDirty =
    linkExpiryDays !== String(org.workflowSettings.linkExpiryDays) ||
    requireInternalApproval !== org.workflowSettings.requireInternalApproval ||
    reminder1Days !== String(org.workflowSettings.reminder1Days) ||
    reminder2Days !== String(org.workflowSettings.reminder2Days) ||
    escalationAfterDays !== String(org.workflowSettings.escalationAfterDays) ||
    autoNotifyRequesterOnEscalation !== org.workflowSettings.autoNotifyRequesterOnEscalation ||
    autoAllowDelegation !== org.workflowSettings.autoAllowDelegation

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

  function runWorkflowSimulation() {
    const sourceRequireInternalApproval = simulationSandboxEnabled
      ? simRequireInternalApproval
      : requireInternalApproval
    const sourceReminder1Days = simulationSandboxEnabled ? simReminder1Days : reminder1Days
    const sourceReminder2Days = simulationSandboxEnabled ? simReminder2Days : reminder2Days
    const sourceEscalationAfterDays = simulationSandboxEnabled
      ? simEscalationAfterDays
      : escalationAfterDays
    const sourceLinkExpiryDays = simulationSandboxEnabled ? simLinkExpiryDays : linkExpiryDays
    const sourceAutoNotifyRequesterOnEscalation = simulationSandboxEnabled
      ? simAutoNotifyRequesterOnEscalation
      : autoNotifyRequesterOnEscalation
    const sourceAutoAllowDelegation = simulationSandboxEnabled
      ? simAutoAllowDelegation
      : autoAllowDelegation

    const rem1 = Math.max(1, Number.isFinite(Number(sourceReminder1Days)) ? Math.trunc(Number(sourceReminder1Days)) : 3)
    const rem2 = Math.max(rem1, Number.isFinite(Number(sourceReminder2Days)) ? Math.trunc(Number(sourceReminder2Days)) : 7)
    const escal = Math.max(
      rem2,
      Number.isFinite(Number(sourceEscalationAfterDays)) ? Math.trunc(Number(sourceEscalationAfterDays)) : 10
    )
    const ttl = Math.max(1, Number.isFinite(Number(sourceLinkExpiryDays)) ? Math.trunc(Number(sourceLinkExpiryDays)) : 14)

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
    setSimRequireInternalApproval(org.workflowSettings.requireInternalApproval)
    setSimReminder1Days(String(org.workflowSettings.reminder1Days))
    setSimReminder2Days(String(org.workflowSettings.reminder2Days))
    setSimEscalationAfterDays(String(org.workflowSettings.escalationAfterDays))
    setSimLinkExpiryDays(String(org.workflowSettings.linkExpiryDays))
    setSimAutoNotifyRequesterOnEscalation(org.workflowSettings.autoNotifyRequesterOnEscalation)
    setSimAutoAllowDelegation(org.workflowSettings.autoAllowDelegation)
    toast.success('Sandbox auf Live-Werte zurückgesetzt')
  }

  useRegisterSettingsTab(
    'workflow',
    {
      dirty: workflowDirty,
      pending: workflowPending,
      save: saveWorkflow,
    },
    register
  )

  return (
    <TabsContent value="workflow">
      <div className="space-y-6">
        <div className={SETTINGS_CARD_CLASS}>
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Approval Process</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 p-4 text-sm sm:flex-row sm:items-center">
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 font-medium">
                <ClipboardList className="h-4 w-4" /> Entwurf
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 font-medium">
                <ShieldCheck className="h-4 w-4" /> Interner Review
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 font-medium">
                <Zap className="h-4 w-4" /> Kundenfreigabe
              </span>
            </div>
          </CardContent>
        </div>
        <div className={SETTINGS_CARD_CLASS}>
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Automation</CardTitle>
            <CardDescription className="text-slate-500">
              Trigger-Regeln für operative Benachrichtigungen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 px-0 pb-0">
            <div className="rounded-md border border-slate-200 p-3 text-sm">
              Marktsignal Kategorie X → Push-Nachricht an Owner
            </div>
            <div className="rounded-md border border-slate-200 p-3 text-sm">
              Approval überfällig → Eskalation an Requester
            </div>
          </CardContent>
        </div>
        <div className={SETTINGS_CARD_CLASS}>
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">MEDDPICC</CardTitle>
            <CardDescription className="text-slate-500">
              Pflichtfelder für „Ready“ im Strategie-Tab.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 px-0 pb-0 sm:grid-cols-2">
            {([
              ['metricsPain', 'Metrics & Pain'],
              ['economicBuyer', 'Economic Buyer'],
              ['decisionCriteria', 'Decision Criteria'],
              ['decisionProcess', 'Decision Process'],
              ['identifyPain', 'Identify Pain'],
              ['champion', 'Champion'],
              ['competition', 'Competition'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                {label}
                <Switch
                  checked={meddpiccRequired[key]}
                  onCheckedChange={(checked) =>
                    setMeddpiccRequired((prev) => ({ ...prev, [key]: checked }))
                  }
                />
              </label>
            ))}
          </CardContent>
        </div>
        <div className={SETTINGS_CARD_CLASS}>
          <SettingsExportTemplatesCard
            organizationId={org.id}
            initial={org.exportSettings}
          />
        </div>
        <div className={SETTINGS_CARD_CLASS}>
          <CardHeader className="space-y-2 px-0 pt-0">
            <CardTitle className="text-base">Freigabe-Workflow</CardTitle>
            <CardDescription className="text-slate-500">
              Verwalte deinen Freigabeprozess wie eine kompakte Sequence: Trigger, interne Prüfung, Versand, Follow-ups und Abschluss.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-0 pb-0 pt-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">1. Entry</p>
              <p className="mt-1 text-xs text-slate-500">
                Standard-Gültigkeit für Freigabe-Links aus dem Dialog `Freigabe anfordern`.
              </p>
              <div className="mt-3 max-w-sm space-y-2">
                <Label htmlFor="link-expiry-days">Link Expiry (Tage)</Label>
                <Input
                  id="link-expiry-days"
                  value={linkExpiryDays}
                  onChange={(e) => setLinkExpiryDays(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">2. Interne Prüfung</p>
              <p className="mt-1 text-xs text-slate-500">
                Definiert, ob vor externem Versand zwingend ein internes Review nötig ist.
              </p>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium">Vier-Augen-Prinzip aktiv</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Bei aktivem Modus bleibt die Anfrage in `pending_internal` bis zur Freigabe.
                  </p>
                </div>
                <Switch checked={requireInternalApproval} onCheckedChange={setRequireInternalApproval} />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">3. Externer Versand</p>
              <p className="mt-1 text-xs text-slate-500">
                Delegation für Kundenkontakt steuern.
              </p>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium">Delegation erlauben</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Empfänger kann Freigabeanfrage an Kollegen weiterdelegieren.
                  </p>
                </div>
                <Switch checked={autoAllowDelegation} onCheckedChange={setAutoAllowDelegation} />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">4. Follow-up Sequenz</p>
              <p className="mt-1 text-xs text-slate-500">
                Reminder- und Eskalationspunkte für ausstehende Freigaben.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="approval-reminder-1">Reminder #1 (Tage)</Label>
                  <Input
                    id="approval-reminder-1"
                    value={reminder1Days}
                    onChange={(e) => setReminder1Days(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="approval-reminder-2">Reminder #2 (Tage)</Label>
                  <Input
                    id="approval-reminder-2"
                    value={reminder2Days}
                    onChange={(e) => setReminder2Days(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="approval-escalation-days">Eskalation ab Tag</Label>
                  <Input
                    id="approval-escalation-days"
                    value={escalationAfterDays}
                    onChange={(e) => setEscalationAfterDays(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">5. Abschluss & Transparenz</p>
              <p className="mt-1 text-xs text-slate-500">
                Wer bei Eskalation informiert wird.
              </p>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium">Requester bei Eskalation benachrichtigen</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Informiert die anfragende Person automatisch über überfällige Freigaben.
                  </p>
                </div>
                <Switch
                  checked={autoNotifyRequesterOnEscalation}
                  onCheckedChange={setAutoNotifyRequesterOnEscalation}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Live-Ablaufvorschau</p>
                <p className="mt-1 text-xs text-slate-500">
                  Tag 0 Anfrage · Tag {reminder1Days || '3'} Reminder 1 · Tag {reminder2Days || '7'} Reminder 2 · Tag{' '}
                  {escalationAfterDays || '10'} Eskalation
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Testlauf</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Simuliert einen Freigabe-Case mit den aktuellen Workflow-Regeln.
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={runWorkflowSimulation}>
                  Testlauf starten
                </Button>
              </div>
              <div className="mt-3 rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">What-if-Sandbox</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Teste alternative Werte ohne deine gespeicherten Workflow-Einstellungen zu ändern.
                    </p>
                  </div>
                  <Switch checked={simulationSandboxEnabled} onCheckedChange={setSimulationSandboxEnabled} />
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
                    <div className="flex items-center justify-between rounded-md border border-slate-200 p-2.5 sm:col-span-2">
                      <span className="text-xs text-slate-600">Interne Freigabe aktiv</span>
                      <Switch
                        checked={simRequireInternalApproval}
                        onCheckedChange={setSimRequireInternalApproval}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-slate-200 p-2.5 sm:col-span-2">
                      <span className="text-xs text-slate-600">Requester bei Eskalation benachrichtigen</span>
                      <Switch
                        checked={simAutoNotifyRequesterOnEscalation}
                        onCheckedChange={setSimAutoNotifyRequesterOnEscalation}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-slate-200 p-2.5 sm:col-span-2">
                      <span className="text-xs text-slate-600">Delegation erlauben</span>
                      <Switch
                        checked={simAutoAllowDelegation}
                        onCheckedChange={setSimAutoAllowDelegation}
                      />
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 sm:col-span-2">
                      <p className="text-xs font-medium text-slate-700">Delta zur Live-Konfiguration</p>
                      <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
                        <li>
                          Reminder #1: Live {org.workflowSettings.reminder1Days}d → Sandbox {simReminder1Days || '—'}d
                        </li>
                        <li>
                          Reminder #2: Live {org.workflowSettings.reminder2Days}d → Sandbox {simReminder2Days || '—'}d
                        </li>
                        <li>
                          Eskalation: Live {org.workflowSettings.escalationAfterDays}d → Sandbox {simEscalationAfterDays || '—'}d
                        </li>
                        <li>
                          TTL: Live {org.workflowSettings.linkExpiryDays}d → Sandbox {simLinkExpiryDays || '—'}d
                        </li>
                        <li>
                          Interne Freigabe: Live {org.workflowSettings.requireInternalApproval ? 'an' : 'aus'} → Sandbox{' '}
                          {simRequireInternalApproval ? 'an' : 'aus'}
                        </li>
                        <li>
                          Eskalations-Notify: Live {org.workflowSettings.autoNotifyRequesterOnEscalation ? 'an' : 'aus'} →
                          Sandbox {simAutoNotifyRequesterOnEscalation ? 'an' : 'aus'}
                        </li>
                        <li>
                          Delegation: Live {org.workflowSettings.autoAllowDelegation ? 'an' : 'aus'} → Sandbox{' '}
                          {simAutoAllowDelegation ? 'an' : 'aus'}
                        </li>
                      </ul>
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <Button type="button" size="sm" variant="ghost" onClick={resetWorkflowSandbox}>
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
                            : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-900">
                        Tag {item.day}: {item.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">{item.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  Noch kein Testlauf ausgeführt. Nutze „Testlauf starten“, um die Timeline zu prüfen.
                </p>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </TabsContent>
  )
}
