'use client'

import { useState } from 'react'
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
import { UserPlus, Copy, Link2 } from 'lucide-react'
import { createInvite } from './invite-actions'

export function InviteCard() {
  const [link, setLink] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (!link) return
    navigator.clipboard.writeText(link)
    toast.success('Link in Zwischenablage kopiert')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="size-5 text-muted-foreground" />
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
          <Link2 className="size-4" />
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
                value={link}
                className="font-mono text-xs"
              />
              <Button type="button" variant="secondary" size="icon" onClick={handleCopy} title="Kopieren">
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
