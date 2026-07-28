import { COPY } from '@/lib/copy'

export type AusschreibungNavItem = {
  id: string
  href: string
  label: string
  count?: string | null
}

export function buildAusschreibungNavItems(input: {
  stammdatenCount: number
  eligibilityCount: number
  risksCount: number
  draftsCovered: number
  draftsTotal: number
  lotsCount?: number
  showAnalysisLinks: boolean
}): AusschreibungNavItem[] {
  const items: AusschreibungNavItem[] = [
    {
      id: 'dokumente',
      href: '#dokumente',
      label: COPY.deals.cockpit.ausschreibungNavDokumente,
    },
  ]

  if (!input.showAnalysisLinks) return items

  items.push(
    { id: 'urteil', href: '#urteil', label: COPY.deals.cockpit.ausschreibungNavUrteil },
    {
      id: 'stammdaten',
      href: '#stammdaten',
      label: COPY.deals.cockpit.ausschreibungNavStammdaten,
      count: input.stammdatenCount > 0 ? String(input.stammdatenCount) : null,
    },
    {
      id: 'lose',
      href: '#lose',
      label: COPY.deals.cockpit.ausschreibungNavLose,
      count: (input.lotsCount ?? 0) > 0 ? String(input.lotsCount) : null,
    },
    {
      id: 'eligCard',
      href: '#eligCard',
      label: COPY.deals.cockpit.ausschreibungNavEignung,
      count: input.eligibilityCount > 0 ? String(input.eligibilityCount) : null,
    },
    {
      id: 'risks',
      href: '#risks',
      label: COPY.deals.cockpit.ausschreibungNavRisiken,
      count: input.risksCount > 0 ? String(input.risksCount) : null,
    },
    {
      id: 'drafts',
      href: '#drafts',
      label: COPY.deals.cockpit.ausschreibungNavDrafts,
      count:
        input.draftsTotal > 0 ? `${input.draftsCovered}/${input.draftsTotal}` : null,
    }
  )

  return items
}
