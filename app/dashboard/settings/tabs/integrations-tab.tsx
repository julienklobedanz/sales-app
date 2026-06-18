'use client'

import Image from 'next/image'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSalesforceInstanceUrl } from '@/lib/crm/salesforce'
import { HubSpotIntegrationCard } from '../hubspot-integration-card'
import { AppIcon } from '@/lib/icons'
import { PlugSocketIcon } from '@hugeicons/core-free-icons'
import { SETTINGS_CARD_CLASS } from './settings-tab-shared'

type IntegrationsTabProps = {
  hubspotIntegration?: {
    configured: boolean
    connected: boolean
    canManage: boolean
    externalAccountId: string | null
    lastSyncAt: string | null
  }
}

export function IntegrationsTab({ hubspotIntegration }: IntegrationsTabProps) {
  return (
    <TabsContent value="integrations">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <HubSpotIntegrationCard
          cardClassName={SETTINGS_CARD_CLASS}
          configured={hubspotIntegration?.configured ?? false}
          connected={hubspotIntegration?.connected ?? false}
          canManage={hubspotIntegration?.canManage ?? false}
          externalAccountId={hubspotIntegration?.externalAccountId ?? null}
          lastSyncAt={hubspotIntegration?.lastSyncAt ?? null}
        />
        {[
          {
            key: 'Salesforce',
            desc: 'Synchronisiere Opportunities und Pipeline-Daten.',
            logo: 'https://logo.clearbit.com/salesforce.com',
            href: getSalesforceInstanceUrl(),
          },
          {
            key: 'Google News',
            desc: 'Nutze News-Signale für Market-Intelligence im Team.',
            logo: 'https://logo.clearbit.com/news.google.com',
            href: 'https://news.google.com/',
          },
          {
            key: 'CIO.de',
            desc: 'Binde deutschsprachige CIO-/IT-Entscheider-Signale für Account Research ein.',
            logo: 'https://logo.clearbit.com/cio.de',
            href: 'https://www.cio.de/',
          },
          {
            key: 'The Org',
            desc: 'Nutze Org-Charts und Rollenwechsel zur Identifikation von Decision Makern.',
            logo: 'https://logo.clearbit.com/theorg.com',
            href: 'https://theorg.com/',
          },
        ].map((integration) => (
          <div key={integration.key} className={SETTINGS_CARD_CLASS}>
            <CardHeader className="px-0 pt-0">
              <div className="flex items-center gap-2.5">
                <div className="relative size-7 overflow-hidden rounded-md border border-slate-200 bg-white">
                  <Image
                    src={integration.logo}
                    alt={`${integration.key} Logo`}
                    fill
                    sizes="28px"
                    className="object-contain p-1"
                    unoptimized
                  />
                </div>
                <CardTitle className="text-base">{integration.key}</CardTitle>
              </div>
              <CardDescription className="text-slate-500">{integration.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-0 pb-0 pt-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                <AppIcon icon={PlugSocketIcon} size={14} />
                Nicht verbunden
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full justify-center" asChild>
                <a href={integration.href} target="_blank" rel="noreferrer">
                  Verbindung einrichten
                </a>
              </Button>
            </CardContent>
          </div>
        ))}
      </div>
    </TabsContent>
  )
}
