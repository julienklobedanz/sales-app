import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/lib/routes'
import { hrefForCommandSearchResult } from '@/lib/command-center/search-navigation'

describe('hrefForCommandSearchResult', () => {
  it('verlinkt reference_document zur Referenz-Detailseite', () => {
    const href = hrefForCommandSearchResult({
      kind: 'reference_document',
      id: 'asset-1',
      fileName: 'Angebot.pdf',
      referenceId: 'ref-42',
      referenceTitle: 'Cloud Migration',
      companyName: 'ACME GmbH',
      hasFile: true,
    })

    expect(href).toBe(ROUTES.references.detail('ref-42'))
  })

  it('verlinkt RFP-Treffer auf das Deal-Cockpit', () => {
    const href = hrefForCommandSearchResult({
      kind: 'rfp',
      id: 'project-1',
      title: 'Ausschreibung Cloud',
      customerName: 'ACME GmbH',
      statusLabel: 'Analyse',
      dealId: 'deal-9',
    })

    expect(href).toBe(ROUTES.deals.detailRfp('deal-9'))
  })

  it('fällt ohne deal_id auf die Deal-Liste zurück', () => {
    const href = hrefForCommandSearchResult({
      kind: 'rfp',
      id: 'project-1',
      title: 'Ausschreibung Cloud',
      customerName: null,
      statusLabel: 'Analyse',
      dealId: null,
    })

    expect(href).toBe(ROUTES.deals.root)
  })

  it('verlinkt Zertifikat-Treffer auf die Nachweise-Sammlung', () => {
    const href = hrefForCommandSearchResult({
      kind: 'certificate',
      id: 'doc-1',
      title: 'ISO 27001',
      documentType: 'iso_27001',
      validUntilLine: 'Gültig bis 2027',
      hasFile: true,
    })

    expect(href).toBe('/compliance?view=lesen&id=doc-1')
  })
})
