'use client'

import Image from 'next/image'

import { getHubSpotConnectHref } from '@/lib/crm/hubspot/oauth-return'

const CRM_BUTTON_CLASS =
  'flex h-12 w-full items-center gap-3 rounded-xl border border-transparent px-4 text-sm font-medium shadow-sm transition-all'

const DISABLED_BUTTON_CLASS = `${CRM_BUTTON_CLASS} cursor-not-allowed opacity-50 pointer-events-none`

type CrmConnectStepProps = {
  hubspotConfigured: boolean
  onSkip: () => void
}

function CrmLogo({ src }: { src: string }) {
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
      <Image src={src} alt="" width={24} height={24} className="size-6 object-contain" />
    </span>
  )
}

function SoonBadge() {
  return (
    <span className="shrink-0 rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white/90">
      Demnächst
    </span>
  )
}

export function CrmConnectStep({ hubspotConfigured, onSkip }: CrmConnectStepProps) {
  const hubSpotActive = hubspotConfigured

  return (
    <div className="flex flex-col gap-3">
      {hubSpotActive ? (
        <a
          href={getHubSpotConnectHref('onboarding')}
          className={`${CRM_BUTTON_CLASS} bg-[#FE4802] text-white hover:brightness-105`}
        >
          <CrmLogo src="/brands/hubspot.png" />
          <span className="min-w-0 flex-1 text-center leading-tight">
            Verbinde HubSpot CRM
          </span>
          <span className="shrink-0 rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
            Verbinden
          </span>
        </a>
      ) : (
        <button
          type="button"
          disabled
          className={DISABLED_BUTTON_CLASS}
          style={{ backgroundColor: '#FE4802' }}
        >
          <CrmLogo src="/brands/hubspot.png" />
          <span className="min-w-0 flex-1 text-center text-white">
            Verbinde HubSpot CRM
          </span>
          <SoonBadge />
        </button>
      )}

      <button
        type="button"
        disabled
        className={DISABLED_BUTTON_CLASS}
        style={{ backgroundColor: '#00A1E0' }}
      >
        <CrmLogo src="/brands/salesforce.png" />
        <span className="min-w-0 flex-1 text-center text-white">
          Verbinde Salesforce CRM
        </span>
        <SoonBadge />
      </button>

      <button
        type="button"
        disabled
        className={DISABLED_BUTTON_CLASS}
        style={{ backgroundColor: '#017737' }}
      >
        <CrmLogo src="/brands/pipedrive.png" />
        <span className="min-w-0 flex-1 text-center text-white">
          Verbinde Pipedrive CRM
        </span>
        <SoonBadge />
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="mt-4 block w-full text-center text-sm text-muted-foreground transition-colors hover:text-muted-foreground"
      >
        Accounts später importieren oder manuell anlegen (Schritt überspringen)
      </button>
    </div>
  )
}
