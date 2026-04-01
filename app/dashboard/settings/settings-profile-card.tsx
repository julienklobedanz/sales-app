'use client'

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Cancel01Icon, Loader, Save, Upload, User } from '@hugeicons/core-free-icons'
import { updateProfile } from './actions'
import { AppIcon } from '@/lib/icons'

export function SettingsProfileCard({
  userEmail,
  firstName,
  lastName,
  avatarUrl,
}: {
  userEmail: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl ?? null)
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
      setAvatarPreview(null)
      return
    }
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

  function handleAvatarDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleAvatarFile(file)
    }
  }

  function handleAvatarDragOver(e: React.DragEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleAvatarDelete() {
    setAvatarPreview(null)
    // Hier könnte optional ein Server-Call zum Löschen des Avatars erfolgen.
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/30"
            onDrop={handleAvatarDrop}
            onDragOver={handleAvatarDragOver}
            onClick={() => {
              const input = document.getElementById('profile-avatar-input') as HTMLInputElement | null
              input?.click()
            }}
          >
            {avatarLoading ? (
              <AppIcon icon={Loader} size={24} className="animate-spin text-muted-foreground" />
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
                  className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive opacity-0 shadow-sm ring-1 ring-destructive/20 transition-opacity duration-150 group-hover:opacity-100"
                  aria-label="Avatar entfernen"
                >
                  <AppIcon icon={Cancel01Icon} size={12} />
                </button>
              </>
            ) : (
              <AppIcon icon={User} size={40} className="text-muted-foreground/50" />
            )}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            onClick={() => {
              const input = document.getElementById('profile-avatar-input') as HTMLInputElement | null
              input?.click()
            }}
          >
            <AppIcon icon={Upload} size={14} />
            Avatar hochladen
          </button>
          <input
            id="profile-avatar-input"
            name="profileAvatarFile"
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
      <input
        type="hidden"
        name="avatarDataUrl"
        value={avatarPreview ?? ''}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          <AppIcon icon={Save} size={16} className="mr-2" />
          Speichern
        </Button>
      </div>
    </form>
  )
}
