import { COPY } from '@/lib/copy'
import type { DealWorkspaceArea } from '@/lib/deals/deal-workspace-areas'
import { dealWorkspaceAreaHref } from '@/lib/deals/deal-workspace-href'

export type AusschreibungNavItem = {
  id: DealWorkspaceArea
  href: string
  label: string
  count?: string | null
}

/**
 * Unterschiedliche Zählweise, absichtlich:
 * Dokumente zeigen immer eine Zahl, auch 0: Ohne Dokument passiert im
 * Arbeitsbereich nichts, die 0 ist der Handlungsaufruf.
 * Alle anderen Bereiche zeigen bei 0 keine Zahl: „nichts gefunden“ ist kein
 * Aufruf, sondern Rauschen.
 * §10.7: Die Zahlen zeigen, wo Arbeit liegt — nicht, dass überall eine steht.
 */
function countOrNull(value: number): string | null {
  return value > 0 ? String(value) : null
}

export function buildAusschreibungNavItems(input: {
  dealId: string
  documentCount: number
  stammdatenCount: number
  eligibilityCount: number
  risksCount: number
  draftsCovered: number
  draftsTotal: number
  lotsCount?: number
  showAnalysisLinks: boolean
}): AusschreibungNavItem[] {
  const href = (area: DealWorkspaceArea) =>
    dealWorkspaceAreaHref(input.dealId, area)

  const dokumente: AusschreibungNavItem = {
    id: 'dokumente',
    href: href('dokumente'),
    label: COPY.deals.cockpit.ausschreibungNavDokumente,
    count: String(input.documentCount), // immer, auch 0 — siehe countOrNull
  }

  if (!input.showAnalysisLinks) return [dokumente]

  return [
    {
      id: 'steckbrief',
      href: href('steckbrief'),
      label: COPY.deals.cockpit.ausschreibungNavSteckbrief,
    },
    dokumente,
    {
      id: 'stammdaten',
      href: href('stammdaten'),
      label: COPY.deals.cockpit.ausschreibungNavStammdaten,
      count: countOrNull(input.stammdatenCount),
    },
    {
      id: 'lose',
      href: href('lose'),
      label: COPY.deals.cockpit.ausschreibungNavLose,
      count: countOrNull(input.lotsCount ?? 0),
    },
    {
      id: 'eignung',
      href: href('eignung'),
      label: COPY.deals.cockpit.ausschreibungNavEignung,
      count: countOrNull(input.eligibilityCount),
    },
    {
      id: 'risiken',
      href: href('risiken'),
      label: COPY.deals.cockpit.ausschreibungNavRisiken,
      count: countOrNull(input.risksCount),
    },
    {
      id: 'entwuerfe',
      href: href('entwuerfe'),
      label: COPY.deals.cockpit.ausschreibungNavDrafts,
      count:
        input.draftsTotal > 0
          ? `${input.draftsCovered}/${input.draftsTotal}`
          : null,
    },
  ]
}
