'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import type { DevRolePreview } from '@/lib/dev-role-preview'
import { SettingsDevRoleCard } from '../settings-dev-role-card'
import {
  updateWorkspaceAdminSettings,
  updateWorkspaceReferenceHighlightGlossary,
  updateWorkspaceSecurityCompliance,
} from '../settings-consolidation-actions'
import {
  SETTINGS_CARD_CLASS,
  type RegisterSettingsTab,
} from './settings-tab-shared'
import { useRegisterSettingsTab } from './use-register-settings-tab'

type AdminTabProps = {
  devRolePreviewEnabled?: boolean
  roleSwitcher: {
    serverRoles: DevRolePreview
    previewRoles: DevRolePreview | null
    isServerAdmin: boolean
  }
  org: {
    subdomain: string
    subscriptionStatus: string | null
    subscriptionId: string | null
    apiSettings: {
      apiKeyMask: string
      useWorkspaceBranding: boolean
    }
    workflowSettings: {
      publicLinkMaxTtlDays: number
      publicLinkRequirePasswordForNew: boolean
      auditLogRetentionDays: number
      referenceHighlightGlossary: string
    }
  }
  auditLogs: Array<{
    id: string
    action: string
    entity_id: string | null
    action_details: Record<string, unknown> | null
    timestamp: string
    user_id: string | null
  }>
  register: RegisterSettingsTab
}

