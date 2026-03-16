'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Upload } from 'lucide-react'
import { updateOrganization } from './settings-workspace-actions'

export function SettingsWorkspaceCard({
  organizationId,
  organizationName,
}: {
  organizationId: string | null
  organizationName: string
}) {
  const [name, setName] = useState(organizationName)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!organizationId) return
    setPending(true)
    const result = await updateOrganization(organizationId, name.trim())
    setPending(false)
    if (result.success) {
      toast.success('Workspace aktualisiert')
    } else {
      toast.error(result.error)
    }
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/10 p-6 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Kein Workspace zugeordnet.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Building2 className="h-5 w-5" />
        <span className="text-sm font-medium uppercase tracking-wider">
          Workspace-Branding
        </span>
      </div>
      <div className="space-y-2">
        <Label htmlFor="workspace-name">Name</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mein Workspace"
          className="bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Logo</Label>
        <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Upload className="h-4 w-4" />
            Logo-Upload (optional)
          </span>
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Speichern
      </Button>
    </form>
  )
}
