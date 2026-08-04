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

export function ShowcaseContactFab({
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
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 text-left shadow-lg transition-colors hover:bg-muted/40"
          aria-label="Kontaktinformationen anzeigen"
        >
          <Avatar size="default">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 pr-1">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{position}</p>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={12}
        className="w-[260px] px-3 py-2.5"
      >
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Kontakt</p>
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <AppIcon icon={Phone} size={14} className="shrink-0 text-muted-foreground" />
            {phone ? (
              <a href={`tel:${phone}`} className="hover:underline">
                {phone}
              </a>
            ) : (
              <span className="text-muted-foreground">Mobilnummer nicht hinterlegt</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <AppIcon icon={Mail} size={14} className="shrink-0 text-muted-foreground" />
            {email ? (
              <a href={`mailto:${email}`} className="break-all hover:underline">
                {email}
              </a>
            ) : (
              <span className="text-muted-foreground">E-Mail nicht hinterlegt</span>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
