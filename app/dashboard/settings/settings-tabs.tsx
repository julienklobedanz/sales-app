'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import type { AppRole } from '@/hooks/useRole'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { AppIcon } from '@/lib/icons'
import { PlugSocketIcon, Shield, ShieldAlert, Trash2 } from '@hugeicons/core-free-icons'
import { SettingsProfileCard } from './settings-profile-card'
import { SettingsTeamCard } from './settings-team-card'
import { SettingsWorkspaceCard } from './settings-workspace-card'
import { SettingsBillingCard } from './settings-billing-card'
import { SettingsExportTemplatesCard } from './settings-export-templates-card'
import { SettingsDevRoleCard } from './settings-dev-role-card'
import type { ExportSettings } from './settings-export-templates-actions'
import { changeOwnPassword } from './actions'
import {
  updateProfileNotificationSettings,
  updateWorkflowSettings,
  updateWorkspaceAdminSettings,
  updateWorkspaceSecurityCompliance,
} from './settings-consolidation-actions'

const CARD_CLASS = 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'

export function SettingsTabs({
  roleSwitcher,
  profile,
  org,
  teamMembers,
  auditLogs,
}: {
  roleSwitcher: {
    serverRole: AppRole
    previewRole: AppRole | null
  }
  profile: {
    userEmail: string
    firstName: string
    lastName: string
    avatarUrl: string | null
    notificationSettings: {
      emailOnNewMatch: boolean
      emailOnApprovalUpdate: boolean
    }
  }
  org: {
    id: string | null
    name: string
    logoUrl: string | null
    primaryColor: string
    secondaryColor: string
    exportSettings: ExportSettings
    subscriptionStatus: string | null
    subscriptionId: string | null
    subdomain: string
    apiSettings: {
      apiKeyMask: string
      useWorkspaceBranding: boolean
    }
    workflowSettings: {
      linkExpiryDays: number
      requireInternalApproval: boolean
      reminder1Days: number
      reminder2Days: number
      escalationAfterDays: number
      autoNotifyRequesterOnEscalation: boolean
      autoAllowDelegation: boolean
      publicLinkMaxTtlDays: number
      publicLinkRequirePasswordForNew: boolean
      auditLogRetentionDays: number
    }
  }
  teamMembers: Parameters<typeof SettingsTeamCard>[0]['initialMembers']
  auditLogs: Array<{
    id: string
    action: string
    entity_id: string | null
    action_details: Record<string, unknown> | null
    timestamp: string
    user_id: string | null
  }>
}) {
  type WorkflowSimulationItem = {
    day: number
    label: string
    detail: string
    tone: 'neutral' | 'info' | 'warning'
  }
  const [notifyNewMatch, setNotifyNewMatch] = useState(
    profile.notificationSettings.emailOnNewMatch
  )
  const [notifyApproval, setNotifyApproval] = useState(
    profile.notificationSettings.emailOnApprovalUpdate
  )
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
  const [subdomain, setSubdomain] = useState(org.subdomain)
  const [apiKeyMask, setApiKeyMask] = useState(org.apiSettings.apiKeyMask)
  const [useWorkspaceBranding, setUseWorkspaceBranding] = useState(
    org.apiSettings.useWorkspaceBranding
  )
  const [profilePending, startProfileTransition] = useTransition()
  const [workspacePending, startWorkspaceTransition] = useTransition()
  const [workflowPending, startWorkflowTransition] = useTransition()
  const [publicLinkMaxTtl, setPublicLinkMaxTtl] = useState(
    String(org.workflowSettings.publicLinkMaxTtlDays)
  )
  const [publicLinkReqPwNew, setPublicLinkReqPwNew] = useState(
    org.workflowSettings.publicLinkRequirePasswordForNew
  )
  const [auditRetentionDays, setAuditRetentionDays] = useState(
    String(org.workflowSettings.auditLogRetentionDays)
  )
  const [securityPending, startSecurityTransition] = useTransition()
  const [passwordPending, startPasswordTransition] = useTransition()
  const [auditActionFilter, setAuditActionFilter] = useState('all')
  const [auditSearch, setAuditSearch] = useState('')
  const [auditTimeFilter, setAuditTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('7d')
  const [auditQuickView, setAuditQuickView] = useState<'all' | 'security' | 'policy'>('all')
  const [auditNowTs] = useState(() => new Date().getTime())
  const [workspaceDeleteStep, setWorkspaceDeleteStep] = useState<1 | 2 | 3>(1)
  const [workspaceDeleteSubdomainInput, setWorkspaceDeleteSubdomainInput] = useState('')
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

  function saveProfileNotifications() {
    startProfileTransition(async () => {
      const result = await updateProfileNotificationSettings({
        emailOnNewMatch: notifyNewMatch,
        emailOnApprovalUpdate: notifyApproval,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Benachrichtigungen gespeichert')
    })
  }

  function saveWorkspaceAdmin() {
    startWorkspaceTransition(async () => {
      const result = await updateWorkspaceAdminSettings({
        subdomain,
        apiKeyMask,
        useWorkspaceBranding,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Workspace-Einstellungen gespeichert')
    })
  }

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

  function saveSecurityCompliance() {
    startSecurityTransition(async () => {
      const parsed = Number(publicLinkMaxTtl)
      const result = await updateWorkspaceSecurityCompliance({
        publicLinkMaxTtlDays: Number.isFinite(parsed) ? parsed : 365,
        publicLinkRequirePasswordForNew: publicLinkReqPwNew,
        auditLogRetentionDays: Number.isFinite(Number(auditRetentionDays))
          ? Number(auditRetentionDays)
          : 365,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Sicherheitsrichtlinien gespeichert')
    })
  }

  function saveOwnPassword(formData: FormData) {
    startPasswordTransition(async () => {
      const result = await changeOwnPassword(formData)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Passwort erfolgreich geändert')
    })
  }

  function actionSeverity(action: string): 'high' | 'medium' | 'low' {
    if (action === 'unlock_rate_limited') return 'high'
    if (action === 'unlock_failed' || action === 'security_policy_updated') return 'medium'
    return 'low'
  }

  const filteredAuditLogs = auditLogs.filter((row) => {
    if (auditQuickView === 'security' && !row.action.startsWith('unlock_')) return false
    if (auditQuickView === 'policy' && !row.action.includes('policy')) return false
    if (auditActionFilter !== 'all' && row.action !== auditActionFilter) return false
    if (auditTimeFilter !== 'all') {
      const now = auditNowTs
      const ts = new Date(row.timestamp).getTime()
      const diff = now - ts
      const max =
        auditTimeFilter === '24h'
          ? 24 * 60 * 60 * 1000
          : auditTimeFilter === '7d'
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000
      if (Number.isFinite(ts) && diff > max) return false
    }
    const q = auditSearch.trim().toLowerCase()
    if (!q) return true
    return (
      String(row.entity_id ?? '').toLowerCase().includes(q) ||
      String(row.action).toLowerCase().includes(q) ||
      String(row.user_id ?? '').toLowerCase().includes(q) ||
      JSON.stringify(row.action_details ?? {}).toLowerCase().includes(q)
    )
  })

  function exportAuditCsv() {
    const header = ['timestamp', 'action', 'entity_id', 'user_id', 'action_details']
    const lines = filteredAuditLogs.map((row) => {
      const fields = [
        row.timestamp,
        row.action,
        row.entity_id ?? '',
        row.user_id ?? '',
        JSON.stringify(row.action_details ?? {}),
      ]
      return fields
        .map((f) => `"${String(f).replace(/"/g, '""')}"`)
        .join(',')
    })
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function resetWorkspaceDeleteFlow() {
    setWorkspaceDeleteStep(1)
    setWorkspaceDeleteSubdomainInput('')
  }

  function confirmWorkspaceDeleteStep() {
    if (workspaceDeleteStep < 3) {
      setWorkspaceDeleteStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev))
      return
    }
    if (workspaceDeleteSubdomainInput.trim().toLowerCase() !== org.subdomain.trim().toLowerCase()) {
      toast.error('Subdomain stimmt nicht überein.')
      return
    }
    toast.error('Workspace-Löschung wird in einem gesicherten Backend-Flow freigeschaltet.')
    resetWorkspaceDeleteFlow()
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

  return (
    <Tabs defaultValue="profile" className="gap-6">
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="profile">Profil</TabsTrigger>
        <TabsTrigger value="workspace">Workspace</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="integrations">Integrationen</TabsTrigger>
        <TabsTrigger value="workflow">Workflow</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <div className="space-y-6">
          <div className={CARD_CLASS}>
            <SettingsProfileCard
              userEmail={profile.userEmail}
              firstName={profile.firstName}
              lastName={profile.lastName}
              avatarUrl={profile.avatarUrl}
            />
          </div>
          <div className={CARD_CLASS}>
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base">Benachrichtigungen</CardTitle>
              <CardDescription className="text-slate-500">
                Lege fest, bei welchen Ereignissen du direkt informiert wirst.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0 pt-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium">E-Mail bei neuem Match</p>
                  <p className="text-xs text-slate-500">Erhalte Hinweise bei neuen Referenztreffern.</p>
                </div>
                <Switch checked={notifyNewMatch} onCheckedChange={setNotifyNewMatch} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium">E-Mail bei Freigaben</p>
                  <p className="text-xs text-slate-500">Statusupdates zu Kundenfreigaben direkt per Mail.</p>
                </div>
                <Switch checked={notifyApproval} onCheckedChange={setNotifyApproval} />
              </div>
              <div className="flex justify-end">
                <Button type="button" size="sm" onClick={saveProfileNotifications} disabled={profilePending}>
                  Benachrichtigungen speichern
                </Button>
              </div>
            </CardContent>
          </div>
          <div className={CARD_CLASS}>
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base">Passwort ändern</CardTitle>
              <CardDescription className="text-slate-500">
                Für Enterprise-Sicherheit gilt eine starke Passwortpolicy (mindestens 12 Zeichen).
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form action={saveOwnPassword} className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                  <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">Neues Passwort</Label>
                  <Input id="newPassword" name="newPassword" type="password" minLength={12} autoComplete="new-password" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" minLength={12} autoComplete="new-password" />
                </div>
                <div className="sm:col-span-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    Mindestens 12 Zeichen inkl. Groß-/Kleinbuchstaben, Zahl und Sonderzeichen.
                  </p>
                  <Button type="submit" size="sm" disabled={passwordPending}>
                    {passwordPending ? 'Speichert …' : 'Passwort speichern'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </div>
          <div className="rounded-xl border border-red-300 bg-red-50/50 p-6 shadow-sm">
            <p className="text-sm font-semibold text-red-700">Danger Zone</p>
            <p className="mt-1 text-xs text-red-600/90">Konto dauerhaft entfernen. Dieser Vorgang ist irreversibel.</p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-4"
              onClick={() => toast.error('Account-Löschung wird in einem gesicherten Backend-Flow freigeschaltet.')}
            >
              <AppIcon icon={Trash2} size={16} />
              Account löschen
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="workspace">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={CARD_CLASS}>
              <SettingsWorkspaceCard
                organizationId={org.id}
                organizationName={org.name}
                logoUrl={org.logoUrl}
                primaryColor={org.primaryColor}
                secondaryColor={org.secondaryColor}
              />
            </div>
            <div className={CARD_CLASS}>
              <SettingsBillingCard
                subscriptionStatus={org.subscriptionStatus}
                subscriptionId={org.subscriptionId}
              />
            </div>
          </div>
          <div className={CARD_CLASS}>
            <CardHeader className="space-y-2 px-0 pt-0">
              <CardTitle className="text-base">Security & Compliance</CardTitle>
              <CardDescription className="text-slate-500">
                Globale Regeln für öffentliche Kundenlinks (DSGVO: Speicherbegrenzung, Zugriffskontrolle). Nur
                Administratoren.
              </CardDescription>
              <p className="pt-1 text-xs text-slate-500">
                Security Alerts werden ausschließlich per Admin-E-Mail versendet (Resend), nicht über die Notification-Bell.
              </p>
            </CardHeader>
            <CardContent className="space-y-5 px-0 pb-0 pt-1">
              <div className="max-w-md space-y-2">
                <Label htmlFor="public-link-max-ttl">Maximale Link-Gültigkeit (Tage)</Label>
                <Input
                  id="public-link-max-ttl"
                  value={publicLinkMaxTtl}
                  onChange={(e) => setPublicLinkMaxTtl(e.target.value)}
                  inputMode="numeric"
                  disabled={roleSwitcher.serverRole !== 'admin'}
                  className={roleSwitcher.serverRole !== 'admin' ? 'bg-slate-50' : ''}
                />
                <p className="text-xs text-slate-500">
                  Obergrenze für Ablaufdatum pro Link (7–3650 Tage). Einzelne Links können kürzer sein; längere
                  Werte werden beim Speichern begrenzt.
                </p>
              </div>
              <div className="max-w-md space-y-2">
                <Label htmlFor="audit-retention-days">Audit-Retention (Tage)</Label>
                <Input
                  id="audit-retention-days"
                  value={auditRetentionDays}
                  onChange={(e) => setAuditRetentionDays(e.target.value)}
                  inputMode="numeric"
                  disabled={roleSwitcher.serverRole !== 'admin'}
                  className={roleSwitcher.serverRole !== 'admin' ? 'bg-slate-50' : ''}
                />
                <p className="text-xs text-slate-500">
                  Best-Practice für Enterprise: 365 Tage. Konfigurierbar zwischen 30 und 3650 Tagen.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-medium">Passwort für neue Links erzwingen</p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Jeder neu erstellte Kundenlink erhält automatisch ein Passwort und ein Ablaufdatum gemäß
                    Workflow-Standard (Tage).
                  </p>
                </div>
                <Switch
                  checked={publicLinkReqPwNew}
                  onCheckedChange={setPublicLinkReqPwNew}
                  disabled={roleSwitcher.serverRole !== 'admin'}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={saveSecurityCompliance}
                  disabled={!org.id || securityPending || roleSwitcher.serverRole !== 'admin'}
                >
                  <AppIcon icon={Shield} size={16} />
                  Sicherheit speichern
                </Button>
              </div>
            </CardContent>
          </div>
          {roleSwitcher.serverRole === 'admin' ? (
            <div className={CARD_CLASS}>
              <CardHeader className="space-y-2 px-0 pt-0">
                <CardTitle className="text-base">Audit Log</CardTitle>
                <CardDescription className="text-slate-500">
                  Nachweisbare Security- und Compliance-Ereignisse (PII-minimiert, IDs only).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-0 pb-0 pt-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
                    {([
                      ['all', 'Alle'],
                      ['security', 'Security'],
                      ['policy', 'Policy'],
                    ] as const).map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={auditQuickView === value ? 'secondary' : 'ghost'}
                        className="h-7 px-2 text-xs"
                        onClick={() => setAuditQuickView(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <Input
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Suche in action/entity/user/details"
                    className="h-9 max-w-sm"
                  />
                  <select
                    value={auditTimeFilter}
                    onChange={(e) => setAuditTimeFilter(e.target.value as '24h' | '7d' | '30d' | 'all')}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="24h">Letzte 24h</option>
                    <option value="7d">Letzte 7 Tage</option>
                    <option value="30d">Letzte 30 Tage</option>
                    <option value="all">Alle Zeiträume</option>
                  </select>
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="all">Alle Actions</option>
                    {Array.from(new Set(auditLogs.map((r) => r.action))).sort().map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" size="sm" onClick={exportAuditCsv}>
                    CSV Export
                  </Button>
                </div>
                <div className="mt-1 max-h-[360px] overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Zeit</th>
                        <th className="px-3 py-2 text-left font-medium">Action</th>
                        <th className="px-3 py-2 text-left font-medium">Severity</th>
                        <th className="px-3 py-2 text-left font-medium">Entity</th>
                        <th className="px-3 py-2 text-left font-medium">User</th>
                        <th className="px-3 py-2 text-left font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-slate-500" colSpan={6}>
                            Keine Einträge für den gewählten Filter.
                          </td>
                        </tr>
                      ) : (
                        filteredAuditLogs.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100 align-top">
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                              {new Date(row.timestamp).toLocaleString('de-DE')}
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-900">{row.action}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  actionSeverity(row.action) === 'high'
                                    ? 'bg-red-100 text-red-700'
                                    : actionSeverity(row.action) === 'medium'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {actionSeverity(row.action) === 'high'
                                  ? 'HIGH'
                                  : actionSeverity(row.action) === 'medium'
                                    ? 'MEDIUM'
                                    : 'LOW'}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-700">{row.entity_id ?? '—'}</td>
                            <td className="px-3 py-2 font-mono text-slate-700">{row.user_id ?? '—'}</td>
                            <td className="max-w-[360px] px-3 py-2 font-mono text-slate-600">
                              <pre className="whitespace-pre-wrap break-all">
                                {JSON.stringify(row.action_details ?? {}, null, 0)}
                              </pre>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </div>
          ) : null}
          <div className={CARD_CLASS}>
            <CardHeader className="space-y-2 px-0 pt-0">
              <CardTitle className="text-base">Subdomain</CardTitle>
              <CardDescription className="text-slate-500">
                Definiere deine Workspace-URL, z. B. <span className="font-medium">company.refstack.io</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0 pt-1">
              <div className="max-w-md space-y-2">
                <Label htmlFor="workspace-subdomain">Subdomain</Label>
                <Input
                  id="workspace-subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  placeholder="company"
                />
                <p className="text-xs text-slate-500">Die endgültige Domain-Konfiguration erfolgt über das Deployment.</p>
              </div>
            </CardContent>
          </div>
          <div className={CARD_CLASS}>
            <CardHeader className="space-y-2 px-0 pt-0">
              <CardTitle className="text-base">Entwicklung / API Keys</CardTitle>
              <CardDescription className="text-slate-500">
                Verwalte technische Schlüssel für Integrationen und Systemzugriffe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0 pt-1">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-medium">Workspace Branding (opt-in)</p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Nutzt Primär-/Sekundärfarbe für Links, Badges und Akzente. RefStack-Design bleibt Standard.
                  </p>
                </div>
                <Switch
                  checked={useWorkspaceBranding}
                  onCheckedChange={setUseWorkspaceBranding}
                  disabled={roleSwitcher.serverRole !== 'admin'}
                />
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-medium">Workspace API Key</p>
                <p className="mt-2 text-xs text-slate-500">Aus Sicherheitsgründen maskiert. Rotation über sicheren Backend-Flow.</p>
                <Input
                  value={apiKeyMask}
                  onChange={(e) => setApiKeyMask(e.target.value)}
                  className="mt-3 bg-slate-50"
                />
              </div>
              <div className={CARD_CLASS}>
                <SettingsDevRoleCard
                  serverRole={roleSwitcher.serverRole}
                  previewRole={roleSwitcher.previewRole}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={saveWorkspaceAdmin}
                  disabled={!org.id || workspacePending}
                >
                  Workspace speichern
                </Button>
              </div>
            </CardContent>
          </div>
          <div className="rounded-xl border border-red-300 bg-red-50/50 p-6 shadow-sm">
            <p className="text-sm font-semibold text-red-700">Danger Zone</p>
            <p className="mt-1 text-xs text-red-600/90">Workspace inkl. Daten dauerhaft löschen. Nicht rückgängig zu machen.</p>
            <AlertDialog
              onOpenChange={(open) => {
                if (!open) resetWorkspaceDeleteFlow()
              }}
            >
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" className="mt-4">
                  <AppIcon icon={ShieldAlert} size={16} />
                  Workspace löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {workspaceDeleteStep === 1 && 'Workspace wirklich löschen?'}
                    {workspaceDeleteStep === 2 && 'Bitte erneut bestätigen'}
                    {workspaceDeleteStep === 3 && 'Letzte Sicherheitsabfrage'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {workspaceDeleteStep === 1 &&
                      'Diese Aktion betrifft den gesamten Workspace der Firma. Alle Teamdaten und Referenzen wären betroffen.'}
                    {workspaceDeleteStep === 2 &&
                      'Das ist die zweite Bestätigung. Dieser Vorgang ist irreversibel und betrifft alle Nutzer im Workspace.'}
                    {workspaceDeleteStep === 3 &&
                      'Bitte gib zur finalen Bestätigung die Workspace-Subdomain ein.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {workspaceDeleteStep === 3 ? (
                  <div className="space-y-2">
                    <Label htmlFor="workspace-delete-subdomain">Subdomain</Label>
                    <Input
                      id="workspace-delete-subdomain"
                      value={workspaceDeleteSubdomainInput}
                      onChange={(e) => setWorkspaceDeleteSubdomainInput(e.target.value)}
                      placeholder={org.subdomain || 'firmenname'}
                      autoComplete="off"
                    />
                    <p className="text-xs text-slate-500">
                      Gib exakt <span className="font-mono">{org.subdomain || 'deine-subdomain'}</span> ein.
                    </p>
                  </div>
                ) : null}
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault()
                      confirmWorkspaceDeleteStep()
                    }}
                    disabled={
                      workspaceDeleteStep === 3 &&
                      workspaceDeleteSubdomainInput.trim().toLowerCase() !==
                        org.subdomain.trim().toLowerCase()
                    }
                  >
                    {workspaceDeleteStep < 3 ? 'Weiter bestätigen' : 'Final bestätigen'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="team">
        <div className={CARD_CLASS}>
          <SettingsTeamCard initialMembers={teamMembers} />
        </div>
      </TabsContent>

      <TabsContent value="integrations">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              key: 'Salesforce',
              desc: 'Synchronisiere Opportunities und Pipeline-Daten.',
              logo: 'https://logo.clearbit.com/salesforce.com',
              href: 'https://login.salesforce.com/',
            },
            {
              key: 'HubSpot',
              desc: 'Verbinde CRM-Kontakte und Deal-Daten mit RefStack.',
              logo: 'https://logo.clearbit.com/hubspot.com',
              href: 'https://app.hubspot.com/login',
            },
            {
              key: 'Google News',
              desc: 'Nutze News-Signale für Market-Intelligence im Team.',
              logo: 'https://logo.clearbit.com/news.google.com',
              href: 'https://news.google.com/',
            },
            {
              key: 'CIO.de',
              desc: 'Binde deutschsprachige CIO-/IT-Entscheider-Signale für Account Research ein.',
              logo: 'https://logo.clearbit.com/cio.de',
              href: 'https://www.cio.de/',
            },
            {
              key: 'The Org',
              desc: 'Nutze Org-Charts und Rollenwechsel zur Identifikation von Decision Makern.',
              logo: 'https://logo.clearbit.com/theorg.com',
              href: 'https://theorg.com/',
            },
          ].map((integration) => (
            <div key={integration.key} className={CARD_CLASS}>
              <CardHeader className="px-0 pt-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative size-7 overflow-hidden rounded-md border border-slate-200 bg-white">
                    <Image
                      src={integration.logo}
                      alt={`${integration.key} Logo`}
                      fill
                      sizes="28px"
                      className="object-contain p-1"
                      unoptimized
                    />
                  </div>
                  <CardTitle className="text-base">{integration.key}</CardTitle>
                </div>
                <CardDescription className="text-slate-500">{integration.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-0 pb-0 pt-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  <AppIcon icon={PlugSocketIcon} size={14} />
                  Nicht verbunden
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full justify-center" asChild>
                  <a href={integration.href} target="_blank" rel="noreferrer">
                    Verbindung einrichten
                  </a>
                </Button>
              </CardContent>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="workflow">
        <div className="space-y-6">
          <div className={CARD_CLASS}>
            <SettingsExportTemplatesCard
              organizationId={org.id}
              initial={org.exportSettings}
            />
          </div>
          <div className={CARD_CLASS}>
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
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={saveWorkflow}
                  disabled={!org.id || workflowPending}
                >
                  <AppIcon icon={Shield} size={16} />
                  Workflow speichern
                </Button>
              </div>
            </CardContent>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

