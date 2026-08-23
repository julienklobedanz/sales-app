'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Hinweis } from '@/components/ui/hinweis'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function WorkflowFreigabeSettingsCard({
  linkExpiryDays,
  onLinkExpiryDaysChange,
  requireInternalApproval,
  onRequireInternalApprovalChange,
  autoAllowDelegation,
  onAutoAllowDelegationChange,
  reminder1Days,
  onReminder1DaysChange,
  reminder2Days,
  onReminder2DaysChange,
  escalationAfterDays,
  onEscalationAfterDaysChange,
  autoNotifyRequesterOnEscalation,
  onAutoNotifyRequesterOnEscalationChange,
}: {
  linkExpiryDays: string
  onLinkExpiryDaysChange: (value: string) => void
  requireInternalApproval: boolean
  onRequireInternalApprovalChange: (value: boolean) => void
  autoAllowDelegation: boolean
  onAutoAllowDelegationChange: (value: boolean) => void
  reminder1Days: string
  onReminder1DaysChange: (value: string) => void
  reminder2Days: string
  onReminder2DaysChange: (value: string) => void
  escalationAfterDays: string
  onEscalationAfterDaysChange: (value: string) => void
  autoNotifyRequesterOnEscalation: boolean
  onAutoNotifyRequesterOnEscalationChange: (value: boolean) => void
}) {
  return (
    <Card className="p-6">
      <CardHeader className="space-y-2 px-0 pt-0">
        <CardTitle className="text-base">Freigabe-Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0 pt-2">
        <Card className="p-4">
          <CardTitle as="h3" className="text-sm">
            1. Entry
          </CardTitle>
          <div className="mt-3 max-w-sm space-y-2">
            <Label htmlFor="link-expiry-days">Link Expiry (Tage)</Label>
            <Input
              id="link-expiry-days"
              value={linkExpiryDays}
              onChange={(e) => onLinkExpiryDaysChange(e.target.value)}
              inputMode="numeric"
            />
          </div>
        </Card>

        <Card className="p-4">
          <CardTitle as="h3" className="text-sm">
            2. Interne Prüfung
          </CardTitle>
          <div className="mt-3 flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium">Vier-Augen-Prinzip aktiv</p>
            </div>
            <Switch
              checked={requireInternalApproval}
              onCheckedChange={onRequireInternalApprovalChange}
            />
          </div>
        </Card>

        <Card className="p-4">
          <CardTitle as="h3" className="text-sm">
            3. Externer Versand
          </CardTitle>
          <div className="mt-3 flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium">Delegation erlauben</p>
            </div>
            <Switch
              checked={autoAllowDelegation}
              onCheckedChange={onAutoAllowDelegationChange}
            />
          </div>
        </Card>

        <Card className="p-4">
          <CardTitle as="h3" className="text-sm">
            4. Follow-up Sequenz
          </CardTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="approval-reminder-1">Reminder #1 (Tage)</Label>
              <Input
                id="approval-reminder-1"
                value={reminder1Days}
                onChange={(e) => onReminder1DaysChange(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="approval-reminder-2">Reminder #2 (Tage)</Label>
              <Input
                id="approval-reminder-2"
                value={reminder2Days}
                onChange={(e) => onReminder2DaysChange(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="approval-escalation-days">Eskalation ab Tag</Label>
              <Input
                id="approval-escalation-days"
                value={escalationAfterDays}
                onChange={(e) => onEscalationAfterDaysChange(e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <CardTitle as="h3" className="text-sm">
            5. Abschluss & Transparenz
          </CardTitle>
          <div className="mt-3 flex items-center justify-between p-3">
            <div>
              <p className="text-sm font-medium">
                Requester bei Eskalation benachrichtigen
              </p>
            </div>
            <Switch
              checked={autoNotifyRequesterOnEscalation}
              onCheckedChange={onAutoNotifyRequesterOnEscalationChange}
            />
          </div>
        </Card>

        <Hinweis className="flex items-center justify-between p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Live-Ablaufvorschau</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tag 0 Anfrage · Tag {reminder1Days || '3'} Reminder 1 · Tag{' '}
              {reminder2Days || '7'} Reminder 2 · Tag {escalationAfterDays || '10'}{' '}
              Eskalation
            </p>
          </div>
        </Hinweis>
      </CardContent>
    </Card>
  )
}
