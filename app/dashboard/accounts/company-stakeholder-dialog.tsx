import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader } from '@hugeicons/core-free-icons'
import type { StakeholderRole } from './actions'
import { STAKEHOLDER_ROLE_BADGES } from './company-detail-constants'
import { AppIcon } from '@/lib/icons'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: boolean
  saving: boolean
  shName: string
  setShName: (v: string) => void
  shTitle: string
  setShTitle: (v: string) => void
  shRole: StakeholderRole
  setShRole: (v: StakeholderRole) => void
  shInfluence: string
  setShInfluence: (v: string) => void
  shAttitude: string
  setShAttitude: (v: string) => void
  shLinkedIn: string
  setShLinkedIn: (v: string) => void
  shPriorities: string
  setShPriorities: (v: string) => void
  shLastContact: string
  setShLastContact: (v: string) => void
  shSentiment: string
  setShSentiment: (v: string) => void
  shNotes: string
  setShNotes: (v: string) => void
  onSave: () => void
}

export function CompanyStakeholderDialog({
  open,
  onOpenChange,
  editing,
  saving,
  shName,
  setShName,
  shTitle,
  setShTitle,
  shRole,
  setShRole,
  shInfluence,
  setShInfluence,
  shAttitude,
  setShAttitude,
  shLinkedIn,
  setShLinkedIn,
  shPriorities,
  setShPriorities,
  shLastContact,
  setShLastContact,
  shSentiment,
  setShSentiment,
  shNotes,
  setShNotes,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Stakeholder bearbeiten' : 'Stakeholder hinzufügen'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={shName} onChange={(e) => setShName(e.target.value)} disabled={saving} />
          </div>
          <div className="grid gap-2">
            <Label>Titel</Label>
            <Input value={shTitle} onChange={(e) => setShTitle(e.target.value)} disabled={saving} />
          </div>
          <div className="grid gap-2">
            <Label>Rolle</Label>
            <Select
              value={shRole}
              onValueChange={(v) => setShRole(v as StakeholderRole)}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STAKEHOLDER_ROLE_BADGES) as StakeholderRole[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {STAKEHOLDER_ROLE_BADGES[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Einfluss</Label>
            <Input
              value={shInfluence}
              onChange={(e) => setShInfluence(e.target.value)}
              disabled={saving}
              placeholder="z. B. hoch / mittel / niedrig"
            />
          </div>
          <div className="grid gap-2">
            <Label>Haltung</Label>
            <Input
              value={shAttitude}
              onChange={(e) => setShAttitude(e.target.value)}
              disabled={saving}
              placeholder="z. B. Champion / neutral / kritisch"
            />
          </div>
          <div className="grid gap-2">
            <Label>LinkedIn</Label>
            <Input
              value={shLinkedIn}
              onChange={(e) => setShLinkedIn(e.target.value)}
              disabled={saving}
              placeholder="https://…"
            />
          </div>
          <div className="grid gap-2">
            <Label>Prioritäten / Topics</Label>
            <Textarea
              value={shPriorities}
              onChange={(e) => setShPriorities(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid gap-2">
            <Label>Letzter Kontakt</Label>
            <Input
              type="date"
              value={shLastContact}
              onChange={(e) => setShLastContact(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid gap-2">
            <Label>Sentiment</Label>
            <Input
              value={shSentiment}
              onChange={(e) => setShSentiment(e.target.value)}
              disabled={saving}
              placeholder="z. B. positiv / neutral / negativ"
            />
          </div>
          <div className="grid gap-2">
            <Label>Notizen</Label>
            <Textarea value={shNotes} onChange={(e) => setShNotes(e.target.value)} disabled={saving} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={saving}>
            {saving && <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
