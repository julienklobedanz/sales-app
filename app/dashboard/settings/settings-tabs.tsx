'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AppRole } from '@/hooks/useRole'
import { COPY } from '@/lib/copy'
import { SettingsProfileCard } from './settings-profile-card'
import { SettingsTeamCard } from './settings-team-card'
import { SettingsWorkspaceCard } from './settings-workspace-card'
import { SettingsBillingCard } from './settings-billing-card'
import { SettingsExportTemplatesCard } from './settings-export-templates-card'
import { SettingsDevRoleCard } from './settings-dev-role-card'
import type { ExportSettings } from './settings-export-templates-actions'

const CARD_CLASS = 'rounded-3xl border bg-card text-card-foreground p-6 shadow-sm'

export function SettingsTabs({
  devRolePreview,
  profile,
  org,
  teamMembers,
}: {
  /** Nur gesetzt, wenn {@link isDevRolePreviewEnabled} auf dem Server true ist. */
  devRolePreview?: {
    serverRole: AppRole
    previewRole: AppRole | null
  }
  profile: {
    userEmail: string
    firstName: string
    lastName: string
    avatarUrl: string | null
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
  }
  teamMembers: Parameters<typeof SettingsTeamCard>[0]['initialMembers']
}) {
  return (
    <Tabs defaultValue="workspace" className="gap-6">
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="workspace">Workspace</TabsTrigger>
        {devRolePreview ? (
          <TabsTrigger value="dev">{COPY.settings.devRoleTab}</TabsTrigger>
        ) : null}
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="integrations" disabled>
          Integrationen (P2)
        </TabsTrigger>
        <TabsTrigger value="notifications" disabled>
          Benachr. (P2)
        </TabsTrigger>
        <TabsTrigger value="export">Export-Templates</TabsTrigger>
        <TabsTrigger value="profile">Profil</TabsTrigger>
        <TabsTrigger value="billing" disabled>
          Billing (P2)
        </TabsTrigger>
      </TabsList>

      {devRolePreview ? (
        <TabsContent value="dev">
          <div className={CARD_CLASS}>
            <SettingsDevRoleCard
              serverRole={devRolePreview.serverRole}
              previewRole={devRolePreview.previewRole}
            />
          </div>
        </TabsContent>
      ) : null}

      <TabsContent value="workspace">
        <div className="grid gap-6 sm:grid-cols-2">
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
      </TabsContent>

      <TabsContent value="team">
        <div className={CARD_CLASS}>
          <SettingsTeamCard initialMembers={teamMembers} />
        </div>
      </TabsContent>

      <TabsContent value="export">
        <div className={CARD_CLASS}>
          <SettingsExportTemplatesCard
            organizationId={org.id}
            initial={org.exportSettings}
          />
        </div>
      </TabsContent>

      <TabsContent value="profile">
        <div className={CARD_CLASS}>
          <SettingsProfileCard
            userEmail={profile.userEmail}
            firstName={profile.firstName}
            lastName={profile.lastName}
            avatarUrl={profile.avatarUrl}
          />
        </div>
      </TabsContent>

      {/* P2 placeholders */}
      <TabsContent value="integrations">
        <div className={CARD_CLASS}>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </div>
      </TabsContent>
      <TabsContent value="notifications">
        <div className={CARD_CLASS}>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </div>
      </TabsContent>
      <TabsContent value="billing">
        <div className={CARD_CLASS}>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </div>
      </TabsContent>
    </Tabs>
  )
}

