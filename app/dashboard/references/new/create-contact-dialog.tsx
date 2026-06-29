'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CirclePlus, Loader } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createContact, createExternalContact, updateContact, updateExternalContact, type ExternalContact } from './actions'
import { AppIcon } from '@/lib/icons'

/** Einfache Formatprüfungen für Kontaktfelder */
const NAME_REGEX = /^[\p{L}\p{M}\s\-']{2,}$/u
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[\d\s+\-()]{6,}$/

export type FieldErrors = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

function validateContact(formData: FormData): FieldErrors {
  const errors: FieldErrors = {}
  const firstName = formData.get('firstName')?.toString()?.trim() ?? ''
  const lastName = formData.get('lastName')?.toString()?.trim() ?? ''
  const email = formData.get('email')?.toString()?.trim() ?? ''
  const phone = formData.get('phone')?.toString()?.trim() ?? ''

  if (!firstName) {
    errors.firstName = 'Vorname ist erforderlich.'
  } else if (!NAME_REGEX.test(firstName)) {
    errors.firstName = 'Vorname: mind. 2 Zeichen, nur Buchstaben (inkl. Umlaute), Leerzeichen, Bindestrich oder Apostroph.'
  }
  if (!lastName) {
    errors.lastName = 'Nachname ist erforderlich.'
  } else if (!NAME_REGEX.test(lastName)) {
    errors.lastName = 'Nachname: mind. 2 Zeichen, nur Buchstaben (inkl. Umlaute), Leerzeichen, Bindestrich oder Apostroph.'
  }
  if (!email) {
    errors.email = 'E-Mail ist erforderlich.'
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Bitte eine gültige E-Mail-Adresse eingeben (z. B. name@beispiel.de).'
  }
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.phone = 'Telefon: mind. 6 Zeichen, nur Ziffern, Leerzeichen, + - ( ) erlaubt.'
  }
  return errors
}

export type CreatedContact = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

