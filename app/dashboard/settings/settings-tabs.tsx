'use client'

import { useState, useTransition } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import type { AppRole } from '@/hooks/useRole'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AppIcon } from '@/lib/icons'
import { Calendar, LinkIcon, PlugSocketIcon, Shield, ShieldAlert, Trash2 } from '@hugeicons/core-free-icons'
import { SettingsProfileCard } from './settings-profile-card'
import { SettingsTeamCard } from './settings-team-card'
import { SettingsWorkspaceCard } from './settings-workspace-card'
import { SettingsBillingCard } from './settings-billing-card'
import { SettingsExportTemplatesCard } from './settings-export-templates-card'
import { SettingsDevRoleCard } from './settings-dev-role-card'
import type { ExportSettings } from './settings-export-templates-actions'
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
      publicLinkMaxTtlDays: number
      publicLinkRequirePasswordForNew: boolean
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
  const [securityPending, startSecurityTransition] = useTransition()
  const [auditActionFilter, setAuditActionFilter] = useState('all')
  const [auditSearch, setAuditSearch] = useState('')
  const [auditTimeFilter, setAuditTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('7d')
  const [auditQuickView, setAuditQuickView] = useState<'all' | 'security' | 'policy'>('all')

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
      const result = await updateWorkflowSettings({
        linkExpiryDays: Number.isFinite(parsed) ? parsed : 14,
        requireInternalApproval,
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
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Sicherheitsrichtlinien gespeichert')
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
      const now = Date.now()
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
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base">Security & Compliance</CardTitle>
              <CardDescription className="text-slate-500">
                Globale Regeln für öffentliche Kundenlinks (DSGVO: Speicherbegrenzung, Zugriffskontrolle). Nur
                Administratoren.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0">
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
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium">Passwort für neue Links erzwingen</p>
                  <p className="text-xs text-slate-500">
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
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base">Audit Log</CardTitle>
                <CardDescription className="text-slate-500">
                  Nachweisbare Security- und Compliance-Ereignisse (PII-minimiert, IDs only).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-0 pb-0">
                <div className="flex flex-wrap items-center gap-2">
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
                <div className="max-h-[360px] overflow-auto rounded-lg border border-slate-200">
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
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base">Subdomain</CardTitle>
              <CardDescription className="text-slate-500">
                Definiere deine Workspace-URL, z. B. <span className="font-medium">company.refstack.io</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
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
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base">Entwicklung / API Keys</CardTitle>
              <CardDescription className="text-slate-500">
                Verwalte technische Schlüssel für Integrationen und Systemzugriffe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-0 pb-0">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium">Workspace Branding (opt-in)</p>
                  <p className="text-xs text-slate-500">
                    Nutzt Primär-/Sekundärfarbe für Links, Badges und Akzente. RefStack-Design bleibt Standard.
                  </p>
                </div>
                <Switch
                  checked={useWorkspaceBranding}
                  onCheckedChange={setUseWorkspaceBranding}
                  disabled={roleSwitcher.serverRole !== 'admin'}
                />
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium">Workspace API Key</p>
                <p className="mt-1 text-xs text-slate-500">Aus Sicherheitsgründen maskiert. Rotation über sicheren Backend-Flow.</p>
                <Input
                  value={apiKeyMask}
                  onChange={(e) => setApiKeyMask(e.target.value)}
                  className="mt-2 bg-slate-50"
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
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-4"
              onClick={() => toast.error('Workspace-Löschung wird in einem gesicherten Backend-Flow freigeschaltet.')}
            >
              <AppIcon icon={ShieldAlert} size={16} />
              Workspace löschen
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="team">
        <div className={CARD_CLASS}>
          <SettingsTeamCard initialMembers={teamMembers} />
        </div>
      </TabsContent>

      <TabsContent value="integrations">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { key: 'Salesforce', desc: 'Synchronisiere Opportunities und Pipeline-Daten.', icon: PlugSocketIcon },
            { key: 'HubSpot', desc: 'Verbinde CRM-Kontakte und Deal-Daten mit RefStack.', icon: LinkIcon },
            { key: 'Google News', desc: 'Nutze News-Signale für Market-Intelligence im Team.', icon: Calendar },
          ].map((integration) => (
            <div key={integration.key} className={CARD_CLASS}>
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base">{integration.key}</CardTitle>
                <CardDescription className="text-slate-500">{integration.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-0 pb-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  <AppIcon icon={PlugSocketIcon} size={14} />
                  Nicht verbunden
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full justify-center">
                  Verbindung einrichten
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
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base">Freigabe-Workflow</CardTitle>
              <CardDescription className="text-slate-500">
                Steuere Ablaufregeln für Links und interne Freigabeprozesse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0">
              <div className="max-w-sm space-y-2">
                <Label htmlFor="link-expiry-days">Link Expiry (Tage)</Label>
                <Input
                  id="link-expiry-days"
                  value={linkExpiryDays}
                  onChange={(e) => setLinkExpiryDays(e.target.value)}
                  inputMode="numeric"
                />
                <p className="text-xs text-slate-500">Definiert die Standard-Gültigkeit neuer Share-Links.</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium">Interne Freigabe erzwingen</p>
                  <p className="text-xs text-slate-500">Neue Referenzen benötigen vor externem Teilen eine interne Freigabe.</p>
                </div>
                <Switch checked={requireInternalApproval} onCheckedChange={setRequireInternalApproval} />
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

