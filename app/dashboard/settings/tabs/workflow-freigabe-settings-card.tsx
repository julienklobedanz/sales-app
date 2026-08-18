'use client'

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import { SETTINGS_CARD_CLASS } from './settings-tab-shared'

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
    <div className={SETTINGS_CARD_CLASS}>
      <CardHeader className="space-y-2 px-0 pt-0">
        <CardTitle className="text-base">Freigabe-Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-0 pt-2">
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">1. Entry</p>
          <div className="mt-3 max-w-sm space-y-2">
            <Label htmlFor="link-expiry-days">Link Expiry (Tage)</Label>
            <Input
              id="link-expiry-days"
              value={linkExpiryDays}
              onChange={(e) => onLinkExpiryDaysChange(e.target.value)}
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">2. Interne Prüfung</p>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Vier-Augen-Prinzip aktiv</p>
            </div>
            <Switch
              checked={requireInternalApproval}
              onCheckedChange={onRequireInternalApprovalChange}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">3. Externer Versand</p>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Delegation erlauben</p>
            </div>
            <Switch
              checked={autoAllowDelegation}
              onCheckedChange={onAutoAllowDelegationChange}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">4. Follow-up Sequenz</p>
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
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-foreground">
            5. Abschluss & Transparenz
          </p>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border p-3">
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
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Live-Ablaufvorschau</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tag 0 Anfrage · Tag {reminder1Days || '3'} Reminder 1 · Tag{' '}
              {reminder2Days || '7'} Reminder 2 · Tag {escalationAfterDays || '10'}{' '}
              Eskalation
            </p>
          </div>
        </div>
      </CardContent>
    </div>
  )
}
