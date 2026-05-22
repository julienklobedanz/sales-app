'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BID_TEAM_ADD_CONTACT_VALUE,
  findBidTeamMember,
  isValidBidTeamEmail,
  memberFromEmail,
  type BidTeamMember,
} from '@/lib/deal-desk/bid-team'
import type { BidTeamRoleKey } from '@/lib/deal-desk/mock-analysis'

type Props = {
  role: BidTeamRoleKey
  roleLabel: string
  roleDescription: string
  assigneeId: string
  teamMembers: BidTeamMember[]
  onTeamMembersChange: (members: BidTeamMember[]) => void
  onAssign: (role: BidTeamRoleKey, member: BidTeamMember) => void
}

export function BidTeamRoleSelect({
  role,
  roleLabel,
  roleDescription,
  assigneeId,
  teamMembers,
  onTeamMembersChange,
  onAssign,
}: Props) {
  const [addingContact, setAddingContact] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')

  function saveNewContact() {
    const trimmed = emailDraft.trim()
    if (!isValidBidTeamEmail(trimmed)) {
      toast.error('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    const member = memberFromEmail(trimmed)
    const exists = teamMembers.some((m) => m.id === member.id)
    const nextMembers = exists ? teamMembers : [...teamMembers, member]
    if (!exists) onTeamMembersChange(nextMembers)
    onAssign(role, member)
    setAddingContact(false)
    setEmailDraft('')
    toast.success(`Ansprechpartner ${member.email} angelegt.`)
  }

  return (
    <div className="w-full space-y-1">
      <Label className="text-xs font-medium">{roleLabel}</Label>
      <p className="text-[11px] leading-snug text-muted-foreground">{roleDescription}</p>

      {addingContact ? (
        <div className="w-full space-y-2 rounded-lg border border-border bg-muted/30 p-2">
          <Input
            type="email"
            autoFocus
            placeholder="name@firma.de"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            className="h-9 w-full text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                saveNewContact()
              }
            }}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" className="h-8 flex-1 text-xs" onClick={saveNewContact}>
              Speichern
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                setAddingContact(false)
                setEmailDraft('')
              }}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <Select
            value={assigneeId}
            onValueChange={(v) => {
              if (v === BID_TEAM_ADD_CONTACT_VALUE) {
                setAddingContact(true)
                setEmailDraft('')
                return
              }
              const member = findBidTeamMember(teamMembers, v)
              if (member) onAssign(role, member)
            }}
          >
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue placeholder="Person wählen …" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.email ? m.email : m.name}
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value={BID_TEAM_ADD_CONTACT_VALUE} className="text-blue-700 dark:text-blue-300">
                <span className="flex items-center gap-1.5">
                  <Plus className="size-3.5" />
                  Neuen Ansprechpartner hinzufügen
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
