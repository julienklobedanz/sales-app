"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COPY } from "@/lib/copy"

export type WorkspaceStepValue = {
  organizationName: string
  logoDataUrl: string | null
  role: "admin" | "account_manager" | "sales"
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Logo konnte nicht gelesen werden."))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

export function WorkspaceStep({
  value,
  onChange,
  onNext,
  disabled,
  isInvite,
  inviteOrganizationName,
}: {
  value: WorkspaceStepValue
  onChange: (next: WorkspaceStepValue) => void
  onNext: () => void
  disabled?: boolean
  isInvite: boolean
  inviteOrganizationName: string | null
}) {
  const canProceed =
    Boolean(value.organizationName.trim()) &&
    (isInvite || Boolean(value.role)) &&
    !disabled

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-lg font-semibold tracking-tight">Schritt 1: {COPY.misc.workspace}</div>
        <div className="text-sm text-muted-foreground">
          {isInvite
            ? `Du trittst „${inviteOrganizationName ?? `einem ${COPY.misc.workspace}` }“ bei. Du kannst den ${COPY.misc.workspace}-Namen hier nicht ändern.`
            : `Lege deinen ${COPY.misc.workspace} an – damit ordnen wir Daten (Referenzen, Deals, Kontakte) korrekt zu.`}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="organization_name">Name</Label>
          <Input
            id="organization_name"
            name="organization_name"
            value={value.organizationName}
            onChange={(e) => onChange({ ...value, organizationName: e.target.value })}
            placeholder="Firma XY GmbH"
            disabled={disabled || isInvite}
            required={!isInvite}
          />
        </div>

        {!isInvite ? (
          <div className="space-y-2">
            <Label>Deine Rolle</Label>
            <Select
              value={value.role}
              onValueChange={(v) =>
                onChange({
                  ...value,
                  role: v as WorkspaceStepValue["role"],
                })
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Bitte auswählen…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="account_manager">{COPY.roles.accountManager}</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Diese Auswahl gilt für deinen User-Account. Eingeladene Teammitglieder bekommen ihre Rolle aus der Einladung.
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="logo">Logo (optional)</Label>
          <Input
            id="logo"
            name="logo"
            type="file"
            accept="image/*"
            disabled={disabled || isInvite}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const dataUrl = await fileToDataUrl(file)
              onChange({ ...value, logoDataUrl: dataUrl })
            }}
          />
          {value.logoDataUrl ? (
            <div className="text-xs text-muted-foreground">Logo ausgewählt.</div>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={onNext} disabled={!canProceed}>
          Weiter →
        </Button>
      </div>
    </div>
  )
}

