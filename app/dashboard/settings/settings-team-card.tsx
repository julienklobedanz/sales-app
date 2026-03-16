'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Trash2, UserPlus } from 'lucide-react'
import type { TeamMemberRow } from './invite-actions'
import { getTeamMembers, inviteByEmail, removeMember } from './invite-actions'

export function SettingsTeamCard({
  initialMembers,
}: {
  initialMembers: TeamMemberRow[]
}) {
  const router = useRouter()
  const [members, setMembers] = useState<TeamMemberRow[]>(initialMembers)
  const [email, setEmail] = useState('')
  const [invitePending, setInvitePending] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error('Bitte eine E-Mail-Adresse eingeben.')
      return
    }
    setInvitePending(true)
    const result = await inviteByEmail(trimmed)
    setInvitePending(false)
    if (result.success) {
      toast.success('Einladung wurde versendet.')
      setEmail('')
      router.refresh()
      const next = await getTeamMembers()
      setMembers(next)
    } else {
      toast.error(result.error)
    }
  }

  async function handleRemove(m: TeamMemberRow) {
    if (removingId) return
    setRemovingId(m.id)
    const result = await removeMember(
      m.status === 'pending' ? { inviteId: m.id } : { profileId: m.id }
    )
    setRemovingId(null)
    if (result.success) {
      setMembers((prev) => prev.filter((x) => x.id !== m.id))
      router.refresh()
      toast.success('Mitglied entfernt.')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <form onSubmit={handleInvite} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="E-Mail-Adresse eingeben"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background"
            />
          </div>
          <Button
            type="submit"
            className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            disabled={invitePending}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Einladen
          </Button>
        </form>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Team-Liste</h3>
        {members.length === 0 ? (
          <p className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 py-6 text-center text-sm text-muted-foreground">
            Noch keine Mitglieder. Lade jemanden per E-Mail ein.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">
                    {m.status === 'active'
                      ? m.name || 'Unbekannt'
                      : m.email || 'Unbekannte E-Mail'}
                  </span>
                  <span className="ml-2">
                    {m.status === 'active' ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                        Ausstehend
                      </Badge>
                    )}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  onClick={() => handleRemove(m)}
                  disabled={removingId === m.id}
                  aria-label="Mitglied entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
