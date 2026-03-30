"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type InviteRole = "sales" | "account_manager" | "admin"

export type TeamInviteRow = {
  email: string
  role: InviteRole
}

export function TeamStep({
  invites,
  onChange,
  onSkip,
  onFinish,
  sending,
  disabled,
}: {
  invites: TeamInviteRow[]
  onChange: (next: TeamInviteRow[]) => void
  onSkip: () => void
  onFinish: () => void
  sending: boolean
  disabled?: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-lg font-semibold tracking-tight">Schritt 3: Team einladen (optional)</div>
        <div className="text-sm text-muted-foreground">
          Lade bis zu 3 Personen per E-Mail ein. Einladungen werden per Resend verschickt (falls konfiguriert).
        </div>
      </div>

      <div className="space-y-4">
        {invites.map((row, idx) => (
          <div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor={`invite_email_${idx}`}>E-Mail</Label>
              <Input
                id={`invite_email_${idx}`}
                value={row.email}
                onChange={(e) => {
                  const next = invites.slice()
                  next[idx] = { ...row, email: e.target.value }
                  onChange(next)
                }}
                placeholder="name@firma.de"
                disabled={disabled || sending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`invite_role_${idx}`}>Rolle</Label>
              <select
                id={`invite_role_${idx}`}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={row.role}
                disabled={disabled || sending}
                onChange={(e) => {
                  const next = invites.slice()
                  next[idx] = { ...row, role: e.target.value as InviteRole }
                  onChange(next)
                }}
              >
                <option value="account_manager">Account Manager</option>
                <option value="sales">Sales Representative</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          disabled={disabled || sending || invites.length >= 3}
          onClick={() => onChange([...invites, { email: "", role: "account_manager" }])}
        >
          + Weitere
        </Button>
      </div>

      <div className="flex justify-between gap-2">
        <Button type="button" variant="ghost" onClick={onSkip} disabled={disabled || sending}>
          Überspringen → Dashboard
        </Button>
        <Button type="button" onClick={onFinish} disabled={disabled || sending}>
          {sending ? "Einladungen senden…" : "Einladungen senden"}
        </Button>
      </div>
    </div>
  )
}

