'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
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
import { deleteWorkspace } from '../settings-workspace-actions'
import type { OrganizationBillingSettings } from '@/lib/organizations/billing-settings'
import type { RolesPermissionsSettings } from '@/lib/roles/roles-permissions-settings'
import { ROUTES } from '@/lib/routes'
import {
  SETTINGS_CARD_CLASS_COMPACT,
  SETTINGS_DANGER_ZONE_CLASS_COMPACT,
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
    billingSettings: OrganizationBillingSettings
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
  const router = useRouter()
  const [workspaceCardDirty, setWorkspaceCardDirty] = useState(false)
  const [workspaceSaveSignal, setWorkspaceSaveSignal] = useState(0)
  const [workspaceDeleteStep, setWorkspaceDeleteStep] = useState<1 | 2 | 3>(1)
  const [workspaceDeleteSubdomainInput, setWorkspaceDeleteSubdomainInput] = useState('')
  const [deletePending, startDeleteTransition] = useTransition()

  function resetWorkspaceDeleteFlow() {
    setWorkspaceDeleteStep(1)
    setWorkspaceDeleteSubdomainInput('')
  }

  function confirmWorkspaceDeleteStep() {
    if (workspaceDeleteStep < 3) {
      setWorkspaceDeleteStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev))
      return
    }
    startDeleteTransition(async () => {
      const result = await deleteWorkspace(workspaceDeleteSubdomainInput)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Workspace gelöscht.')
      resetWorkspaceDeleteFlow()
      router.push(ROUTES.onboarding)
    })
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
    'card',
  )

  return (
    <TabsContent value="workspace">
      <div className="space-y-4">
        <div className={SETTINGS_CARD_CLASS_COMPACT}>
          <SettingsWorkspaceCard
            organizationId={org.id}
            organizationName={org.name}
            logoUrl={org.logoUrl}
            primaryColor={org.primaryColor}
            secondaryColor={org.secondaryColor}
            dateDisplayFormat={org.dateDisplayFormat}
            uiLocale={org.uiLocale}
            subdomain={subdomain}
            savedSubdomain={org.subdomain}
            onSubdomainChange={onSubdomainChange}
            billingSettings={org.billingSettings}
            hideSubmitButton
            saveSignal={workspaceSaveSignal}
            onDirtyChange={setWorkspaceCardDirty}
          />
        </div>

        <div className={SETTINGS_CARD_CLASS_COMPACT}>
          <SettingsTeamCard initialMembers={teamMembers} />
        </div>

        <div className={`grid gap-4 ${isServerAdmin ? 'lg:grid-cols-2' : ''}`}>
          {isServerAdmin ? (
            <div className={SETTINGS_CARD_CLASS_COMPACT}>
              <SettingsRolesPermissionsCard initialSettings={rolesPermissions} />
            </div>
          ) : null}
          {isServerAdmin ? (
            <div className={SETTINGS_CARD_CLASS_COMPACT}>
              <SettingsBillingCard
                subscriptionStatus={org.subscriptionStatus}
                subscriptionId={org.subscriptionId}
              />
            </div>
          ) : null}
        </div>

        {isServerAdmin ? (
          <SettingsCapabilityProfile
            initialProfile={org.capabilitySettings.capabilityProfile}
            initialIcp={org.capabilitySettings.icpDefinition}
            canEdit={isServerAdmin}
            compact
          />
        ) : null}

        {isServerAdmin ? (
          <div className={SETTINGS_DANGER_ZONE_CLASS_COMPACT}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">Danger Zone</p>
                <p className="mt-0.5 text-xs text-red-600/90">
                  Workspace inkl. Daten dauerhaft löschen. Nicht rückgängig zu machen.
                </p>
              </div>
              <AlertDialog
                onOpenChange={(open) => {
                  if (!open) resetWorkspaceDeleteFlow()
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="shrink-0"
                  >
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
                        Gib exakt{' '}
                        <span className="font-mono">
                          {org.subdomain || 'deine-subdomain'}
                        </span>{' '}
                        ein.
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
                        deletePending ||
                        (workspaceDeleteStep === 3 &&
                          workspaceDeleteSubdomainInput.trim().toLowerCase() !==
                            org.subdomain.trim().toLowerCase())
                      }
                    >
                      {workspaceDeleteStep < 3
                        ? 'Weiter bestätigen'
                        : deletePending
                          ? 'Löscht …'
                          : 'Final bestätigen'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : null}
      </div>
    </TabsContent>
  )
}
