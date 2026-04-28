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
} from './settings-consolidation-actions'

const CARD_CLASS = 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'

export function SettingsTabs({
  roleSwitcher,
  profile,
  org,
  teamMembers,
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
    }
  }
  teamMembers: Parameters<typeof SettingsTeamCard>[0]['initialMembers']
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

