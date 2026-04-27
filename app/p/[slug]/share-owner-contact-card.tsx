'use client'

import { useMemo } from 'react'
import { Mail, Phone } from '@hugeicons/core-free-icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  const initials = useMemo(() => initialsFromName(name || 'RS'), [name])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full rounded-xl border border-border/80 bg-card/95 px-3 py-2 text-left shadow-sm transition-colors hover:bg-muted/35"
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
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="relative w-[260px] px-3 py-2.5">
        <span
          aria-hidden
          className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t bg-popover"
        />
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <AppIcon icon={Phone} size={14} className="text-muted-foreground" />
            {phone || 'Mobilnummer nicht hinterlegt'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <AppIcon icon={Mail} size={14} className="text-muted-foreground" />
            {email || 'E-Mail nicht hinterlegt'}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
