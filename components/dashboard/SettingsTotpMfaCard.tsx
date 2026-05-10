'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

type MfaFactor = { id: string; factor_type: string; status: string; friendly_name?: string }

function extractTotpFactors(data: unknown): MfaFactor[] {
  if (!data || typeof data !== 'object') return []
  const d = data as { totp?: MfaFactor[]; all?: MfaFactor[] }
  if (Array.isArray(d.all)) return d.all.filter((f) => f.factor_type === 'totp')
  if (Array.isArray(d.totp)) return d.totp
  return []
}

export function SettingsTotpMfaCard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [factors, setFactors] = useState<MfaFactor[]>([])
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollBusy, setEnrollBusy] = useState(false)
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null)
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [unenrollBusy, setUnenrollBusy] = useState(false)
  /** Verhindert unenroll beim Schließen des Dialogs direkt nach erfolgreicher Aktivierung. */
  const enrollCompletedRef = useRef(false)

  const refreshFactors = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      console.error(error)
      setFactors([])
      return
    }
    setFactors(extractTotpFactors(data))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refreshFactors()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshFactors])

  const verifiedFactor = factors.find((f) => String(f.status).toLowerCase() === 'verified') ?? null

  function resetEnrollUi() {
    setPendingFactorId(null)
    setQrSvg(null)
    setSecret(null)
    setVerifyCode('')
  }

  async function startEnroll() {
    setEnrollBusy(true)
    resetEnrollUi()
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      })
      if (error) throw error
      if (!data?.id) throw new Error('Enrollment nicht gestartet.')
      setPendingFactorId(data.id)
      const svg = (data as { totp?: { qr_code?: string; secret?: string } }).totp?.qr_code ?? null
      const sec = (data as { totp?: { secret?: string } }).totp?.secret ?? null
      setQrSvg(svg)
      setSecret(sec ?? null)
      setEnrollOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '2FA konnte nicht gestartet werden.')
    } finally {
      setEnrollBusy(false)
    }
  }

  async function confirmEnroll() {
    if (!pendingFactorId) return
    const trimmed = verifyCode.replace(/\s/g, '')
    if (trimmed.length < 6) {
      toast.error('Bitte den Code aus der App eingeben.')
      return
    }
    setEnrollBusy(true)
    try {
      const supabase = createClient()
      const { data: challengeRow, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: pendingFactorId,
      })
      if (chErr || !challengeRow?.id) throw chErr ?? new Error('Challenge fehlgeschlagen')

      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId: pendingFactorId,
        challengeId: challengeRow.id,
        code: trimmed,
      })
      if (verErr) throw verErr

      enrollCompletedRef.current = true
      toast.success('Zwei-Faktor-Authentifizierung ist aktiv.')
      setEnrollOpen(false)
      resetEnrollUi()
      await refreshFactors()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Code ungültig.')
    } finally {
      setEnrollBusy(false)
    }
  }

  async function handleEnrollDialogOpenChange(open: boolean) {
    if (open) return
    if (enrollCompletedRef.current) {
      enrollCompletedRef.current = false
      resetEnrollUi()
      return
    }
    if (pendingFactorId) {
      try {
        const supabase = createClient()
        await supabase.auth.mfa.unenroll({ factorId: pendingFactorId })
      } catch {
        /* ignore */
      }
    }
    resetEnrollUi()
    await refreshFactors()
  }

  async function unenrollVerified() {
    if (!verifiedFactor) return
    setUnenrollBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id })
      if (error) throw error
      toast.success('2FA wurde deaktiviert.')
      await refreshFactors()
      router.refresh()
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : 'Konnte 2FA nicht entfernen. Bitte zuerst mit Authenticator anmelden (Sitzung AAL2).'
      )
    } finally {
      setUnenrollBusy(false)
    }
  }

  const qrSrc =
    qrSvg && (qrSvg.startsWith('data:') ? qrSvg : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`)

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">Zwei-Faktor-Authentifizierung (TOTP)</p>
          <p className="mt-1 text-xs text-slate-600">
            {loading
              ? 'Status wird geladen …'
              : verifiedFactor
                ? 'Authenticator ist eingerichtet. Bei der Anmeldung wird ein Code abgefragt.'
                : 'Schützt dein Konto mit einer App wie Google Authenticator, 1Password oder Microsoft Authenticator.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <Button type="button" variant="outline" size="sm" disabled>
              <Loader2 className="mr-2 size-4 animate-spin" />
              …
            </Button>
          ) : verifiedFactor ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={unenrollBusy}>
                  <ShieldOff className="mr-2 size-4" />
                  2FA deaktivieren
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>2FA deaktivieren?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dein Konto ist dann nur noch mit Passwort geschützt. Diese Aktion ist erst möglich, wenn du in
                    dieser Sitzung bereits den Authenticator-Code eingegeben hast.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void unenrollVerified()}>Deaktivieren</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button type="button" size="sm" onClick={() => void startEnroll()} disabled={enrollBusy}>
              {enrollBusy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}
              Authenticator einrichten
            </Button>
          )}
        </div>
      </div>

      <Dialog open={enrollOpen} onOpenChange={(open) => void handleEnrollDialogOpenChange(open)}>
        <DialogContent className="max-w-md" showCloseButton={!enrollBusy}>
          <DialogHeader>
            <DialogTitle>Authenticator koppeln</DialogTitle>
            <DialogDescription>
              Scan den QR-Code oder gib den Secret-Code manuell ein. Danach den 6-stelligen Code aus der App eingeben.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrSrc} alt="QR-Code für Authenticator" className="size-44 rounded-lg border bg-white p-2" />
            ) : (
              <p className="text-sm text-muted-foreground">QR-Code wird geladen …</p>
            )}
            {secret ? (
              <div className="w-full rounded-md bg-muted px-3 py-2 text-center font-mono text-xs break-all text-muted-foreground">
                {secret}
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="totp-verify">Code aus der App</Label>
            <Input
              id="totp-verify"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="000000"
              disabled={enrollBusy}
              className="text-center font-mono text-lg tracking-widest"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setEnrollOpen(false)} disabled={enrollBusy}>
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void confirmEnroll()} disabled={enrollBusy}>
              {enrollBusy ? <Loader2 className="size-4 animate-spin" /> : 'Aktivieren'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
