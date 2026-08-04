'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { AppIcon } from '@/lib/icons'
import { InformationCircleIcon, Trash2 } from '@hugeicons/core-free-icons'
import { SettingsProfileCard } from '../settings-profile-card'
import { SettingsTotpMfaCard } from '@/components/dashboard/settings-totp-mfa-card'
import { DIGEST_TIMEZONE_OPTIONS } from '@/lib/market-signals/digest-schedule'
import {
  changeOwnPassword,
  deleteOwnAccount,
  signOutAllSessions,
  signOutOtherSessions,
} from '../actions'
import { MarketSignalsPushCard } from '../market-signals-push-card'
import { updateProfileNotificationSettings } from '../settings-consolidation-actions'
import { ROUTES } from '@/lib/routes'
import {
  SETTINGS_CARD_CLASS_COMPACT,
  SETTINGS_DANGER_ZONE_CLASS_COMPACT,
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
    jobTitle: string | null
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
  const router = useRouter()
  const [notifyNewMatch, setNotifyNewMatch] = useState(
    profile.notificationSettings.emailOnNewMatch,
  )
  const [notifyApproval, setNotifyApproval] = useState(
    profile.notificationSettings.emailOnApprovalUpdate,
  )
  const [notifyMarketSignalsDigest, setNotifyMarketSignalsDigest] = useState(
    profile.notificationSettings.emailDailyMarketSignalsDigest,
  )
  const [notifyDigestEmptyDay, setNotifyDigestEmptyDay] = useState(
    profile.notificationSettings.emailDigestEmptyDay,
  )
  const [digestTimezone, setDigestTimezone] = useState(
    profile.notificationSettings.digestTimezone,
  )
  const [digestLocalTime, setDigestLocalTime] = useState(
    profile.notificationSettings.digestLocalTime,
  )
  const [notifyInstantMarketSignals, setNotifyInstantMarketSignals] = useState(
    profile.notificationSettings.emailInstantMarketSignals,
  )
  const [browserPushMarketSignals, setBrowserPushMarketSignals] = useState(
    profile.notificationSettings.browserPushMarketSignals,
  )
  const [profilePending, startProfileTransition] = useTransition()
  const [passwordPending, startPasswordTransition] = useTransition()
  const [profileCardDirty, setProfileCardDirty] = useState(false)
  const [profileSaveSignal, setProfileSaveSignal] = useState(0)
  const [sessionsPending, startSessionsTransition] = useTransition()
  const [accountDeletePending, startAccountDeleteTransition] = useTransition()
  const [accountDeleteEmail, setAccountDeleteEmail] = useState('')
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false)

  const profileNotificationsDirty =
    notifyNewMatch !== profile.notificationSettings.emailOnNewMatch ||
    notifyApproval !== profile.notificationSettings.emailOnApprovalUpdate ||
    notifyMarketSignalsDigest !==
      profile.notificationSettings.emailDailyMarketSignalsDigest ||
    notifyDigestEmptyDay !== profile.notificationSettings.emailDigestEmptyDay ||
    digestTimezone !== profile.notificationSettings.digestTimezone ||
    digestLocalTime !== profile.notificationSettings.digestLocalTime ||
    notifyInstantMarketSignals !==
      profile.notificationSettings.emailInstantMarketSignals ||
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
    register,
  )

  return (
    <TabsContent value="profile">
      <div className="space-y-4">
        <div className={SETTINGS_CARD_CLASS_COMPACT}>
          <SettingsProfileCard
            userEmail={profile.userEmail}
            firstName={profile.firstName}
            lastName={profile.lastName}
            avatarUrl={profile.avatarUrl}
            bookingUrl={profile.bookingUrl}
            phone={profile.phone}
            jobTitle={profile.jobTitle}
            profileRole={profile.profileRole}
            hideSubmitButton
            saveSignal={profileSaveSignal}
            onDirtyChange={setProfileCardDirty}
          />
        </div>

        <div className={SETTINGS_CARD_CLASS_COMPACT}>
          <CardHeader className="px-0 pt-0 pb-0">
            <CardTitle className="text-sm font-semibold">Benachrichtigungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-0 pb-0 pt-2">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-2.5 py-1.5 text-left text-xs font-medium">
                      Ereignis
                    </th>
                    <th className="w-20 px-2 py-1.5 text-center text-xs font-medium">
                      E-Mail
                    </th>
                    <th className="w-20 px-2 py-1.5 text-center text-xs font-medium">
                      In-App
                    </th>
                    <th className="w-20 px-2 py-1.5 text-center text-xs font-medium">
                      Web-Push
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-2.5 py-1.5">Neue Marktsignale</td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch
                        checked={notifyInstantMarketSignals}
                        onCheckedChange={setNotifyInstantMarketSignals}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch
                        checked={notifyMarketSignalsDigest}
                        onCheckedChange={setNotifyMarketSignalsDigest}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch
                        checked={browserPushMarketSignals}
                        onCheckedChange={setBrowserPushMarketSignals}
                      />
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-2.5 py-1.5">Referenz-Anfragen</td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch
                        checked={notifyApproval}
                        onCheckedChange={setNotifyApproval}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch
                        checked={notifyNewMatch}
                        onCheckedChange={setNotifyNewMatch}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch checked={false} onCheckedChange={() => {}} disabled />
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-2.5 py-1.5">System-Updates</td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch
                        checked={notifyDigestEmptyDay}
                        onCheckedChange={setNotifyDigestEmptyDay}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch
                        checked={notifyDigestEmptyDay}
                        onCheckedChange={setNotifyDigestEmptyDay}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Switch checked={false} onCheckedChange={() => {}} disabled />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid items-end gap-2 sm:grid-cols-[1fr_auto_auto]">
              <div className="space-y-1">
                <Label htmlFor="digestTimezone" className="text-xs">
                  Zeitzone (Tagesüberblick)
                </Label>
                <Select value={digestTimezone} onValueChange={setDigestTimezone}>
                  <SelectTrigger id="digestTimezone" className="h-9 bg-background">
                    <SelectValue placeholder="Zeitzone" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIGEST_TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                    {digestTimezone &&
                    !(DIGEST_TIMEZONE_OPTIONS as readonly string[]).includes(
                      digestTimezone,
                    ) ? (
                      <SelectItem value={digestTimezone}>{digestTimezone}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label htmlFor="digestLocalTime" className="text-xs">
                    Uhrzeit (lokal)
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Hinweis zur Digest-Uhrzeit"
                        >
                          <AppIcon icon={InformationCircleIcon} size={14} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Mit Vercel Pro und Digest-Cron alle 10 Min.: Versand im
                        10-Min-Fenster ab dieser lokalen Zeit. Vercel Hobby (Cron 1×/Tag):
                        setze MARKET_SIGNALS_DIGEST_SKIP_TIME_WINDOW=1 – Versand beim
                        täglichen Cron (UTC), Einstellung Uhrzeit dann ohne Wirkung.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="digestLocalTime"
                  type="time"
                  value={digestLocalTime}
                  onChange={(e) => setDigestLocalTime(e.target.value)}
                  className="h-9 w-[9.5rem] bg-background"
                />
              </div>
            </div>

            <MarketSignalsPushCard />
          </CardContent>
        </div>

        <div className={SETTINGS_CARD_CLASS_COMPACT}>
          <CardHeader className="px-0 pt-0 pb-0">
            <CardTitle className="text-sm font-semibold">Passwort ändern</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-2">
            <form
              action={saveOwnPassword}
              className="grid gap-2 sm:grid-cols-3 sm:items-end"
            >
              <div className="space-y-1">
                <Label htmlFor="currentPassword" className="text-xs">
                  Aktuelles Passwort
                </Label>
                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  autoComplete="current-password"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newPassword" className="text-xs">
                  Neues Passwort
                </Label>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  minLength={12}
                  autoComplete="new-password"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-xs">
                  Neues Passwort bestätigen
                </Label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  minLength={12}
                  autoComplete="new-password"
                  className="h-9"
                />
              </div>
              <div className="sm:col-span-3 flex justify-end pt-1">
                <Button type="submit" size="sm" disabled={passwordPending}>
                  {passwordPending ? 'Speichert …' : 'Passwort speichern'}
                </Button>
              </div>
            </form>
          </CardContent>
        </div>

        <div className={SETTINGS_CARD_CLASS_COMPACT}>
          <CardHeader className="px-0 pt-0 pb-0">
            <CardTitle className="text-sm font-semibold">Sicherheit (2FA)</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-2">
            <SettingsTotpMfaCard compact />
          </CardContent>
        </div>

        <div className={SETTINGS_CARD_CLASS_COMPACT}>
          <CardHeader className="px-0 pt-0 pb-0">
            <CardTitle className="text-sm font-semibold">Aktive Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-0 pb-0 pt-2">
            <p className="text-xs text-muted-foreground">
              Dieses Gerät bleibt angemeldet, bis du dich abmeldest. Andere Geräte kannst
              du gezielt oder komplett abmelden.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={sessionsPending}
                onClick={() => {
                  startSessionsTransition(async () => {
                    const result = await signOutOtherSessions()
                    if (!result.success) {
                      toast.error(result.error)
                      return
                    }
                    toast.success('Andere Geräte wurden abgemeldet.')
                  })
                }}
              >
                Andere Geräte abmelden
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={sessionsPending}
                onClick={() => {
                  startSessionsTransition(async () => {
                    const result = await signOutAllSessions()
                    if (!result.success) {
                      toast.error(result.error)
                      return
                    }
                    toast.success('Überall abgemeldet.')
                    router.push(ROUTES.login)
                  })
                }}
              >
                Überall abmelden
              </Button>
            </div>
          </CardContent>
        </div>

        <div className={SETTINGS_DANGER_ZONE_CLASS_COMPACT}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">Danger Zone</p>
              <p className="mt-0.5 text-xs text-red-600/90">
                Konto dauerhaft entfernen. Dieser Vorgang ist irreversibel.
              </p>
            </div>
            <AlertDialog
              open={accountDeleteOpen}
              onOpenChange={(open) => {
                setAccountDeleteOpen(open)
                if (!open) setAccountDeleteEmail('')
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="shrink-0"
                >
                  <AppIcon icon={Trash2} size={16} />
                  Account löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Account wirklich löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dein Login und Profildaten werden gelöscht. Workspace-Daten bleiben
                    erhalten, sofern andere Mitglieder existieren. Bist du der letzte
                    Admin, musst du zuerst einen anderen Admin ernennen oder den Workspace
                    löschen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="account-delete-email">
                    Zur Bestätigung E-Mail eingeben
                  </Label>
                  <Input
                    id="account-delete-email"
                    value={accountDeleteEmail}
                    onChange={(e) => setAccountDeleteEmail(e.target.value)}
                    placeholder={profile.userEmail}
                    autoComplete="off"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={
                      accountDeletePending ||
                      accountDeleteEmail.trim().toLowerCase() !==
                        profile.userEmail.trim().toLowerCase()
                    }
                    onClick={(e) => {
                      e.preventDefault()
                      startAccountDeleteTransition(async () => {
                        const result = await deleteOwnAccount(accountDeleteEmail)
                        if (!result.success) {
                          toast.error(result.error)
                          return
                        }
                        toast.success('Account gelöscht.')
                        router.push(ROUTES.login)
                      })
                    }}
                  >
                    Endgültig löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </TabsContent>
  )
}
