'use client'

import { useMemo, useState } from 'react'
import { Mail, Phone } from '@hugeicons/core-free-icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AppIcon } from '@/lib/icons'

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function ShareOwnerContactCard({
  name,
  position,
  avatarUrl,
  email,
  phone,
}: {
  name: string
  position: string
  avatarUrl: string | null
  email: string | null
  phone: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const initials = useMemo(() => initialsFromName(name || 'RS'), [name])

  return (
    <button
      type="button"
      onClick={() => setExpanded((prev) => !prev)}
      className="w-full rounded-xl border border-border/80 bg-card/95 px-3 py-2 text-left shadow-sm transition-colors hover:bg-muted/35"
      aria-expanded={expanded}
      aria-label="Kontaktinformationen anzeigen"
    >
      <div className="flex items-start gap-3">
        <Avatar size="lg">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{position}</p>
        </div>
      </div>
      {expanded ? (
        <div className="mt-2 border-t border-border/70 pt-2">
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <AppIcon icon={Phone} size={14} className="text-muted-foreground" />
            {phone || 'Mobilnummer nicht hinterlegt'}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-foreground">
            <AppIcon icon={Mail} size={14} className="text-muted-foreground" />
            {email || 'E-Mail nicht hinterlegt'}
          </div>
        </div>
      ) : null}
    </button>
  )
}
