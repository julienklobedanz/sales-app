import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: boolean
  saving: boolean
  companyName: string
  cFirst: string
  setCFirst: (v: string) => void
  cLast: string
  setCLast: (v: string) => void
  cEmail: string
  setCEmail: (v: string) => void
  cPosition: string
  setCPosition: (v: string) => void
  cPhone: string
  setCPhone: (v: string) => void
  cLinkedIn: string
  setCLinkedIn: (v: string) => void
  cRole: string
  setCRole: (v: string) => void
  onSave: () => void
}

export function CompanyContactDialog({
  open,
  onOpenChange,
  editing,
  saving,
  companyName,
  cFirst,
  setCFirst,
  cLast,
  setCLast,
  cEmail,
  setCEmail,
  cPosition,
  setCPosition,
  cPhone,
  setCPhone,
  cLinkedIn,
  setCLinkedIn,
  cRole,
  setCRole,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Kontakt bearbeiten' : 'Kontakt hinzufügen'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Account</Label>
            <Input value={companyName} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Vorname</Label>
            <Input value={cFirst} onChange={(e) => setCFirst(e.target.value)} disabled={saving} />
          </div>
          <div className="grid gap-2">
            <Label>Nachname</Label>
            <Input value={cLast} onChange={(e) => setCLast(e.target.value)} disabled={saving} />
          </div>
          <div className="grid gap-2">
            <Label>E-Mail</Label>
            <Input value={cEmail} onChange={(e) => setCEmail(e.target.value)} disabled={saving} />
          </div>
          <div className="grid gap-2">
            <Label>Position</Label>
            <Input
              value={cPosition}
              onChange={(e) => setCPosition(e.target.value)}
              disabled={saving}
              placeholder="z. B. Head of Procurement"
            />
          </div>
          <div className="grid gap-2">
            <Label>Telefon</Label>
            <Input
              value={cPhone}
              onChange={(e) => setCPhone(e.target.value)}
              disabled={saving}
              placeholder="(optional)"
            />
          </div>
          <div className="grid gap-2">
            <Label>LinkedIn</Label>
            <Input
              value={cLinkedIn}
              onChange={(e) => setCLinkedIn(e.target.value)}
              disabled={saving}
              placeholder="https://… (optional)"
            />
          </div>
          <div className="grid gap-2">
            <Label>Rolle</Label>
            <Input
              value={cRole}
              onChange={(e) => setCRole(e.target.value)}
              disabled={saving}
              placeholder="z. B. Economic Buyer (optional)"
            />
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
