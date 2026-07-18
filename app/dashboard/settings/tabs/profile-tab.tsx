'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AppIcon } from '@/lib/icons'
import { Trash2 } from '@hugeicons/core-free-icons'
import { SettingsProfileCard } from '../settings-profile-card'
import { SettingsTotpMfaCard } from '@/components/dashboard/SettingsTotpMfaCard'
import { DIGEST_TIMEZONE_OPTIONS } from '@/lib/market-signals/digest-schedule'
import { changeOwnPassword } from '../actions'
import { MarketSignalsPushCard } from '../market-signals-push-card'
import { updateProfileNotificationSettings } from '../settings-consolidation-actions'
import {
  SETTINGS_CARD_CLASS,
  SETTINGS_DANGER_ZONE_CLASS,
  type RegisterSettingsTab,
} from './settings-tab-shared'
import { useRegisterSettingsTab } from './use-register-settings-tab'

type ProfileTabProps = {
  profile: {
    userEmail: string
    firstName: string
    lastName: string
    avatarUrl: string | null
    bookingUrl: string | null
    phone: string | null
    profileRole: 'admin' | 'sales' | 'account_manager'
    notificationSettings: {
      emailOnNewMatch: boolean
      emailOnApprovalUpdate: boolean
      emailDailyMarketSignalsDigest: boolean
      emailDigestEmptyDay: boolean
      digestTimezone: string
      digestLocalTime: string
      emailInstantMarketSignals: boolean
      browserPushMarketSignals: boolean
    }
  }
  register: RegisterSettingsTab
}