export function CreateContactDialog({
  onContactCreated,
  variant = 'internal',
  companyId,
  disabled,
  mode = 'create',
  initialContact,
}: {
  /** Bei variant="internal": (contact) => void. Bei variant="external": (contact, role?) => void. */
  onContactCreated: (contact: CreatedContact | ExternalContact, role?: string) => void
  variant?: 'internal' | 'external'
  /** Für variant="external": Unternehmen des Kunden (Pflicht). */
  companyId?: string
  /** Externer Dialog: deaktivieren, wenn kein Unternehmen ausgewählt. */
  disabled?: boolean
  mode?: 'create' | 'edit'
  initialContact?: {
    id: string
    company_id?: string | null
    first_name: string | null
    last_name: string | null
    email: string | null
    phone?: string | null
    role?: string | null
  }
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    const formData = new FormData(event.currentTarget)
    const errors = validateContact(formData)
    const hasErrors = Object.keys(errors).length > 0
    setFieldErrors(errors)
    if (hasErrors) {
      const firstMessage = errors.firstName ?? errors.lastName ?? errors.email ?? errors.phone
      toast.error(firstMessage)
      return
    }
    if (variant === 'external' && mode === 'create' && !companyId) {
      toast.error('Bitte zuerst ein Unternehmen auswählen.')
      return
    }
    setLoading(true)
    setFieldErrors({})
    try {
      if (variant === 'external') {
        if (mode === 'edit' && initialContact) {
          const result = await updateExternalContact(initialContact.id, formData)
          if (result.success) {
            toast.success('Kundenansprechpartner aktualisiert')
            onContactCreated(
              {
                id: initialContact.id,
                company_id: companyId ?? initialContact.company_id ?? '',
                first_name: formData.get('firstName')?.toString().trim() ?? '',
                last_name: formData.get('lastName')?.toString().trim() ?? '',
                email: formData.get('email')?.toString().trim() ?? '',
                role: formData.get('role')?.toString().trim() || null,
                phone: formData.get('phone')?.toString().trim() || null,
              } as ExternalContact,
              formData.get('role')?.toString().trim() || undefined
            )
            setOpen(false)
          } else {
            toast.error(result.error ?? 'Fehler beim Speichern')
          }
        } else {
          formData.set('companyId', companyId!)
          const result = await createExternalContact(formData)
          if (result.success && result.contact) {
            toast.success('Kundenansprechpartner angelegt')
            onContactCreated(result.contact, result.contact.role ?? undefined)
            setOpen(false)
          } else {
            toast.error(!result.success && 'error' in result ? result.error : 'Fehler beim Anlegen')
          }
        }
      } else {
        if (mode === 'edit' && initialContact) {
          const result = await updateContact(initialContact.id, formData)
          if (result.success) {
            toast.success('Kontakt aktualisiert')
            onContactCreated({
              id: initialContact.id,
              first_name: formData.get('firstName')?.toString().trim() ?? '',
              last_name: formData.get('lastName')?.toString().trim() ?? '',
              email: formData.get('email')?.toString().trim() ?? '',
            } as CreatedContact)
            setOpen(false)
          } else {
            toast.error(result.error ?? 'Fehler beim Speichern')
          }
        } else {
          const result = await createContact(formData)
          if (result.success && result.contact) {
            toast.success('Kontakt angelegt')
            onContactCreated(result.contact as CreatedContact)
            setOpen(false)
          } else {
            toast.error(!result.success && 'error' in result ? result.error : 'Fehler beim Anlegen')
          }
        }
      }
    } catch {
      toast.error('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) setFieldErrors({})
    setOpen(next)
  }

  const isExternal = variant === 'external'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="default"
          size="icon"
          className="rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95"
          title={variant === 'external' && disabled ? 'Bitte zuerst ein Unternehmen auswählen' : 'Neuen Kontakt anlegen'}
          disabled={disabled}
        >
          <AppIcon icon={CirclePlus} size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Neuen Kontakt anlegen</DialogTitle>
            <DialogDescription>
              {isExternal
                ? 'Kundenansprechpartner hinzufügen (externer Kontakt).'
                : 'Account Owner oder internen Ansprechpartner hinzufügen.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-4 items-center gap-6">
              <Label htmlFor="firstName" className="text-right">
                Vorname
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="firstName"
                  name="firstName"
                  className={fieldErrors.firstName ? 'border-destructive' : ''}
                  required
                  placeholder="z. B. Max"
                  aria-invalid={!!fieldErrors.firstName}
                  aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                />
                {fieldErrors.firstName && (
                  <p id="firstName-error" className="text-xs text-destructive" role="alert">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-6">
              <Label htmlFor="lastName" className="text-right">
                Nachname
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="lastName"
                  name="lastName"
                  className={fieldErrors.lastName ? 'border-destructive' : ''}
                  required
                  placeholder="z. B. Mustermann"
                  aria-invalid={!!fieldErrors.lastName}
                  aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                />
                {fieldErrors.lastName && (
                  <p id="lastName-error" className="text-xs text-destructive" role="alert">
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-6">
              <Label htmlFor="email" className="text-right">
                E-Mail
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  className={fieldErrors.email ? 'border-destructive' : ''}
                  required
                  placeholder="z. B. max@beispiel.de"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
                {fieldErrors.email && (
                  <p id="email-error" className="text-xs text-destructive" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-6">
              <Label htmlFor="phone" className="text-right">
                Telefon
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="phone"
                  name="phone"
                  className={fieldErrors.phone ? 'border-destructive' : ''}
                  type="tel"
                  placeholder="z. B. +49 30 123456"
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                />
                {fieldErrors.phone && (
                  <p id="phone-error" className="text-xs text-destructive" role="alert">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>
            {isExternal && (
              <div className="grid grid-cols-4 items-center gap-6">
                <Label htmlFor="role" className="text-right">
                  Rolle
                </Label>
                <Input
                  id="role"
                  name="role"
                  className="col-span-3"
                  placeholder="z. B. CIO, Projektleiter"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95"
            >
              {loading && <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
