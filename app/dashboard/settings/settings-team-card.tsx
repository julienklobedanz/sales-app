'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, UserPlus } from '@hugeicons/core-free-icons'
import type { TeamMemberRow } from './invite-actions'
import { getTeamMembers, inviteByEmail, removeMember } from './invite-actions'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'

type InviteRole = 'admin' | 'sales' | 'account_manager'

function roleLabel(role: InviteRole | null | undefined): string {
  if (role === 'account_manager') return COPY.roles.accountManager
  if (role === 'admin') return 'Admin'
  if (role === 'sales') return 'Sales'
  return 'Sales'
}

export function SettingsTeamCard({
  initialMembers,
}: {
  initialMembers: TeamMemberRow[]
}) {
  const router = useRouter()
  const [members, setMembers] = useState<TeamMemberRow[]>(() => {
    const copy = [...initialMembers]
    copy.sort((a, b) => (a.isSelf === b.isSelf ? 0 : a.isSelf ? -1 : 1))
    return copy
  })
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteRole>('sales')
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
    const result = await inviteByEmail(trimmed, inviteRole)
    setInvitePending(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    if (result.emailSent) {
      toast.success(COPY.settings.teamInviteEmailSent)
    } else {
      toast.warning(COPY.settings.teamInviteSavedEmailFailed, {
        description: result.emailError ?? COPY.settings.teamInviteSavedEmailMissingKey,
        duration: 14_000,
        action: {
          label: COPY.settings.teamInviteCopyLink,
          onClick: () => {
            void navigator.clipboard.writeText(result.fallbackInviteLink)
            toast.success(COPY.settings.teamInviteLinkCopied)
          },
        },
      })
    }
    setEmail('')
    router.refresh()
    const next = await getTeamMembers()
    setMembers(next)
  }

  async function handleRemove(m: TeamMemberRow) {
    if (removingId || m.isSelf) return
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
        <form
          onSubmit={handleInvite}
          className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
        >
          <div className="min-w-0 flex-1 sm:min-w-[200px]">
            <Input
              type="email"
              placeholder="E-Mail-Adresse eingeben"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background"
              autoComplete="email"
            />
          </div>
          <Select
            value={inviteRole}
            onValueChange={(v) => setInviteRole(v as InviteRole)}
          >
            <SelectTrigger className="w-full bg-background sm:w-[200px]">
              <SelectValue placeholder="Rolle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="account_manager">{COPY.roles.accountManager}</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="submit"
            className="gap-2"
            disabled={invitePending}
          >
            <AppIcon icon={UserPlus} size={16} />
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
                    {m.email && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({m.email})
                      </span>
                    )}
                  </span>
                  <span className="ml-2 inline-flex flex-wrap items-center gap-1">
                    {m.status === 'active' ? (
                      <Badge className="bg-accent text-accent-foreground">
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-foreground border-border">
                        Ausstehend
                      </Badge>
                    )}
                    {m.status === 'active' && m.role ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        {roleLabel(m.role)}
                      </Badge>
                    ) : null}
                    {m.status === 'pending' && m.inviteRole ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        {roleLabel(m.inviteRole)}
                      </Badge>
                    ) : null}
                  </span>
                </div>
                {!m.isSelf && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemove(m)}
                    disabled={removingId === m.id}
                    aria-label="Mitglied entfernen"
                  >
                    <AppIcon icon={Trash2} size={16} />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
