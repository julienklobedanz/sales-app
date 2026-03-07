'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PlusCircle, Loader2 } from 'lucide-react'
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
import { createContact } from './actions'

/** Einfache Formatprüfungen für Kontaktfelder */
const NAME_REGEX = /^[\p{L}\p{M}\s\-']{2,}$/u
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[\d\s+\-()]{6,}$/

function validateContact(formData: FormData): string | null {
  const firstName = formData.get('firstName')?.toString()?.trim() ?? ''
  const lastName = formData.get('lastName')?.toString()?.trim() ?? ''
  const email = formData.get('email')?.toString()?.trim() ?? ''
  const phone = formData.get('phone')?.toString()?.trim() ?? ''

  if (!NAME_REGEX.test(firstName)) {
    return 'Bitte einen gültigen Vornamen eingeben (mind. 2 Zeichen, nur Buchstaben).'
  }
  if (!NAME_REGEX.test(lastName)) {
    return 'Bitte einen gültigen Nachnamen eingeben (mind. 2 Zeichen, nur Buchstaben).'
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Bitte eine gültige E-Mail-Adresse eingeben.'
  }
  if (phone && !PHONE_REGEX.test(phone)) {
    return 'Bitte eine gültige Telefonnummer eingeben (Ziffern, Leerzeichen, + - ( )).'
  }
  return null
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
}: {
  /** Bei variant="internal": (contact) => void. Bei variant="external": (contact, role?) => void. */
  onContactCreated: (contact: CreatedContact, role?: string) => void
  variant?: 'internal' | 'external'
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const validationError = validateContact(formData)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setLoading(true)
    try {
      const result = await createContact(formData)
      if (result.success && result.contact) {
        toast.success('Kontakt angelegt')
        const role = variant === 'external' ? formData.get('role')?.toString()?.trim() : undefined
        onContactCreated(result.contact as CreatedContact, role)
        setOpen(false)
      } else {
        toast.error(result.error || 'Fehler beim Anlegen')
      }
    } catch (e) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const isExternal = variant === 'external'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Neuen Kontakt anlegen"
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
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
              <Input
                id="firstName"
                name="firstName"
                className="col-span-3"
                required
                placeholder="z. B. Max"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-6">
              <Label htmlFor="lastName" className="text-right">
                Nachname
              </Label>
              <Input
                id="lastName"
                name="lastName"
                className="col-span-3"
                required
                placeholder="z. B. Mustermann"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-6">
              <Label htmlFor="email" className="text-right">
                E-Mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                className="col-span-3"
                required
                placeholder="z. B. max@beispiel.de"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-6">
              <Label htmlFor="phone" className="text-right">
                Telefon
              </Label>
              <Input
                id="phone"
                name="phone"
                className="col-span-3"
                type="tel"
                placeholder="z. B. +49 30 123456"
              />
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
