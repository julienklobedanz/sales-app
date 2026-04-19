'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, Trash2, UserPlus } from '@hugeicons/core-free-icons'
import type { TeamMemberRow } from './invite-actions'
import {
  getTeamMembers,
  inviteByEmail,
  removeMember,
  resendInviteEmail,
  updateMemberRole,
  updatePendingInviteRole,
} from './invite-actions'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'

type InviteRole = 'admin' | 'sales' | 'account_manager'

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
  const [rolePendingId, setRolePendingId] = useState<string | null>(null)
  const [resendPendingId, setResendPendingId] = useState<string | null>(null)

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

  async function handleRoleChange(m: TeamMemberRow, nextRole: InviteRole) {
    if (m.status !== 'active') return
    setRolePendingId(m.id)
    const result = await updateMemberRole({ profileId: m.id, role: nextRole })
    setRolePendingId(null)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Rolle aktualisiert.')
    router.refresh()
    const next = await getTeamMembers()
    setMembers(next)
  }

  async function handlePendingRoleChange(m: TeamMemberRow, nextRole: InviteRole) {
    if (m.status !== 'pending') return
    setRolePendingId(m.id)
    const result = await updatePendingInviteRole({ inviteId: m.id, role: nextRole })
    setRolePendingId(null)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Rolle aktualisiert.')
    router.refresh()
    const next = await getTeamMembers()
    setMembers(next)
  }

  async function handleResend(m: TeamMemberRow) {
    if (m.status !== 'pending') return
    setResendPendingId(m.id)
    const result = await resendInviteEmail({ inviteId: m.id })
    setResendPendingId(null)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    if (result.emailSent) {
      toast.success('Einladung erneut gesendet.')
      return
    }
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
        <h3 className="mb-2 text-sm font-medium text-foreground">Team</h3>
        {members.length === 0 ? (
          <p className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 py-6 text-center text-sm text-muted-foreground">
            Noch keine Mitglieder. Lade jemanden per E-Mail ein.
          </p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.status === 'active' ? m.name || 'Unbekannt' : 'Ausstehend'}
                      <span className="ml-2">
                        {m.status === 'active' ? (
                          <Badge className="bg-accent text-accent-foreground">
                            Aktiv
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-foreground border-border">
                            Ausstehend
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.email || '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={
                          (m.status === 'active'
                            ? (m.role ?? 'sales')
                            : (m.inviteRole ?? 'sales')) as InviteRole
                        }
                        onValueChange={(v) => {
                          const nextRole = v as InviteRole
                          if (m.status === 'active') {
                            void handleRoleChange(m, nextRole)
                          } else {
                            void handlePendingRoleChange(m, nextRole)
                          }
                        }}
                        disabled={rolePendingId === m.id || (m.status === 'active' && m.isSelf)}
                      >
                        <SelectTrigger className="h-8 w-[190px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="account_manager">
                            {COPY.roles.accountManager}
                          </SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        {m.status === 'pending' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-2"
                            disabled={resendPendingId === m.id}
                            onClick={() => void handleResend(m)}
                          >
                            <AppIcon icon={Send} size={16} />
                            Erneut senden
                          </Button>
                        ) : null}

                        {!m.isSelf ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                disabled={removingId === m.id}
                                aria-label="Mitglied entfernen"
                              >
                                <AppIcon icon={Trash2} size={16} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Mitglied entfernen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {m.status === 'pending'
                                    ? 'Die Einladung wird widerrufen.'
                                    : 'Das Mitglied wird aus dem Arbeitsbereich entfernt.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={removingId === m.id}>
                                  Abbrechen
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={removingId === m.id}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    void handleRemove(m)
                                  }}
                                >
                                  Entfernen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
