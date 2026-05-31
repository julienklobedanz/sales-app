import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Linkedin01Icon, Pencil, Trash2 } from '@hugeicons/core-free-icons'
import { Mail, Phone } from 'lucide-react'

import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

export const CONTACT_ACTION_BTN_CLASS = 'size-8 shrink-0 p-0'

export function formatLastInteraction(value: string | null | undefined): string {
  if (!value?.trim()) return '—'
  const d = value.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-')
    return `${day}.${m}.${y}`
  }
  return value
}

export function contactRoleLabel(c: { role?: string | null; position?: string | null }): string {
  const role = c.role?.trim()
  if (role) return role
  const position = c.position?.trim()
  return position || '—'
}

/** Jobtitel aus Referenz-Kontakten (Feld `role` in external_contacts, nicht Miller-Heiman-Rolle). */
export function externalContactJobTitle(c: {
  role?: string | null
  title?: string | null
}): string {
  const title = c.title?.trim()
  if (title) return title
  const legacyRole = c.role?.trim()
  return legacyRole || '—'
}

function ContactActionPlaceholder({ children }: { children: ReactNode }) {
  return (
    <span className={cn(CONTACT_ACTION_BTN_CLASS, 'inline-flex items-center justify-center')} aria-hidden>
      {children}
    </span>
  )
}

export function ContactMailButton({ email, name }: { email: string | null | undefined; name: string }) {
  const href = email?.trim() ? `mailto:${email.trim()}` : null
  if (href) {
    return (
      <Button type="button" variant="ghost" size="icon" className={CONTACT_ACTION_BTN_CLASS} asChild>
        <a href={href} aria-label={`E-Mail an ${name}`} title={email!.trim()}>
          <Mail className="size-4 text-muted-foreground" aria-hidden />
        </a>
      </Button>
    )
  }
  return (
    <ContactActionPlaceholder>
      <Mail className="size-4 text-muted-foreground/25" aria-hidden />
    </ContactActionPlaceholder>
  )
}

export function ContactPhoneButton({ phone, name }: { phone: string | null | undefined; name: string }) {
  const raw = phone?.trim()
  const href = raw ? `tel:${raw.replace(/[\s()-]/g, '')}` : null
  if (href) {
    return (
      <Button type="button" variant="ghost" size="icon" className={CONTACT_ACTION_BTN_CLASS} asChild>
        <a href={href} aria-label={`${name} anrufen`} title={raw}>
          <Phone className="size-4 text-muted-foreground" aria-hidden />
        </a>
      </Button>
    )
  }
  return (
    <ContactActionPlaceholder>
      <Phone className="size-4 text-muted-foreground/25" aria-hidden />
    </ContactActionPlaceholder>
  )
}

export function ContactLinkedInButton({ href, name }: { href: string | null; name: string }) {
  if (href) {
    return (
      <Button type="button" variant="ghost" size="icon" className={CONTACT_ACTION_BTN_CLASS} asChild>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${name} bei LinkedIn suchen`}
          title="LinkedIn"
        >
          <AppIcon icon={Linkedin01Icon} size={16} className="text-[#0A66C2]" />
        </a>
      </Button>
    )
  }
  return (
    <ContactActionPlaceholder>
      <AppIcon icon={Linkedin01Icon} size={16} className="text-muted-foreground/25" />
    </ContactActionPlaceholder>
  )
}

function ContactEditButton({
  name,
  disabled,
  onClick,
}: {
  name: string
  disabled?: boolean
  onClick?: () => void
}) {
  if (disabled || !onClick) {
    return (
      <ContactActionPlaceholder>
        <AppIcon icon={Pencil} size={16} className="text-muted-foreground/25" />
      </ContactActionPlaceholder>
    )
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={CONTACT_ACTION_BTN_CLASS}
      onClick={onClick}
      aria-label={`${name} bearbeiten`}
    >
      <AppIcon icon={Pencil} size={16} />
    </Button>
  )
}

function ContactDeleteButton({
  name,
  disabled,
  onClick,
}: {
  name: string
  disabled?: boolean
  onClick?: () => void
}) {
  if (disabled || !onClick) {
    return (
      <ContactActionPlaceholder>
        <AppIcon icon={Trash2} size={16} className="text-muted-foreground/25" />
      </ContactActionPlaceholder>
    )
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={CONTACT_ACTION_BTN_CLASS}
      onClick={onClick}
      aria-label={`${name} löschen`}
    >
      <AppIcon icon={Trash2} size={16} />
    </Button>
  )
}

/** Einheitliche Aktionsleiste: E-Mail · Telefon · LinkedIn · Bearbeiten · Löschen */
export function ContactActionButtons({
  name,
  email,
  phone,
  linkedInHref,
  canEdit = false,
  editDisabled = false,
  deleteDisabled = false,
  onEdit,
  onRemove,
}: {
  name: string
  email?: string | null
  phone?: string | null
  linkedInHref: string | null
  canEdit?: boolean
  editDisabled?: boolean
  deleteDisabled?: boolean
  onEdit?: () => void
  onRemove?: () => void
}) {
  return (
    <div className="inline-flex items-center justify-end gap-2">
      <ContactMailButton email={email} name={name} />
      <ContactPhoneButton phone={phone} name={name} />
      <ContactLinkedInButton href={linkedInHref} name={name} />
      {canEdit ? (
        <>
          <ContactEditButton
            name={name}
            disabled={editDisabled}
            onClick={editDisabled ? undefined : onEdit}
          />
          <ContactDeleteButton
            name={name}
            disabled={deleteDisabled}
            onClick={deleteDisabled ? undefined : () => void onRemove?.()}
          />
        </>
      ) : null}
    </div>
  )
}
