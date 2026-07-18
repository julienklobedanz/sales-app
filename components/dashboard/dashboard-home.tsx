'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Circle, HelpCircle, X } from 'lucide-react'

import { RoleHomeDashboard, type RoleHomeDashboardPayload } from '@/components/dashboard/role-home-dashboard'
import type { FunctionRole } from '@/lib/roles/capabilities'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

const DISMISS_STORAGE_KEY = 'refstack:first-steps-dismissed'
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export type FirstStepsProgress = {
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
    label: '1. Zielkunden importieren: Verbinde dein CRM oder lege Accounts manuell an.',
    href: ROUTES.accounts,
  },
  {
    id: 'hasReferences',
    label: '2. Erste Referenz sichern: Lade eine Case Study oder ein Projekt-Factsheet hoch.',
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
}

export function DashboardHome({
  greetingName,
  isBrandNew,
  userRegisteredAt,
  progress,
  dashboardPayload,
  functionRole,
  thinDashboard = false,
}: DashboardHomeProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [dismissed, setDismissed] = useState(false)
  const [helpExpanded, setHelpExpanded] = useState(false)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  const welcomeFromWizard = searchParams.get('welcome') === '1' && !welcomeDismissed

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_STORAGE_KEY) === '1') {
        setDismissed(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const withinThreeDays = useMemo(
    () => isWithinThreeDays(userRegisteredAt),
    [userRegisteredAt]
  )

  const showFullChecklist =
    isBrandNew && withinThreeDays && (!dismissed || welcomeFromWizard)
  const showFloatingHelp = isBrandNew && dismissed && withinThreeDays && !welcomeFromWizard
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
          className="fixed bottom-6 right-6 z-40 size-11 rounded-full border-gray-200 bg-white shadow-md hover:bg-gray-50"
          aria-label="Erste Schritte anzeigen"
        >
          <HelpCircle className="size-5 text-gray-600" aria-hidden />
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
    <div
      className={cn(
        'relative mx-auto max-w-xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm',
        className ?? 'mt-12'
      )}
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-4 top-4 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        aria-label="Checkliste schließen"
      >
        <X className="size-4" aria-hidden />
      </button>

      <h2 className="pr-8 text-lg font-semibold text-gray-900">
        Willkommen bei RefStack! Lass uns deinen Workspace einrichten.
      </h2>
      <p className="mt-1 text-sm text-gray-500">
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
                  'group flex items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all hover:border-gray-100 hover:bg-gray-50',
                  done && 'opacity-90'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0 transition-all duration-300 ease-out',
                    done ? 'scale-110 text-emerald-600' : 'text-gray-300'
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
                    done ? 'text-gray-500 line-through decoration-gray-400' : 'text-gray-800'
                  )}
                >
                  {step.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
