"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type WorkspaceStepValue = {
  organizationName: string
  logoDataUrl: string | null
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
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-lg font-semibold tracking-tight">Schritt 1: Workspace</div>
        <div className="text-sm text-muted-foreground">
          {isInvite
            ? `Du trittst „${inviteOrganizationName ?? "einem Workspace"}“ bei. Du kannst den Workspace-Namen hier nicht ändern.`
            : "Lege deinen Workspace an – damit ordnen wir Daten (Referenzen, Deals, Kontakte) korrekt zu."}
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
        <Button type="button" onClick={onNext} disabled={disabled}>
          Weiter →
        </Button>
      </div>
    </div>
  )
}

