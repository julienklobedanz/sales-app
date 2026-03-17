'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Upload, X, Loader2 } from 'lucide-react'
import { updateOrganization } from './settings-workspace-actions'

export function SettingsWorkspaceCard({
  organizationId,
  organizationName,
  logoUrl,
}: {
  organizationId: string | null
  organizationName: string
  logoUrl?: string | null
}) {
  const [name, setName] = useState(organizationName)
  const [pending, setPending] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl ?? null)
  const [logoLoading, setLogoLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

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

  function handleLogoFile(file: File | null) {
    if (!file) {
      setLogoPreview(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte ein Bild für das Logo wählen.')
      return
    }
    setLogoLoading(true)
    const reader = new FileReader()
    reader.onload = () => {
      setLogoPreview(typeof reader.result === 'string' ? reader.result : null)
      setLogoLoading(false)
    }
    reader.onerror = () => {
      setLogoLoading(false)
      toast.error('Logo konnte nicht geladen werden.')
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleLogoFile(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragActive) setDragActive(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function handleLogoDelete() {
    setLogoPreview(null)
    // Hier könnte optional ein Server-Call zum Entfernen des Logos erfolgen.
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
        <Label htmlFor="workspace-name">Organisation</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={organizationId ? 'Mein Workspace' : 'Kein Workspace zugeordnet'}
          disabled={!organizationId}
          className={organizationId ? 'bg-background' : 'bg-muted/50 cursor-not-allowed'}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-muted-foreground">Logo</Label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/30"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => {
              const input = document.getElementById('workspace-logo-input') as HTMLInputElement | null
              input?.click()
            }}
          >
            {logoLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : logoPreview ? (
              <>
                <img
                  src={logoPreview}
                  alt="Workspace-Logo"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleLogoDelete}
                  className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-red-600 opacity-0 shadow-sm ring-1 ring-red-100 transition-opacity duration-150 group-hover:opacity-100"
                  aria-label="Logo entfernen"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground/60" />
            )}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            onClick={() => {
              const input = document.getElementById('workspace-logo-input') as HTMLInputElement | null
              input?.click()
            }}
          >
            <Upload className="h-3.5 w-3.5" />
            Logo hochladen
          </button>
          <input
            id="workspace-logo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              if (file) handleLogoFile(file)
            }}
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending || !organizationId}>
        Speichern
      </Button>
    </form>
  )
}
