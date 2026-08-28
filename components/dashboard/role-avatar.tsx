'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function RoleAvatar({
  name,
  avatarUrl,
  role,
}: {
  name: string | null
  avatarUrl: string | null
  role: string
}) {
  if (!name) return null
  return (
    <Avatar size="sm" title={`${role}: ${name}`}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
    </Avatar>
  )
}
