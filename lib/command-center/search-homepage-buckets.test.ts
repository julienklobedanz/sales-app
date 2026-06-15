import { describe, expect, it } from 'vitest'

import { sanitizeIlikeUserInput } from '@/lib/command-center/global-search'
import { mapReferenceAssetRow } from '@/lib/command-center/search-homepage-buckets'
import { emptyHomepageSearchGroups } from '@/lib/command-center/homepage-universal-types'

describe('sanitizeIlikeUserInput (homepage buckets)', () => {
  it('entfernt ILIKE-Sonderzeichen', () => {
    expect(sanitizeIlikeUserInput('100%_test\\')).toBe('100test')
  })

  it('liefert leeren String für nur Sonderzeichen', () => {
    expect(sanitizeIlikeUserInput('%%%')).toBe('')
  })
})

describe('mapReferenceAssetRow', () => {
  it('mappt Referenz-Asset mit Join-Daten', () => {
    const row = mapReferenceAssetRow({
      id: 'asset-1',
      file_name: 'Angebot.pdf',
      file_path: '/storage/angebot.pdf',
      reference_id: 'ref-1',
      references: {
        title: 'Cloud Migration',
        companies: { name: 'ACME GmbH' },
      },
    })

    expect(row).toEqual({
      kind: 'reference_document',
      id: 'asset-1',
      fileName: 'Angebot.pdf',
      referenceId: 'ref-1',
      referenceTitle: 'Cloud Migration',
      companyName: 'ACME GmbH',
      hasFile: true,
    })
  })

  it('nutzt Fallbacks bei fehlenden Join-Daten', () => {
    const row = mapReferenceAssetRow({
      id: 'asset-2',
      file_name: null,
      file_path: null,
      reference_id: 'ref-2',
      references: null,
    })

    expect(row.fileName).toBe('Dokument')
    expect(row.referenceTitle).toBe('Referenz')
    expect(row.companyName).toBeNull()
    expect(row.hasFile).toBe(false)
  })
})

describe('emptyHomepageSearchGroups', () => {
  it('liefert leere Gruppen', () => {
    expect(emptyHomepageSearchGroups()).toEqual({
      marketSignals: [],
      certificates: [],
      documents: [],
    })
  })
})
