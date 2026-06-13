'use client'

import Image from 'next/image'
import { Plus } from 'lucide-react'

type CrmIntegration = {
  id: string
  label: string
  backgroundColor: string
  logoSrc: string
  variant: 'brand' | 'light'
}

const CRM_INTEGRATIONS: CrmIntegration[] = [
  {
    id: 'salesforce',
    label: 'Verbinde Salesforce CRM',
    backgroundColor: '#00A1E0',
    logoSrc: '/brands/salesforce.png',
    variant: 'brand',
  },
  {
    id: 'hubspot',
    label: 'Verbinde HubSpot CRM',
    backgroundColor: '#FE4802',
    logoSrc: '/brands/hubspot.png',
    variant: 'brand',
  },
  {
    id: 'pipedrive',
    label: 'Verbinde Pipedrive CRM',
    backgroundColor: '#017737',
    logoSrc: '/brands/pipedrive.png',
    variant: 'brand',
  },
  {
    id: 'dynamics',
    label: 'Verbinde Microsoft Dynamics 365',
    backgroundColor: '#FFFFFF',
    logoSrc: '/brands/microsoft.svg',
    variant: 'light',
  },
  {
    id: 'zoho',
    label: 'Verbinde Zoho CRM',
    backgroundColor: '#006EB9',
    logoSrc: '/brands/zoho.png',
    variant: 'brand',
  },
]

const actionButtonClass =
  'box-border h-14 w-full max-w-md rounded-xl border border-transparent px-4 shadow-sm font-medium flex items-center gap-3 transition-all'

const crmButtonClass = `${actionButtonClass} opacity-50 pointer-events-none cursor-not-allowed`

/** Platzhalter rechts — gleiche Breite wie „Demnächst“-Badge für symmetrisches Layout */
const badgeSpacerClass = 'shrink-0 px-2 py-0.5 text-xs font-medium opacity-0 pointer-events-none select-none'

type AccountsOnboardingEmptyStateProps = {
  onCreateManual: () => void
  canCreateManual?: boolean
}

function CrmLogo({
  src,
  alt,
  variant,
}: {
  src: string
  alt: string
  variant: 'brand' | 'light'
}) {
  const wrapClass =
    variant === 'light'
      ? 'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md'
      : 'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white'

  return (
    <span className={wrapClass}>
      <Image
        src={src}
        alt={alt}
        width={24}
        height={24}
        className="size-6 object-contain"
        unoptimized={src.endsWith('.svg')}
      />
    </span>
  )
}

function SoonBadge({ variant }: { variant: 'brand' | 'light' }) {
  if (variant === 'light') {
    return (
      <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        Demnächst
      </span>
    )
  }

  return (
    <span className="shrink-0 rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
      Demnächst
    </span>
  )
}

export function AccountsOnboardingEmptyState({
  onCreateManual,
  canCreateManual = true,
}: AccountsOnboardingEmptyStateProps) {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center p-8">
      <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
        Bringe deine Zielkunden in Sekunden zu RefStack
      </h2>
      <p className="mx-auto mb-8 max-w-lg text-center text-sm text-gray-500">
        Verknüpfe dein bestehendes CRM, um noch mehr Insights für deine Accounts zu bekommen. RefStack
        reichert deine Accounts und Kontakte in Echtzeit mit Daten und detaillierten Firmen-Insights
        an.
      </p>

      <div className="flex w-full max-w-md flex-col gap-3">
        {CRM_INTEGRATIONS.map((integration) => {
          const isLight = integration.variant === 'light'

          return (
            <button
              key={integration.id}
              type="button"
              disabled
              aria-disabled
              className={`${crmButtonClass} ${isLight ? 'border-gray-200 text-gray-800' : 'text-white'}`}
              style={{ backgroundColor: integration.backgroundColor }}
            >
              <CrmLogo src={integration.logoSrc} alt="" variant={integration.variant} />
              <span className="min-w-0 flex-1 text-center text-sm leading-tight line-clamp-2">
                {integration.label}
              </span>
              <SoonBadge variant={integration.variant} />
            </button>
          )
        })}

        <div className="my-1 border-t border-gray-200" aria-hidden />

        <button
          type="button"
          onClick={onCreateManual}
          disabled={!canCreateManual}
          className={`${actionButtonClass} bg-violet-600 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/15">
            <Plus className="size-5 shrink-0 text-white" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-center text-sm leading-tight line-clamp-2">
            Ersten Account manuell hinzufügen
          </span>
          <span className={badgeSpacerClass} aria-hidden>
            Demnächst
          </span>
        </button>
      </div>
    </div>
  )
}
