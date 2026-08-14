'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Cancel01Icon, Loader, Save, Upload, User } from '@hugeicons/core-free-icons'
import { requestEmailChange, updateProfile } from './actions'
import { AppIcon } from '@/lib/icons'

export function SettingsProfileCard({
  userEmail,
  firstName,
  lastName,
  avatarUrl,
  bookingUrl,
  phone,
  jobTitle,
  salesRequired,
  hideSubmitButton = false,
  saveSignal = 0,
  onDirtyChange,
}: {
  userEmail: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
  bookingUrl?: string | null
  phone?: string | null
  jobTitle?: string | null
  salesRequired: boolean
  hideSubmitButton?: boolean
  saveSignal?: number
  onDirtyChange?: (dirty: boolean) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl ?? null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [firstNameValue, setFirstNameValue] = useState(firstName)
  const [lastNameValue, setLastNameValue] = useState(lastName)
  const [phoneValue, setPhoneValue] = useState(phone ?? '')
  const [jobTitleValue, setJobTitleValue] = useState(jobTitle ?? '')
  const [bookingUrlValue, setBookingUrlValue] = useState(bookingUrl ?? '')
  const [lastHandledSaveSignal, setLastHandledSaveSignal] = useState(0)
  const [emailEditing, setEmailEditing] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailPending, setEmailPending] = useState(false)
  const [pendingEmailNotice, setPendingEmailNotice] = useState<string | null>(null)

  const isDirty =
    firstNameValue !== firstName ||
    lastNameValue !== lastName ||
    phoneValue !== (phone ?? '') ||
    jobTitleValue !== (jobTitle ?? '') ||
    bookingUrlValue !== (bookingUrl ?? '') ||
    (avatarPreview ?? '') !== (avatarUrl ?? '')

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (saveSignal <= 0 || saveSignal === lastHandledSaveSignal || !isDirty) return
    const form = document.getElementById(
      'settings-profile-form',
    ) as HTMLFormElement | null
    if (form) {
      form.requestSubmit()
      setLastHandledSaveSignal(saveSignal)
    }
  }, [isDirty, lastHandledSaveSignal, saveSignal])

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
  }

  return (
    <form id="settings-profile-form" onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <button
            type="button"
            className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/30"
            onDrop={handleAvatarDrop}
            onDragOver={handleAvatarDragOver}
            onClick={() => {
              const input = document.getElementById(
                'profile-avatar-input',
              ) as HTMLInputElement | null
              input?.click()
            }}
          >
            {avatarLoading ? (
              <AppIcon
                icon={Loader}
                size={20}
                className="animate-spin text-muted-foreground"
              />
            ) : avatarPreview ? (
              <>
                <img
                  src={avatarPreview}
                  alt="Avatar Vorschau"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAvatarDelete()
                  }}
                  className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-destructive opacity-0 shadow-sm ring-1 ring-destructive/20 transition-opacity duration-150 group-hover:opacity-100"
                  aria-label="Avatar entfernen"
                >
                  <AppIcon icon={Cancel01Icon} size={12} />
                </button>
              </>
            ) : (
              <AppIcon icon={User} size={28} className="text-muted-foreground/50" />
            )}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent"
            onClick={() => {
              const input = document.getElementById(
                'profile-avatar-input',
              ) as HTMLInputElement | null
              input?.click()
            }}
          >
            <AppIcon icon={Upload} size={12} />
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
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="firstName" className="text-xs">
                Vorname
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={firstNameValue}
                onChange={(e) => setFirstNameValue(e.target.value)}
                placeholder="Max"
                className="h-9 bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName" className="text-xs">
                Nachname
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={lastNameValue}
                onChange={(e) => setLastNameValue(e.target.value)}
                placeholder="Mustermann"
                className="h-9 bg-background"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="email" className="text-xs">
                E-Mail
                {salesRequired ? <span className="text-destructive"> *</span> : null}
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  readOnly
                  className="h-9 cursor-not-allowed bg-muted/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() => {
                    setEmailEditing((v) => !v)
                    setNewEmail('')
                    setEmailPassword('')
                  }}
                >
                  {emailEditing ? 'Abbrechen' : 'E-Mail ändern'}
                </Button>
              </div>
              {pendingEmailNotice ? (
                <p className="text-[11px] text-amber-700">
                  Bestätigung ausstehend für {pendingEmailNotice}. Bitte Posteingang
                  prüfen (neue und ggf. alte Adresse).
                </p>
              ) : null}
              {emailEditing ? (
                <div className="grid gap-2 rounded-md border border-border/70 bg-muted/20 p-2.5 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-1">
                    <Label htmlFor="newEmail" className="text-xs">
                      Neue E-Mail
                    </Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="h-9 bg-background"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="emailCurrentPassword" className="text-xs">
                      Aktuelles Passwort
                    </Label>
                    <PasswordInput
                      id="emailCurrentPassword"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="h-9"
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 w-full sm:w-auto"
                      disabled={emailPending}
                      onClick={async () => {
                        setEmailPending(true)
                        const result = await requestEmailChange({
                          newEmail,
                          currentPassword: emailPassword,
                        })
                        setEmailPending(false)
                        if (!result.success) {
                          toast.error(result.error)
                          return
                        }
                        setPendingEmailNotice(result.pendingEmail)
                        setEmailEditing(false)
                        setNewEmail('')
                        setEmailPassword('')
                        toast.success('Bestätigungslink wurde gesendet.')
                      }}
                    >
                      {emailPending ? 'Senden …' : 'Link senden'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs">
                Telefon
                {salesRequired ? <span className="text-destructive"> *</span> : null}
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                placeholder="z. B. +49 …"
                className="h-9 bg-background"
                autoComplete="tel"
                required={salesRequired}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="jobTitle" className="text-xs">
                Jobtitel / Signatur
              </Label>
              <Input
                id="jobTitle"
                name="jobTitle"
                value={jobTitleValue}
                onChange={(e) => setJobTitleValue(e.target.value)}
                placeholder="z. B. Account Executive · Cloud"
                className="h-9 bg-background"
                autoComplete="organization-title"
              />
              <p className="text-[11px] text-muted-foreground">
                Wird auf Kundenlinks unter deinem Namen angezeigt.
              </p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="bookingUrl" className="text-xs">
                Terminbuchung
              </Label>
              <Input
                id="bookingUrl"
                name="bookingUrl"
                type="url"
                inputMode="url"
                placeholder="z. B. https://calendly.com/…"
                value={bookingUrlValue}
                onChange={(e) => setBookingUrlValue(e.target.value)}
                className="h-9 bg-background"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Wird in der öffentlichen Kundenansicht angezeigt.
              </p>
            </div>
          </div>
        </div>
      </div>
      <input type="hidden" name="avatarDataUrl" value={avatarPreview ?? ''} />
      {!hideSubmitButton ? (
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            <AppIcon icon={Save} size={16} className="mr-2" />
            Speichern
          </Button>
        </div>
      ) : null}
    </form>
  )
}
