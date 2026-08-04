'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COPY } from '@/lib/copy'
import type { Capability, FunctionRole } from '@/lib/roles/capabilities'
import {
  defaultVisibilityCapabilityMatrix,
  isVisibilityCapability,
  ROLES_PERMISSIONS_VISIBILITY_CAPABILITIES,
  type ApprovalRoutingMode,
  type RolesPermissionsSettings,
  type RolesPermissionsVisibilityCapability,
} from '@/lib/roles/roles-permissions-settings'
import { updateRolesPermissionsSettings } from './roles-permissions-actions'

const FUNCTION_ROLES: FunctionRole[] = ['sales_rep', 'account_manager', 'sales_leader']

function capabilityLabel(cap: RolesPermissionsVisibilityCapability): string {
  return COPY.settings.rolesPermissions.capabilities[cap] ?? cap
}

function mergeCapabilityMatrix(
  settings: RolesPermissionsSettings,
): Record<FunctionRole, Capability[]> {
  const defaults = defaultVisibilityCapabilityMatrix()
  const out = { ...defaults }
  for (const role of FUNCTION_ROLES) {
    const orgCaps = settings.function_role_capabilities?.[role]
    if (orgCaps) {
      out[role] = orgCaps.filter(isVisibilityCapability)
    }
  }
  return out
}

export function SettingsRolesPermissionsCard({
  initialSettings,
}: {
  initialSettings: RolesPermissionsSettings
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [salesSeesDrafts, setSalesSeesDrafts] = useState(
    () => initialSettings.sales_sees_drafts === true,
  )
  const [capMatrix, setCapMatrix] = useState(() => mergeCapabilityMatrix(initialSettings))
  const [approvalMode, setApprovalMode] = useState<ApprovalRoutingMode>(
    () => initialSettings.approval_routing?.mode ?? 'am_direct',
  )
  const [labels, setLabels] = useState({
    draft: initialSettings.sensitivity_labels?.draft ?? '',
    nda: initialSettings.sensitivity_labels?.nda ?? '',
    confidentialSales: initialSettings.sensitivity_labels?.confidential_sales ?? '',
  })

  const dirty = useMemo(() => {
    const base = mergeCapabilityMatrix(initialSettings)
    const capsChanged = FUNCTION_ROLES.some((role) => {
      const a = [...(capMatrix[role] ?? [])].sort().join(',')
      const b = [...(base[role] ?? [])].sort().join(',')
      return a !== b
    })
    return (
      capsChanged ||
      salesSeesDrafts !== (initialSettings.sales_sees_drafts === true) ||
      approvalMode !== (initialSettings.approval_routing?.mode ?? 'am_direct') ||
      labels.draft !== (initialSettings.sensitivity_labels?.draft ?? '') ||
      labels.nda !== (initialSettings.sensitivity_labels?.nda ?? '') ||
      labels.confidentialSales !==
        (initialSettings.sensitivity_labels?.confidential_sales ?? '')
    )
  }, [capMatrix, initialSettings, salesSeesDrafts, approvalMode, labels])

  function toggleCap(role: FunctionRole, cap: Capability, enabled: boolean) {
    setCapMatrix((prev) => {
      const set = new Set(prev[role] ?? [])
      if (enabled) set.add(cap)
      else set.delete(cap)
      return { ...prev, [role]: [...set] }
    })
  }

  function save() {
    start(async () => {
      const res = await updateRolesPermissionsSettings({
        salesSeesDrafts,
        functionRoleCapabilities: capMatrix,
        approvalRoutingMode: approvalMode,
        sensitivityLabels: labels,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success(COPY.settings.rolesPermissions.saveSuccess)
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {COPY.settings.rolesPermissions.title}
        </h2>
      </div>

      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">
              {COPY.settings.rolesPermissions.salesSeesDraftsLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {COPY.settings.rolesPermissions.salesSeesDraftsHint}
            </p>
          </div>
          <Switch
            checked={salesSeesDrafts}
            onCheckedChange={setSalesSeesDrafts}
            disabled={pending}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium">
          {COPY.settings.rolesPermissions.visibilityMatrixTitle}
        </h3>
        {FUNCTION_ROLES.map((role) => (
          <div key={role} className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-medium">
              {COPY.roleDimensions.functionRoles[role]}
            </p>
            <div className="flex flex-col gap-3">
              {ROLES_PERMISSIONS_VISIBILITY_CAPABILITIES.map((cap) => {
                const checked = (capMatrix[role] ?? []).includes(cap)
                return (
                  <div key={cap} className="flex items-center justify-between gap-4">
                    <Label htmlFor={`${role}-${cap}`} className="text-sm font-normal">
                      {capabilityLabel(cap)}
                    </Label>
                    <Switch
                      id={`${role}-${cap}`}
                      checked={checked}
                      disabled={pending}
                      onCheckedChange={(v) => toggleCap(role, cap, v)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>{COPY.settings.rolesPermissions.approvalRoutingLabel}</Label>
        <Select
          value={approvalMode}
          onValueChange={(v) => setApprovalMode(v as ApprovalRoutingMode)}
          disabled={pending}
        >
          <SelectTrigger className="max-w-md bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="am_direct">
              {COPY.settings.rolesPermissions.approvalRouting.am_direct}
            </SelectItem>
            <SelectItem value="via_rpm">
              {COPY.settings.rolesPermissions.approvalRouting.via_rpm}
            </SelectItem>
            <SelectItem value="legal_gate_on_nda">
              {COPY.settings.rolesPermissions.approvalRouting.legal_gate_on_nda}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {COPY.settings.rolesPermissions.approvalRoutingHint}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="label-draft">
            {COPY.settings.rolesPermissions.sensitivityDraft}
          </Label>
          <Input
            id="label-draft"
            value={labels.draft}
            onChange={(e) => setLabels((p) => ({ ...p, draft: e.target.value }))}
            disabled={pending}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label-nda">
            {COPY.settings.rolesPermissions.sensitivityNda}
          </Label>
          <Input
            id="label-nda"
            value={labels.nda}
            onChange={(e) => setLabels((p) => ({ ...p, nda: e.target.value }))}
            disabled={pending}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label-conf">
            {COPY.settings.rolesPermissions.sensitivityConfidential}
          </Label>
          <Input
            id="label-conf"
            value={labels.confidentialSales}
            onChange={(e) =>
              setLabels((p) => ({ ...p, confidentialSales: e.target.value }))
            }
            disabled={pending}
            className="bg-background"
          />
        </div>
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button type="button" disabled={pending || !dirty} onClick={save}>
          {pending ? 'Speichern …' : COPY.settings.rolesPermissions.save}
        </Button>
      </div>
    </div>
  )
}
