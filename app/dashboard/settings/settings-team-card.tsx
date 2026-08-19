'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { humanizeTeamInviteEmailError } from '@/lib/email/team-invite-email'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import {
  DEFAULT_INVITE_ROLES,
  INVITE_FUNCTION_ROLE_OPTIONS,
  INVITE_SYSTEM_ROLE_OPTIONS,
  type InviteRoleDimensions,
} from '@/lib/roles/invite-roles'

function titleCaseWord(word: string) {
  const w = word.trim()
  if (!w) return ''
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
}

function deriveDisplayNameFromEmail(email: string) {
  const local =
    String(email ?? '')
      .trim()
      .split('@')[0] ?? ''
  const cleaned = local.replace(/[^a-zA-Z0-9._-]+/g, ' ')
  const parts = cleaned
    .split(/[._\-\s]+/g)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2)
  if (!parts.length) return 'Ausstehend'
  if (parts.length === 1) return titleCaseWord(parts[0])
  return `${titleCaseWord(parts[0])} ${titleCaseWord(parts[1])}`.trim()
}

function RoleSelects({
  systemRole,
  functionRole,
  disabled,
  onChange,
}: {
  systemRole: SystemRole
  functionRole: FunctionRole
  disabled?: boolean
  onChange: (next: InviteRoleDimensions) => void
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select
        value={systemRole}
        onValueChange={(v) => onChange({ systemRole: v as SystemRole, functionRole })}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-full bg-background sm:w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INVITE_SYSTEM_ROLE_OPTIONS.map((role) => (
            <SelectItem key={role} value={role}>
              {COPY.roleDimensions.systemRoles[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={functionRole}
        onValueChange={(v) => onChange({ systemRole, functionRole: v as FunctionRole })}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-full bg-background sm:w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INVITE_FUNCTION_ROLE_OPTIONS.map((role) => (
            <SelectItem key={role} value={role}>
              {COPY.roleDimensions.functionRoles[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
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
  const [inviteRoles, setInviteRoles] =
    useState<InviteRoleDimensions>(DEFAULT_INVITE_ROLES)
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
    const result = await inviteByEmail(trimmed, inviteRoles)
    setInvitePending(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    if (result.emailSent) {
      toast.success(COPY.settings.teamInviteEmailSent)
    } else {
      toast.warning(COPY.settings.teamInviteSavedEmailFailed, {
        description: humanizeTeamInviteEmailError(result.emailError),
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
      m.status === 'pending' ? { inviteId: m.id } : { profileId: m.id },
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

  async function handleRoleChange(m: TeamMemberRow, nextRoles: InviteRoleDimensions) {
    setRolePendingId(m.id)
    const result =
      m.status === 'active'
        ? await updateMemberRole({
            profileId: m.id,
            systemRole: nextRoles.systemRole,
            functionRole: nextRoles.functionRole,
          })
        : await updatePendingInviteRole({
            inviteId: m.id,
            systemRole: nextRoles.systemRole,
            functionRole: nextRoles.functionRole,
          })
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
      description: humanizeTeamInviteEmailError(result.emailError),
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
    <div className="space-y-3">
      <div>
        <CardTitle className="text-sm">Team</CardTitle>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
              className="h-9 bg-background"
              autoComplete="email"
            />
          </div>
          <RoleSelects
            systemRole={inviteRoles.systemRole}
            functionRole={inviteRoles.functionRole}
            onChange={setInviteRoles}
          />
          <Button type="submit" size="sm" className="gap-2" disabled={invitePending}>
            <AppIcon icon={UserPlus} size={16} />
            Einladen
          </Button>
        </form>
      </div>

      <div>
        {members.length === 0 ? (
          <p className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 py-5 text-center text-sm text-muted-foreground">
            Noch keine Mitglieder. Lade jemanden per E-Mail ein.
          </p>
        ) : (
          <Card className="gap-0 overflow-hidden p-0">
            <TooltipProvider>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[32%] min-w-[180px]">Name</TableHead>
                  <TableHead className="w-[24%]">E-Mail</TableHead>
                  <TableHead className="w-[28%]">Rolle</TableHead>
                  <TableHead className="w-[16%] text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="max-w-0 font-medium">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="min-w-0 truncate">
                          {m.status === 'active'
                            ? m.name || 'Unbekannt'
                            : deriveDisplayNameFromEmail(m.email)}
                        </span>
                        {m.status === 'active' ? (
                          <Badge className="shrink-0 bg-accent text-accent-foreground">
                            Aktiv
                          </Badge>
                        ) : (
                          <Badge className="shrink-0 border-border bg-muted text-foreground">
                            Ausstehend
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-0 truncate text-muted-foreground">
                      {m.email || '—'}
                    </TableCell>
                    <TableCell>
                      <RoleSelects
                        systemRole={m.systemRole}
                        functionRole={m.functionRole}
                        disabled={
                          rolePendingId === m.id || (m.status === 'active' && m.isSelf)
                        }
                        onChange={(nextRoles) => void handleRoleChange(m, nextRoles)}
                      />
                      {m.status === 'active' && m.isSelf ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {COPY.settings.teamOwnRoleDisabledHint}
                        </p>
                      ) : null}
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    disabled={removingId === m.id}
                                    aria-label={COPY.settings.teamRemoveMemberTooltip}
                                  >
                                    <AppIcon icon={Trash2} size={16} />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                {COPY.settings.teamRemoveMemberTooltip}
                              </TooltipContent>
                            </Tooltip>
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
            </TooltipProvider>
          </Card>
        )}
      </div>
    </div>
  )
}
