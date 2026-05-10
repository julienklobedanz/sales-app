'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type GateStatus = 'loading' | 'ok' | 'need_mfa'

type MfaFactor = { id: string; factor_type: string; status: string }

function extractTotpFactors(data: unknown): MfaFactor[] {
  if (!data || typeof data !== 'object') return []
  const d = data as { totp?: MfaFactor[]; all?: MfaFactor[] }
  if (Array.isArray(d.all)) return d.all.filter((f) => f.factor_type === 'totp')
  if (Array.isArray(d.totp)) return d.totp
  return []
}

function pickVerifiedTotpFactor(factors: MfaFactor[]) {
  return factors.find((f) => String(f.status).toLowerCase() === 'verified') ?? null
}

export function DashboardMfaGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<GateStatus>('loading')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const runCheck = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      setStatus('ok')
      return
    }

    const { data: aal, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error) {
      console.error('[MFA gate] AAL:', error)
      setStatus('ok')
      return
    }

    if (aal.currentLevel === 'aal1' && aal.nextLevel === 'aal2') {
      setStatus('need_mfa')
    } else {
      setStatus('ok')
    }
  }, [])

  useEffect(() => {
    void runCheck()
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void runCheck()
    })
    return () => subscription.unsubscribe()
  }, [runCheck])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.replace(/\s/g, '')
    if (trimmed.length < 6) {
      toast.error('Bitte den 6-stelligen Code eingeben.')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: factorsPayload, error: listErr } = await supabase.auth.mfa.listFactors()
      if (listErr) throw listErr

      const factor = pickVerifiedTotpFactor(extractTotpFactors(factorsPayload))
      if (!factor) {
        toast.error('Kein aktiver Authenticator gefunden. Bitte in den Einstellungen 2FA neu einrichten.')
        setSubmitting(false)
        return
      }

      const { data: challengeRow, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id })
      if (chErr || !challengeRow?.id) throw chErr ?? new Error('Challenge fehlgeschlagen')

      const { error: verErr } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challengeRow.id,
        code: trimmed,
      })
      if (verErr) throw verErr

      toast.success('Zwei-Faktor-Authentifizierung bestätigt.')
      setCode('')
      setStatus('ok')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Code ungültig. Bitte erneut versuchen.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Lade Authentifizierung" />
      </div>
    )
  }

  if (status === 'need_mfa') {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center bg-background p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mfa-gate-title"
      >
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2 text-foreground">
            <Shield className="size-5 shrink-0 text-primary" aria-hidden />
            <h2 id="mfa-gate-title" className="text-base font-semibold tracking-tight">
              Zwei-Faktor-Authentifizierung
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Gib den Code aus deiner Authenticator-App ein, um fortzufahren.
          </p>
          <form onSubmit={(e) => void handleVerify(e)} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Einmalcode</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                disabled={submitting}
                className="text-center font-mono text-lg tracking-widest"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Prüft …
                </>
              ) : (
                'Bestätigen'
              )}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
