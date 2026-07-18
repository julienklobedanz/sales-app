'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DevRolePreview } from '@/lib/dev-role-preview'
import type { RolesPermissionsSettings } from '@/lib/roles/roles-permissions-settings'
import { SettingsTeamCard } from './settings-team-card'
import type { ExportSettings } from './settings-export-templates-actions'
import { StickySaveBar } from './sticky-save-bar'
import { ProfileTab } from './tabs/profile-tab'
import { WorkspaceTab } from './tabs/workspace-tab'
import { AdminTab } from './tabs/admin-tab'
import { IntegrationsTab } from './tabs/integrations-tab'
import { WorkflowTab } from './tabs/workflow-tab'
import type {
  RegisterSettingsTab,
  SettingsTabHandlers,
  SettingsTabId,
} from './tabs/settings-tab-shared'
import { resolveSettingsTabId } from './tabs/settings-tab-shared'

export function SettingsTabs({
  devRolePreviewEnabled = false,
  roleSwitcher,
  profile,
  org,
  teamMembers,
  auditLogs,
  hubspotIntegration,
  rolesPermissions,
}: {
  devRolePreviewEnabled?: boolean
  roleSwitcher: {
    serverRoles: DevRolePreview
    previewRoles: DevRolePreview | null
    isServerAdmin: boolean
  }
  profile: {
    userEmail: string
    firstName: string
    lastName: string
    avatarUrl: string | null
    bookingUrl: string | null
    phone: string | null
    profileRole: 'admin' | 'sales' | 'account_manager'
    notificationSettings: {
      emailOnNewMatch: boolean
      emailOnApprovalUpdate: boolean
      emailDailyMarketSignalsDigest: boolean
      emailDigestEmptyDay: boolean
      digestTimezone: string
      digestLocalTime: string
      emailInstantMarketSignals: boolean
      browserPushMarketSignals: boolean
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
      referenceHighlightGlossary: string
    }
    capabilitySettings: {
      capabilityProfile: import('@/lib/organizations/capability-profile-types').CapabilityProfile
      icpDefinition: import('@/lib/deals/icp-rubric').IcpDefinition
    }
    dateDisplayFormat: string
    uiLocale: string
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
  hubspotIntegration?: {
    configured: boolean
    connected: boolean
    canManage: boolean
    externalAccountId: string | null
    lastSyncAt: string | null
  }
  rolesPermissions: RolesPermissionsSettings
}) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('profile')
  const [subdomain, setSubdomain] = useState(org.subdomain)
  const [registryVersion, setRegistryVersion] = useState(0)
  const searchParams = useSearchParams()
  const handlerPartsRef = useRef<Partial<Record<SettingsTabId, Map<string, SettingsTabHandlers>>>>({})

  useEffect(() => {
    const resolved = resolveSettingsTabId(searchParams.get('tab'))
    if (resolved) setActiveTab(resolved)
  }, [searchParams])

  const registerTab = useCallback<RegisterSettingsTab>((tabId, handlers, partKey = 'default') => {
    if (!handlerPartsRef.current[tabId]) {
      handlerPartsRef.current[tabId] = new Map()
    }
    const parts = handlerPartsRef.current[tabId]!
    if (handlers === null) {
      parts.delete(partKey)
      if (parts.size === 0) {
        delete handlerPartsRef.current[tabId]
      }
    } else {
      parts.set(partKey, handlers)
    }
    setRegistryVersion((v) => v + 1)
  }, [])

  const mergedHandlers = useMemo(() => {
    void registryVersion
    const result: Partial<Record<SettingsTabId, SettingsTabHandlers>> = {}

    for (const [tabId, parts] of Object.entries(handlerPartsRef.current) as Array<
      [SettingsTabId, Map<string, SettingsTabHandlers>]
    >) {
      const partList = Array.from(parts.values())
      if (partList.length === 0) continue

      result[tabId] = {
        dirty: partList.some((p) => p.dirty),
        pending: partList.some((p) => p.pending),
        save: () => {
          for (const part of partList) {
            if (part.dirty) part.save()
          }
        },
      }
    }

    return result
  }, [registryVersion])

  const activeHandlers = mergedHandlers[activeTab]
  const stickyVisible = activeHandlers?.dirty ?? false
  const stickyPending = activeHandlers?.pending ?? false

  function saveActiveTabChanges() {
    activeHandlers?.save()
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTabId)} className="gap-6 pb-20">
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="profile" className="after:hidden">
          Persönlich
        </TabsTrigger>
        <TabsTrigger value="workspace" className="after:hidden">
          Workspace
        </TabsTrigger>
        <TabsTrigger value="integrations" className="after:hidden">
          Verbindungen
        </TabsTrigger>
        <TabsTrigger value="process" className="after:hidden">
          Prozess
        </TabsTrigger>
      </TabsList>

      <ProfileTab profile={profile} register={registerTab} />
      <WorkspaceTab
        org={org}
        subdomain={subdomain}
        onSubdomainChange={setSubdomain}
        teamMembers={teamMembers}
        isServerAdmin={roleSwitcher.isServerAdmin}
        rolesPermissions={rolesPermissions}
        register={registerTab}
      />
      <IntegrationsTab hubspotIntegration={hubspotIntegration} />
      {/* Same tab value: both panels render under Prozess */}
      <WorkflowTab org={org} register={registerTab} />
      <AdminTab
        devRolePreviewEnabled={devRolePreviewEnabled}
        roleSwitcher={roleSwitcher}
        org={org}
        auditLogs={auditLogs}
        register={registerTab}
      />

      <StickySaveBar
        visible={stickyVisible}
        pending={stickyPending}
        onSave={saveActiveTabChanges}
      />
    </Tabs>
  )
}