export function ProfileTab({ profile, register }: ProfileTabProps) {
  const [notifyNewMatch, setNotifyNewMatch] = useState(
    profile.notificationSettings.emailOnNewMatch
  )
  const [notifyApproval, setNotifyApproval] = useState(
    profile.notificationSettings.emailOnApprovalUpdate
  )
  const [notifyMarketSignalsDigest, setNotifyMarketSignalsDigest] = useState(
    profile.notificationSettings.emailDailyMarketSignalsDigest
  )
  const [notifyDigestEmptyDay, setNotifyDigestEmptyDay] = useState(
    profile.notificationSettings.emailDigestEmptyDay
  )
  const [digestTimezone, setDigestTimezone] = useState(profile.notificationSettings.digestTimezone)
  const [digestLocalTime, setDigestLocalTime] = useState(profile.notificationSettings.digestLocalTime)
  const [notifyInstantMarketSignals, setNotifyInstantMarketSignals] = useState(
    profile.notificationSettings.emailInstantMarketSignals
  )
  const [browserPushMarketSignals, setBrowserPushMarketSignals] = useState(
    profile.notificationSettings.browserPushMarketSignals
  )
  const [profilePending, startProfileTransition] = useTransition()
  const [passwordPending, startPasswordTransition] = useTransition()
  const [profileCardDirty, setProfileCardDirty] = useState(false)
  const [profileSaveSignal, setProfileSaveSignal] = useState(0)

  const profileNotificationsDirty =
    notifyNewMatch !== profile.notificationSettings.emailOnNewMatch ||
    notifyApproval !== profile.notificationSettings.emailOnApprovalUpdate ||
    notifyMarketSignalsDigest !== profile.notificationSettings.emailDailyMarketSignalsDigest ||
    notifyDigestEmptyDay !== profile.notificationSettings.emailDigestEmptyDay ||
    digestTimezone !== profile.notificationSettings.digestTimezone ||
    digestLocalTime !== profile.notificationSettings.digestLocalTime ||
    notifyInstantMarketSignals !== profile.notificationSettings.emailInstantMarketSignals ||
    browserPushMarketSignals !== profile.notificationSettings.browserPushMarketSignals

  function saveProfileNotifications() {
    startProfileTransition(async () => {
      const result = await updateProfileNotificationSettings({
        emailOnNewMatch: notifyNewMatch,
        emailOnApprovalUpdate: notifyApproval,
        emailDailyMarketSignalsDigest: notifyMarketSignalsDigest,
        emailDigestEmptyDay: notifyDigestEmptyDay,
        digestTimezone,
        digestLocalTime,
        emailInstantMarketSignals: notifyInstantMarketSignals,
        browserPushMarketSignals,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Benachrichtigungen gespeichert')
    })
  }

  function saveOwnPassword(formData: FormData) {
    startPasswordTransition(async () => {
      const result = await changeOwnPassword(formData)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Passwort erfolgreich geändert')
    })
  }

  function saveProfileTab() {
    if (profileNotificationsDirty) {
      saveProfileNotifications()
    }
    if (profileCardDirty) {
      setProfileSaveSignal((prev) => prev + 1)
    }
  }

  useRegisterSettingsTab(
    'profile',
    {
      dirty: profileNotificationsDirty || profileCardDirty,
      pending: profilePending,
      save: saveProfileTab,
    },
    register
  )

  return (
    <TabsContent value="profile">
      <div className="space-y-6">
        <div className={SETTINGS_CARD_CLASS}>
          <SettingsProfileCard
            userEmail={profile.userEmail}
            firstName={profile.firstName}
            lastName={profile.lastName}
            avatarUrl={profile.avatarUrl}
            bookingUrl={profile.bookingUrl}
            phone={profile.phone}
            profileRole={profile.profileRole}
            hideSubmitButton
            saveSignal={profileSaveSignal}
            onDirtyChange={setProfileCardDirty}
          />
        </div>
        <div className={SETTINGS_CARD_CLASS}>
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Benachrichtigungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0 pb-0 pt-2">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Ereignis</th>
                    <th className="px-3 py-2 text-center font-medium">E-Mail</th>
                    <th className="px-3 py-2 text-center font-medium">In-App</th>
                    <th className="px-3 py-2 text-center font-medium">Web-Push</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-3 py-2">Neue Marktsignale</td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={notifyInstantMarketSignals} onCheckedChange={setNotifyInstantMarketSignals} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={notifyMarketSignalsDigest} onCheckedChange={setNotifyMarketSignalsDigest} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={browserPushMarketSignals} onCheckedChange={setBrowserPushMarketSignals} />
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">Referenz-Anfragen</td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={notifyApproval} onCheckedChange={setNotifyApproval} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={notifyNewMatch} onCheckedChange={setNotifyNewMatch} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={false} onCheckedChange={() => {}} disabled />
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">System-Updates</td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={notifyDigestEmptyDay} onCheckedChange={setNotifyDigestEmptyDay} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={notifyDigestEmptyDay} onCheckedChange={setNotifyDigestEmptyDay} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={false} onCheckedChange={() => {}} disabled />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="digestTimezone">Zeitzone (Tagesüberblick)</Label>
                <Select value={digestTimezone} onValueChange={setDigestTimezone}>
                  <SelectTrigger id="digestTimezone" className="bg-background">
                    <SelectValue placeholder="Zeitzone" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIGEST_TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                    {digestTimezone &&
                    !(DIGEST_TIMEZONE_OPTIONS as readonly string[]).includes(digestTimezone) ? (
                      <SelectItem value={digestTimezone}>{digestTimezone}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="digestLocalTime">Uhrzeit (lokal)</Label>
                <Input
                  id="digestLocalTime"
                  type="time"
                  value={digestLocalTime}
                  onChange={(e) => setDigestLocalTime(e.target.value)}
                  className="bg-background"
                />
                <p className="text-[11px] text-slate-500">
                  Mit Vercel Pro und Digest-Cron alle 10&nbsp;Min.: Versand im 10-Min-Fenster ab dieser lokalen Zeit.
                  Vercel Hobby (Cron 1×/Tag): setze{' '}
                  <code className="text-[10px]">MARKET_SIGNALS_DIGEST_SKIP_TIME_WINDOW=1</code> – Versand beim
                  täglichen Cron (UTC), Einstellung Uhrzeit dann ohne Wirkung.
                </p>
              </div>
            </div>
            <MarketSignalsPushCard />
          </CardContent>
        </div>
        <div className={SETTINGS_CARD_CLASS}>
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Passwort ändern</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <form action={saveOwnPassword} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <PasswordInput id="newPassword" name="newPassword" minLength={12} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                <PasswordInput id="confirmPassword" name="confirmPassword" minLength={12} autoComplete="new-password" />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" size="sm" disabled={passwordPending}>
                  {passwordPending ? 'Speichert …' : 'Passwort speichern'}
                </Button>
              </div>
            </form>
          </CardContent>
        </div>
        <div className={SETTINGS_CARD_CLASS}>
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Sicherheit (2FA)</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <SettingsTotpMfaCard />
          </CardContent>
        </div>
        <div className={SETTINGS_DANGER_ZONE_CLASS}>
          <p className="text-sm font-semibold text-red-700">Danger Zone</p>
          <p className="mt-1 text-xs text-red-600/90">Konto dauerhaft entfernen. Dieser Vorgang ist irreversibel.</p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="mt-4"
            onClick={() => toast.error('Account-Löschung wird in einem gesicherten Backend-Flow freigeschaltet.')}
          >
            <AppIcon icon={Trash2} size={16} />
            Account löschen
          </Button>
        </div>
      </div>
    </TabsContent>
  )
}
