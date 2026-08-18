'use client'

import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

import { OnboardingBrandPanel } from './onboarding-brand-panel'
import { cn } from '@/lib/utils'

type BrandPanelContent = {
  title: string
  description?: string
  bullets?: string[]
}

export type OnboardingTransition = 'idle' | 'exit-left' | 'exit-up' | 'enter-right'

type OnboardingShellProps = {
  stepIndex: number
  stepCount: number
  title: string
  subtitle: string
  brandContent: BrandPanelContent
  transition: OnboardingTransition
  onBack?: () => void
  children: ReactNode
}

export function OnboardingShell({
  stepIndex,
  stepCount,
  title,
  subtitle,
  brandContent,
  transition,
  onBack,
  children,
}: OnboardingShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-accent/50">
      <div
        className={cn(
          'grid min-h-screen grid-cols-1 will-change-transform lg:grid-cols-2',
          'transition-[transform,opacity] duration-500 ease-in-out',
          transition === 'exit-left' && '-translate-x-full opacity-0',
          transition === 'exit-up' && '-translate-y-full opacity-0',
          transition === 'enter-right' && 'translate-x-full opacity-0',
          transition === 'idle' && 'translate-x-0 translate-y-0 opacity-100',
        )}
      >
        <div className="flex flex-col items-center justify-center bg-background/75 px-8 py-10 backdrop-blur-xl lg:px-16">
          <div className="flex w-full max-w-sm flex-col gap-6 text-left">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Schritt {stepIndex + 1} von {stepCount}
              </p>
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
                  Zurück
                </button>
              ) : null}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>

            <div className="w-full">{children}</div>
          </div>
        </div>

        <OnboardingBrandPanel content={brandContent} />
      </div>
    </div>
  )
}
