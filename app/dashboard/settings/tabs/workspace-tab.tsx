'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { ShieldAlert } from '@hugeicons/core-free-icons'
import { SettingsWorkspaceCard } from '../settings-workspace-card'
import { SettingsTeamCard } from '../settings-team-card'
import { SettingsRolesPermissionsCard } from '../settings-roles-permissions-card'
import { SettingsBillingCard } from '../settings-billing-card'
import { SettingsCapabilityProfile } from '../settings-capability-profile'
import type { RolesPermissionsSettings } from '@/lib/roles/roles-permissions-settings'
import {
  SETTINGS_CARD_CLASS,
  SETTINGS_DANGER_ZONE_CLASS,
  type RegisterSettingsTab,
} from './settings-tab-shared'
import { useRegisterSettingsTab } from './use-register-settings-tab'

type WorkspaceTabProps = {
  org: {
    id: string | null
    name: string
    logoUrl: string | null
    primaryColor: string
    secondaryColor: string
    subdomain: string
    dateDisplayFormat: string
    uiLocale: string
    subscriptionStatus: string | null
    subscriptionId: string | null
    capabilitySettings: {
      capabilityProfile: import('@/lib/organizations/capability-profile-types').CapabilityProfile
      icpDefinition: import('@/lib/deals/icp-rubric').IcpDefinition
    }
  }
  subdomain: string
  onSubdomainChange: (value: string) => void
  teamMembers: Parameters<typeof SettingsTeamCard>[0]['initialMembers']
  isServerAdmin: boolean
  rolesPermissions: RolesPermissionsSettings
  register: RegisterSettingsTab
}

export function WorkspaceTab({
  org,
  subdomain,
  onSubdomainChange,
  teamMembers,
  isServerAdmin,
  rolesPermissions,
  register,
}: WorkspaceTabProps) {
  const [workspaceCardDirty, setWorkspaceCardDirty] = useState(false)
  const [workspaceSaveSignal, setWorkspaceSaveSignal] = useState(0)
  const [workspaceDeleteStep, setWorkspaceDeleteStep] = useState<1 | 2 | 3>(1)
  const [workspaceDeleteSubdomainInput, setWorkspaceDeleteSubdomainInput] = useState('')

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

  function saveWorkspaceTab() {
    if (workspaceCardDirty) {
      setWorkspaceSaveSignal((prev) => prev + 1)
    }
  }

  useRegisterSettingsTab(
    'workspace',
    {
      dirty: workspaceCardDirty,
      pending: false,
      save: saveWorkspaceTab,
    },
    register,
    'card'
  )

  return (
    <TabsContent value="workspace">
      <div className="space-y-6">
        <div className={SETTINGS_CARD_CLASS}>
          <SettingsWorkspaceCard
            organizationId={org.id}
            organizationName={org.name}
            logoUrl={org.logoUrl}
            primaryColor={org.primaryColor}
            secondaryColor={org.secondaryColor}
            dateDisplayFormat={org.dateDisplayFormat}
            uiLocale={org.uiLocale}
            hideSubmitButton
            saveSignal={workspaceSaveSignal}
            onDirtyChange={setWorkspaceCardDirty}
          />
        </div>
        <div className={SETTINGS_CARD_CLASS}>
          <CardHeader className="space-y-2 px-0 pt-0">
            <CardTitle className="text-base">Subdomain</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-1">
            <div className="max-w-md">
              <Input
                id="workspace-subdomain"
                value={subdomain}
                onChange={(e) => onSubdomainChange(e.target.value)}
                placeholder="company"
                aria-label="Subdomain"
              />
            </div>
          </CardContent>
        </div>
        <div className={SETTINGS_DANGER_ZONE_CLASS}>
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

        <div className={SETTINGS_CARD_CLASS}>
          <SettingsTeamCard initialMembers={teamMembers} />
        </div>

        {isServerAdmin ? (
          <div className={SETTINGS_CARD_CLASS}>
            <SettingsRolesPermissionsCard initialSettings={rolesPermissions} />
          </div>
        ) : null}

        <div className={SETTINGS_CARD_CLASS}>
          <SettingsBillingCard
            subscriptionStatus={org.subscriptionStatus}
            subscriptionId={org.subscriptionId}
          />
        </div>

        {isServerAdmin ? (
          <SettingsCapabilityProfile
            initialProfile={org.capabilitySettings.capabilityProfile}
            initialIcp={org.capabilitySettings.icpDefinition}
            canEdit={isServerAdmin}
          />
        ) : null}
      </div>
    </TabsContent>
  )
}
