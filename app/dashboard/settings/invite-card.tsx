'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Copy, Link2, UserPlus } from '@hugeicons/core-free-icons'
import { createInvite } from './invite-actions'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'

/** Ersetzt Platzhalter-URL (z. B. [sales-app]) durch die aktuelle Origin, damit der User keinen ungültigen Link kopiert. */
function resolveInviteLink(link: string | null): string {
  if (!link) return ''
  if (typeof window === 'undefined') return link
  const hasPlaceholder = link.includes('[') || link.includes('sales-app')
  if (!hasPlaceholder) return link
  const match = link.match(new RegExp(`${ROUTES.register}\\?invite=([^&]+)`))
  if (match) {
    return `${window.location.origin}${ROUTES.register}?invite=${match[1]}`
  }
  const pathWithQuery = link.replace(/^https?:\/\/[^/]+/, '') || ROUTES.register
  return `${window.location.origin}${pathWithQuery}`
}

export function InviteCard() {
  const [link, setLink] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayLink = useMemo(() => resolveInviteLink(link), [link])

  async function handleCreateInvite() {
    setPending(true)
    setError(null)
    setLink(null)
    const result = await createInvite()
    setPending(false)
    if (result.success) {
      setLink(result.link)
      setExpiresAt(result.expiresAt)
    } else {
      setError(result.error)
    }
  }

  function handleCopy() {
    const toCopy = displayLink || link
    if (!toCopy) return
    navigator.clipboard.writeText(toCopy)
    toast.success('Link in Zwischenablage kopiert')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AppIcon icon={UserPlus} size={20} className="text-muted-foreground" />
          <CardTitle>Mitarbeiter einladen</CardTitle>
        </div>
        <CardDescription>
          Erstelle einen Einladungslink. Teammitglieder, die sich über diesen Link registrieren, werden automatisch deiner Organisation zugeordnet und sehen dieselben Referenzen und Kontakte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCreateInvite}
          disabled={pending}
          className="gap-2"
        >
          <AppIcon icon={Link2} size={16} />
          {pending ? 'Link wird erstellt …' : 'Einladungslink erstellen'}
        </Button>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {link && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-muted-foreground text-xs">
              Link (gültig bis {expiresAt})
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={displayLink}
                className="font-mono text-xs"
              />
              <Button type="button" variant="secondary" size="icon" onClick={handleCopy} title="Kopieren">
                <AppIcon icon={Copy} size={16} />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
