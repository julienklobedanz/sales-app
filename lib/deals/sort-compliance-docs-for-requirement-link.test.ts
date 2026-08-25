import { describe, expect, it } from 'vitest'

import { sortComplianceDocsForRequirementLink } from './sort-compliance-docs-for-requirement-link'
import type { RequirementLinkPickDoc } from './requirement-link-types'

const iso: RequirementLinkPickDoc = {
  id: 'iso',
  title: 'ISO 27001 2025',
  documentType: 'iso_27001',
  validUntil: '2026-12-01',
}
const tisax: RequirementLinkPickDoc = {
  id: 'tisax',
  title: 'TISAX Label',
  documentType: 'tisax',
  validUntil: null,
}
const hr: RequirementLinkPickDoc = {
  id: 'hr',
  title: 'Handelsregister',
  documentType: 'handelsregisterauszug',
  validUntil: null,
}

describe('sortComplianceDocsForRequirementLink', () => {
  it('stellt Heuristik-Treffer vorn, Rest nach Typ dann Titel', () => {
    const sorted = sortComplianceDocsForRequirementLink({
      docs: [hr, tisax, iso],
      need: 'ISO 27001 verpflichtend',
      linkedDocumentIds: new Set(),
    })
    expect(sorted.map((d) => d.id)).toEqual(['iso', 'hr', 'tisax'])
    expect(sorted[0]?.suggested).toBe(true)
    expect(sorted.slice(1).every((d) => !d.suggested)).toBe(true)
  })

  it('lässt bereits verknüpfte IDs weg', () => {
    const sorted = sortComplianceDocsForRequirementLink({
      docs: [iso, tisax, hr],
      need: 'TISAX',
      linkedDocumentIds: new Set(['tisax']),
    })
    expect(sorted.map((d) => d.id)).toEqual(['hr', 'iso'])
  })
})
