'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ROUTES } from '@/lib/routes'

export function DealDetailTabs({
  dealId,
  overview,
  desk,
}: {
  dealId: string
  overview: React.ReactNode
  desk: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') === 'desk' ? 'desk' : 'overview'

  return (
    <Tabs value={activeTab} className="w-full">
      <TabsList className="mb-6 h-auto w-full justify-start gap-1 bg-muted/50 p-1 sm:w-auto">
        <TabsTrigger value="overview" asChild>
          <Link href={ROUTES.deals.detailTab(dealId, 'overview')}>Übersicht</Link>
        </TabsTrigger>
        <TabsTrigger value="desk" asChild>
          <Link href={ROUTES.deals.detailTab(dealId, 'desk')}>KI-Analyse</Link>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-0 outline-none">
        {overview}
      </TabsContent>
      <TabsContent value="desk" className="mt-0 outline-none">
        {desk}
      </TabsContent>
    </Tabs>
  )
}
