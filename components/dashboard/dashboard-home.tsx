'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Circle, HelpCircle, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  RoleHomeDashboard,
  type RoleHomeDashboardPayload,
} from '@/components/dashboard/role-home-dashboard'
import type { FunctionRole } from '@/lib/roles/capabilities'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Hinweis } from '@/components/ui/hinweis'
import { deleteDemoSeedAction } from '@/app/onboarding/delete-demo-seed-action'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

const DISMISS_STORAGE_KEY = 'refstack:first-steps-dismissed'
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

type FirstStepsProgress = {
  hasAccounts: boolean
  hasReferences: boolean
  hasTeamInvites: boolean
  hasMarketSignals: boolean
}

type StepDef = {
  id: keyof FirstStepsProgress
  label: string
  href: string
}

const STEPS: StepDef[] = [
  {
    id: 'hasAccounts',
    label: '1. Zielkunden anlegen: Lege Accounts manuell an oder importiere sie.',
    href: ROUTES.accounts,
  },
  {
    id: 'hasReferences',
    label:
      '2. Erste Referenz sichern: Lade eine Case Study oder ein Projekt-Factsheet hoch.',
    href: ROUTES.references.root,
  },
  {
    id: 'hasTeamInvites',
    label: '3. Team einladen: Bringe deine Sales-Kollegen auf die Plattform.',
    href: `${ROUTES.settings}?tab=workspace`,
  },
  {
    id: 'hasMarketSignals',
    label: '4. Live-Infos über deine Zielkunden: Sieh jetzt nach, was passiert.',
    href: ROUTES.accounts,
  },
]

function isWithinThreeDays(userRegisteredAt: string): boolean {
  const registered = new Date(userRegisteredAt).getTime()
  if (Number.isNaN(registered)) return false
  return Date.now() - registered < THREE_DAYS_MS
}

type DashboardHomeProps = {
  greetingName: string | null
  isBrandNew: boolean
  userRegisteredAt: string
  progress: FirstStepsProgress
  dashboardPayload: RoleHomeDashboardPayload
  functionRole: FunctionRole
  thinDashboard?: boolean
  hasDemoSeed?: boolean
}

export function DashboardHome({
  greetingName,
  isBrandNew,
  userRegisteredAt,
  progress,
  dashboardPayload,
  functionRole,
  thinDashboard = false,
  hasDemoSeed = false,
}: DashboardHomeProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [dismissed, setDismissed] = useState(false)
  const [helpExpanded, setHelpExpanded] = useState(false)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const [demoPending, startDemoTransition] = useTransition()

  const welcomeFromWizard = searchParams.get('welcome') === '1' && !welcomeDismissed

  useEffect(() => {
    try {
      // Read dismiss flag after mount to avoid SSR/localStorage hydration mismatch.
      if (window.localStorage.getItem(DISMISS_STORAGE_KEY) === '1') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration gate for localStorage
        setDismissed(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const withinThreeDays = useMemo(
    () => isWithinThreeDays(userRegisteredAt),
    [userRegisteredAt],
  )

  const showFullChecklist =
    isBrandNew && withinThreeDays && (!dismissed || welcomeFromWizard)
  const showFloatingHelp =
    isBrandNew && dismissed && withinThreeDays && !welcomeFromWizard
  const showCommandCenter = !showFullChecklist

  function cleanWelcomeParam() {
    if (searchParams.get('welcome') !== '1') return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('welcome')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function dismissChecklist() {
    if (welcomeFromWizard) {
      setWelcomeDismissed(true)
      cleanWelcomeParam()
      return
    }

    setDismissed(true)
    setHelpExpanded(false)
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, '1')
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative">
      {hasDemoSeed ? (
        <Hinweis
          tone="warning"
          className="mb-6 flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            Das sind <strong>Beispieldaten</strong> zum Ausprobieren — keine echten
            Kunden. Du kannst sie jederzeit mit einem Klick entfernen.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={demoPending}
            onClick={() => {
              startDemoTransition(async () => {
                const result = await deleteDemoSeedAction()
                if (!result.success) {
                  toast.error(
                    result.error ?? 'Beispieldaten konnten nicht gelöscht werden.',
                  )
                  return
                }
                toast.success('Beispieldaten entfernt.')
                router.refresh()
              })
            }}
          >
            Beispiel löschen
          </Button>
        </Hinweis>
      ) : null}

      {showFullChecklist ? (
        <ChecklistCard progress={progress} onDismiss={dismissChecklist} />
      ) : null}

      {showFloatingHelp && helpExpanded ? (
        <ChecklistCard
          progress={progress}
          onDismiss={() => setHelpExpanded(false)}
          className="mt-8"
        />
      ) : null}

      {showCommandCenter ? (
        <RoleHomeDashboard
          payload={dashboardPayload}
          greetingName={greetingName}
          functionRole={functionRole}
          thin={thinDashboard}
        />
      ) : null}

      {showFloatingHelp && !helpExpanded ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => setHelpExpanded(true)}
          className="fixed bottom-6 right-6 z-40 size-11 rounded-full border-border bg-card shadow-md hover:bg-muted"
          aria-label="Erste Schritte anzeigen"
        >
          <HelpCircle className="size-5 text-muted-foreground" aria-hidden />
        </Button>
      ) : null}
    </div>
  )
}

function ChecklistCard({
  progress,
  onDismiss,
  className,
}: {
  progress: FirstStepsProgress
  onDismiss: () => void
  className?: string
}) {
  return (
    <Card
      className={cn(
        'relative mx-auto max-w-xl p-6',
        className ?? 'mt-12',
      )}
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-muted-foreground"
        aria-label="Checkliste schließen"
      >
        <X className="size-4" aria-hidden />
      </button>

      <CardTitle className="pr-8 text-lg">
        Willkommen bei RefStack! Lass uns deinen Workspace einrichten.
      </CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        In wenigen Schritten bist du startklar für Accounts, Referenzen und Markt-Signale.
      </p>

      <ul className="mt-6 space-y-3">
        {STEPS.map((step) => {
          const done = progress[step.id]
          return (
            <li key={step.id}>
              <Link
                href={step.href}
                className={cn(
                  'group flex items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all hover:border-border hover:bg-muted',
                  done && 'opacity-90',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0 transition-all duration-300 ease-out',
                    done ? 'scale-110 text-emerald-600' : 'text-muted-foreground',
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="size-5" aria-hidden />
                  ) : (
                    <Circle className="size-5" aria-hidden />
                  )}
                </span>
                <span
                  className={cn(
                    'text-sm leading-snug transition-all duration-300 ease-out',
                    done
                      ? 'text-muted-foreground line-through decoration-gray-400'
                      : 'text-foreground',
                  )}
                >
                  {step.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
