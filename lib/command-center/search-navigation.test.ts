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

    expect(href).toBe(ROUTES.evidence.detail('ref-42'))
  })
})
