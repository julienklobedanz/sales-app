'use client'

import Image from 'next/image'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSalesforceInstanceUrl } from '@/lib/crm/salesforce'
import { HubSpotIntegrationCard } from '../hubspot-integration-card'
import { AppIcon } from '@/lib/icons'
import { PlugSocketIcon } from '@hugeicons/core-free-icons'
import { SETTINGS_CARD_CLASS_COMPACT } from './settings-tab-shared'

type IntegrationsTabProps = {
  hubspotIntegration?: {
    configured: boolean
    connected: boolean
    canManage: boolean
    externalAccountId: string | null
    lastSyncAt: string | null
  }
}

type PlaceholderIntegration = {
  key: string
  desc: string
  logo: string
  href: string
  group: 'crm' | 'signals'
}

const PLACEHOLDER_INTEGRATIONS: PlaceholderIntegration[] = [
  {
    key: 'Salesforce',
    desc: 'Synchronisiere Opportunities und Pipeline-Daten.',
    logo: 'https://logo.clearbit.com/salesforce.com',
    href: getSalesforceInstanceUrl(),
    group: 'crm',
  },
  {
    key: 'Google News',
    desc: 'Nutze News-Signale für Market-Intelligence im Team.',
    logo: 'https://logo.clearbit.com/news.google.com',
    href: 'https://news.google.com/',
    group: 'signals',
  },
  {
    key: 'CIO.de',
    desc: 'Binde deutschsprachige CIO-/IT-Entscheider-Signale für Account Research ein.',
    logo: 'https://logo.clearbit.com/cio.de',
    href: 'https://www.cio.de/',
    group: 'signals',
  },
  {
    key: 'The Org',
    desc: 'Nutze Org-Charts und Rollenwechsel zur Identifikation von Decision Makern.',
    logo: 'https://logo.clearbit.com/theorg.com',
    href: 'https://theorg.com/',
    group: 'signals',
  },
]

function PlaceholderIntegrationCard({
  integration,
}: {
  integration: PlaceholderIntegration
}) {
  return (
    <div className={SETTINGS_CARD_CLASS_COMPACT}>
      <CardHeader className="space-y-1.5 px-0 pt-0 pb-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative size-7 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
              <Image
                src={integration.logo}
                alt={`${integration.key} Logo`}
                fill
                sizes="28px"
                className="object-contain p-1"
                unoptimized
              />
            </div>
            <CardTitle className="truncate text-sm font-semibold">
              {integration.key}
            </CardTitle>
          </div>
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            Bald
          </span>
        </div>
        <CardDescription
          className="line-clamp-1 text-xs text-slate-500"
          title={integration.desc}
        >
          {integration.desc}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5 px-0 pb-0 pt-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
          <AppIcon icon={PlugSocketIcon} size={12} />
          Nicht verbunden
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-center"
          asChild
        >
          <a href={integration.href} target="_blank" rel="noreferrer">
            Verbindung einrichten
          </a>
        </Button>
      </CardContent>
    </div>
  )
}

export function IntegrationsTab({ hubspotIntegration }: IntegrationsTabProps) {
  const crmPlaceholders = PLACEHOLDER_INTEGRATIONS.filter((i) => i.group === 'crm')
  const signalPlaceholders = PLACEHOLDER_INTEGRATIONS.filter((i) => i.group === 'signals')

  return (
    <TabsContent value="integrations">
      <div className="space-y-5">
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            CRM
          </h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <HubSpotIntegrationCard
              cardClassName={SETTINGS_CARD_CLASS_COMPACT}
              configured={hubspotIntegration?.configured ?? false}
              connected={hubspotIntegration?.connected ?? false}
              canManage={hubspotIntegration?.canManage ?? false}
              externalAccountId={hubspotIntegration?.externalAccountId ?? null}
              lastSyncAt={hubspotIntegration?.lastSyncAt ?? null}
              compact
            />
            {crmPlaceholders.map((integration) => (
              <PlaceholderIntegrationCard
                key={integration.key}
                integration={integration}
              />
            ))}
          </div>
        </section>

        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Marktsignale & Research
          </h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {signalPlaceholders.map((integration) => (
              <PlaceholderIntegrationCard
                key={integration.key}
                integration={integration}
              />
            ))}
          </div>
        </section>
      </div>
    </TabsContent>
  )
}
