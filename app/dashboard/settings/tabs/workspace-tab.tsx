'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  }
  subdomain: string
  onSubdomainChange: (value: string) => void
  register: RegisterSettingsTab
}

export function WorkspaceTab({ org, subdomain, onSubdomainChange, register }: WorkspaceTabProps) {
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
            hideSubmitButton
            saveSignal={workspaceSaveSignal}
            onDirtyChange={setWorkspaceCardDirty}
          />
        </div>
        <div className={SETTINGS_CARD_CLASS}>
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
                onChange={(e) => onSubdomainChange(e.target.value)}
                placeholder="company"
              />
              <p className="text-xs text-slate-500">Die endgültige Domain-Konfiguration erfolgt über das Deployment.</p>
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
      </div>
    </TabsContent>
  )
}
