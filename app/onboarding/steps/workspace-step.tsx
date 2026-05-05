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
  fullName: string
  phone: string
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Logo konnte nicht gelesen werden."))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

type WorkspaceStepProps = {
  value: WorkspaceStepValue
  onChange: (next: WorkspaceStepValue) => void
  onNext: () => void
  disabled?: boolean
  isInvite: boolean
  inviteOrganizationName: string | null
  inviteRole: "admin" | "sales" | "account_manager" | null
}

function valueRoleIsSales(role: WorkspaceStepValue["role"]) {
  return role === "sales"
}

function salesNeedsPhone(
  isInvite: boolean,
  inviteRole: WorkspaceStepProps["inviteRole"],
  role: WorkspaceStepValue["role"]
) {
  if (isInvite) return inviteRole === "sales"
  return valueRoleIsSales(role)
}

export function WorkspaceStep({
  value,
  onChange,
  onNext,
  disabled,
  isInvite,
  inviteOrganizationName,
  inviteRole,
}: WorkspaceStepProps) {
  const effectiveSales = salesNeedsPhone(isInvite, inviteRole, value.role)
  const phoneDigits = value.phone.replace(/\D/g, "").length
  const phoneOk = !effectiveSales || phoneDigits >= 8

  const canProceed =
    Boolean(value.organizationName.trim()) &&
    Boolean(value.fullName.trim()) &&
    (isInvite || Boolean(value.role)) &&
    phoneOk &&
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

        <div className="space-y-2">
          <Label htmlFor="onboarding_full_name">Dein Name</Label>
          <Input
            id="onboarding_full_name"
            name="onboarding_full_name"
            value={value.fullName}
            onChange={(e) => onChange({ ...value, fullName: e.target.value })}
            placeholder="Max Mustermann"
            disabled={disabled}
            required
            autoComplete="name"
          />
          <p className="text-xs text-muted-foreground">
            Wird u. a. in der Kundenansicht geteilter Links angezeigt.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="onboarding_phone">
            Telefon
            {effectiveSales ? (
              <span className="text-destructive"> *</span>
            ) : null}
          </Label>
          <Input
            id="onboarding_phone"
            name="onboarding_phone"
            type="tel"
            inputMode="tel"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            placeholder="+49 …"
            disabled={disabled}
            required={effectiveSales}
            autoComplete="tel"
          />
          <p className="text-xs text-muted-foreground">
            {effectiveSales
              ? "Pflicht für Sales: erscheint in der Kundenansicht neben der E-Mail."
              : "Optional; für Sales-Kollegen vor dem Teilen von Links empfohlen."}
          </p>
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
              {valueRoleIsSales(value.role) ? (
                <>
                  {" "}
                  Als Sales sind eine gültige Anmelde-E-Mail und eine Telefonnummer (mindestens 8 Ziffern) erforderlich.
                </>
              ) : null}
            </div>
          </div>
        ) : isInvite && inviteRole ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Deine Rolle in diesem Workspace:{" "}
            <span className="font-medium text-foreground">
              {inviteRole === "sales"
                ? "Sales"
                : inviteRole === "admin"
                  ? "Admin"
                  : COPY.roles.accountManager}
            </span>
            {inviteRole === "sales" ? (
              <span> — Telefon und E-Mail werden in der Kundenansicht genutzt.</span>
            ) : null}
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