export function AdminTab({
  devRolePreviewEnabled = false,
  roleSwitcher,
  org,
  auditLogs,
  register,
}: AdminTabProps) {
  const [apiKeyMask, setApiKeyMask] = useState(org.apiSettings.apiKeyMask)
  const [useWorkspaceBranding, setUseWorkspaceBranding] = useState(
    org.apiSettings.useWorkspaceBranding
  )
  const [publicLinkMaxTtl, setPublicLinkMaxTtl] = useState(
    String(org.workflowSettings.publicLinkMaxTtlDays)
  )
  const [publicLinkReqPwNew, setPublicLinkReqPwNew] = useState(
    org.workflowSettings.publicLinkRequirePasswordForNew
  )
  const [auditRetentionDays, setAuditRetentionDays] = useState(
    String(org.workflowSettings.auditLogRetentionDays)
  )
  const [referenceHighlightGlossary, setReferenceHighlightGlossary] = useState(
    org.workflowSettings.referenceHighlightGlossary
  )
  const [workspacePending, startWorkspaceTransition] = useTransition()
  const [securityPending, startSecurityTransition] = useTransition()
  const [glossaryPending, startGlossaryTransition] = useTransition()
  const [auditActionFilter, setAuditActionFilter] = useState('all')
  const [auditSearch, setAuditSearch] = useState('')
  const [auditTimeFilter, setAuditTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('7d')
  const [auditQuickView, setAuditQuickView] = useState<'all' | 'security' | 'policy'>('all')
  const [auditNowTs] = useState(() => new Date().getTime())

  const workspaceSecurityDirty =
    publicLinkMaxTtl !== String(org.workflowSettings.publicLinkMaxTtlDays) ||
    publicLinkReqPwNew !== org.workflowSettings.publicLinkRequirePasswordForNew ||
    auditRetentionDays !== String(org.workflowSettings.auditLogRetentionDays)

  const adminDirty =
    apiKeyMask !== org.apiSettings.apiKeyMask ||
    useWorkspaceBranding !== org.apiSettings.useWorkspaceBranding ||
    referenceHighlightGlossary !== org.workflowSettings.referenceHighlightGlossary

  function saveWorkspaceAdmin() {
    startWorkspaceTransition(async () => {
      const result = await updateWorkspaceAdminSettings({
        subdomain: org.subdomain,
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

  function saveReferenceHighlightGlossary() {
    startGlossaryTransition(async () => {
      const result = await updateWorkspaceReferenceHighlightGlossary(referenceHighlightGlossary)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Hervorhebungs-Glossar gespeichert')
    })
  }

  function saveAdminTab() {
    if (
      apiKeyMask !== org.apiSettings.apiKeyMask ||
      useWorkspaceBranding !== org.apiSettings.useWorkspaceBranding
    ) {
      saveWorkspaceAdmin()
    }
    if (referenceHighlightGlossary !== org.workflowSettings.referenceHighlightGlossary) {
      saveReferenceHighlightGlossary()
    }
  }

  function saveWorkspaceSecurityTab() {
    if (workspaceSecurityDirty) {
      saveSecurityCompliance()
    }
  }

  useRegisterSettingsTab(
    'process',
    {
      dirty: adminDirty,
      pending: workspacePending || glossaryPending,
      save: saveAdminTab,
    },
    register
  )

  useRegisterSettingsTab(
    'process',
    {
      dirty: workspaceSecurityDirty,
      pending: securityPending,
      save: saveWorkspaceSecurityTab,
    },
    register,
    'security'
  )

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

  return (
    <TabsContent value="process">
      <div className="space-y-6">
        <div className={SETTINGS_CARD_CLASS}>
          <CardHeader className="space-y-2 px-0 pt-0">
            <CardTitle className="text-base">Entwicklung / API-Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0 pb-0 pt-1">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium">Workspace Branding (opt-in)</p>
              </div>
              <Switch
                checked={useWorkspaceBranding}
                onCheckedChange={setUseWorkspaceBranding}
                disabled={!roleSwitcher.isServerAdmin}
              />
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-medium">Workspace API Key</p>
              <Input
                value={apiKeyMask}
                onChange={(e) => setApiKeyMask(e.target.value)}
                className="mt-3 bg-slate-50"
              />
            </div>
            {devRolePreviewEnabled ? (
              <div className={SETTINGS_CARD_CLASS}>
                <SettingsDevRoleCard
                  serverRoles={roleSwitcher.serverRoles}
                  previewRoles={roleSwitcher.previewRoles}
                />
              </div>
            ) : null}
          </CardContent>
        </div>

        <div className={SETTINGS_CARD_CLASS}>
          <CardHeader className="space-y-2 px-0 pt-0">
            <CardTitle className="text-base">Security & Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-0 pb-0 pt-1">
            <div className="max-w-md space-y-2">
              <Label htmlFor="public-link-max-ttl">Maximale Link-Gültigkeit (Tage)</Label>
              <Input
                id="public-link-max-ttl"
                value={publicLinkMaxTtl}
                onChange={(e) => setPublicLinkMaxTtl(e.target.value)}
                inputMode="numeric"
                disabled={!roleSwitcher.isServerAdmin}
                className={!roleSwitcher.isServerAdmin ? 'bg-slate-50' : ''}
              />
            </div>
            <div className="max-w-md space-y-2">
              <Label htmlFor="audit-retention-days">Audit-Retention (Tage)</Label>
              <Input
                id="audit-retention-days"
                value={auditRetentionDays}
                onChange={(e) => setAuditRetentionDays(e.target.value)}
                inputMode="numeric"
                disabled={!roleSwitcher.isServerAdmin}
                className={!roleSwitcher.isServerAdmin ? 'bg-slate-50' : ''}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium">Passwort für neue Links erzwingen</p>
              </div>
              <Switch
                checked={publicLinkReqPwNew}
                onCheckedChange={setPublicLinkReqPwNew}
                disabled={!roleSwitcher.isServerAdmin}
              />
            </div>
          </CardContent>
        </div>

        {roleSwitcher.isServerAdmin ? (
          <div className={SETTINGS_CARD_CLASS}>
            <CardHeader className="space-y-2 px-0 pt-0">
              <CardTitle className="text-base">Referenztext-Hervorhebungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-0 pb-0 pt-1">
              <div className="space-y-2">
                <Label htmlFor="ref-highlight-glossary">Workspace-Glossar (optional)</Label>
                <Textarea
                  id="ref-highlight-glossary"
                  value={referenceHighlightGlossary}
                  onChange={(e) => setReferenceHighlightGlossary(e.target.value)}
                  placeholder={'z. B. Lakehouse\nGovernance\nProcess Mining'}
                  rows={5}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </div>
        ) : null}

        {roleSwitcher.isServerAdmin ? (
          <div className={SETTINGS_CARD_CLASS}>
            <CardHeader className="space-y-2 px-0 pt-0">
              <CardTitle className="text-base">Audit Log</CardTitle>
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
                      <th className="px-3 py-2 text-left font-medium">Entity</th>
                      <th className="px-3 py-2 text-left font-medium">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-slate-500" colSpan={4}>
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
                          <td className="px-3 py-2 font-mono text-slate-700">{row.entity_id ?? '—'}</td>
                          <td className="px-3 py-2 font-mono text-slate-700">{row.user_id ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </div>
        ) : null}
      </div>
    </TabsContent>
  )
}
