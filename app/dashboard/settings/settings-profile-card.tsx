'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Save, Upload, X, Loader2 } from 'lucide-react'
import { updateProfile } from './actions'

export function SettingsProfileCard({
  userEmail,
  firstName,
  lastName,
}: {
  userEmail: string
  firstName: string
  lastName: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await updateProfile(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Profil gespeichert')
        router.refresh()
      }
    } finally {
      setPending(false)
    }
  }

  function handleAvatarFile(file: File | null) {
    if (!file) {
      setAvatarFile(null)
      setAvatarPreview(null)
      return
    }
    setAvatarFile(file)
    setAvatarLoading(true)
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarPreview(typeof reader.result === 'string' ? reader.result : null)
      setAvatarLoading(false)
    }
    reader.onerror = () => {
      setAvatarLoading(false)
      toast.error('Avatar konnte nicht geladen werden.')
    }
    reader.readAsDataURL(file)
  }

  function handleAvatarDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleAvatarFile(file)
    }
  }

  function handleAvatarDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleAvatarDelete() {
    setAvatarFile(null)
    setAvatarPreview(null)
    // Hier könnte optional ein Server-Call zum Löschen des Avatars erfolgen.
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <div
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/30"
            onDrop={handleAvatarDrop}
            onDragOver={handleAvatarDragOver}
          >
            {avatarLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : avatarPreview ? (
              <>
                <img
                  src={avatarPreview}
                  alt="Avatar Vorschau"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleAvatarDelete}
                  className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-red-600 opacity-0 shadow-sm ring-1 ring-red-100 transition-opacity duration-150 group-hover:opacity-100"
                  aria-label="Avatar entfernen"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <User className="h-10 w-10 text-muted-foreground/50" />
            )}
          </div>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
              <Upload className="h-3.5 w-3.5" />
              Avatar hochladen
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                if (file && file.type.startsWith('image/')) {
                  handleAvatarFile(file)
                }
              }}
            />
          </label>
          <p className="text-center text-[10px] text-muted-foreground">
            Datei per Klick auswählen oder direkt hierher ziehen.
          </p>
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={firstName}
                placeholder="Max"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={lastName}
                placeholder="Mustermann"
                className="bg-background"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={userEmail}
              readOnly
              className="bg-muted/50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Die E-Mail wird über den Anmeldeprozess verwaltet.
            </p>
          </div>
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        <Save className="mr-2 h-4 w-4" />
        Speichern
      </Button>
    </form>
  )
}
