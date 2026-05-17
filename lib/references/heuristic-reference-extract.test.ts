import { describe, expect, it } from 'vitest'

import { parseReferenceHeuristicsFromText } from './heuristic-reference-extract'

describe('parseReferenceHeuristicsFromText', () => {
  it('erkennt Referenz-Layout mit Kunde und Titel', () => {
    const text = `Referenz
Aurubis AG
CRM-Konsolidierung für den Vertrieb

Herausforderung
Der Kunde benötigte eine einheitliche CRM-Landschaft.

Lösung
Controlware implementierte Microsoft Dynamics.`

    const parsed = parseReferenceHeuristicsFromText(text)
    expect(parsed.company_name).toBe('Aurubis AG')
    expect(parsed.title).toBe('CRM-Konsolidierung für den Vertrieb')
    expect(parsed.customer_challenge).toContain('CRM-Landschaft')
    expect(parsed.our_solution).toContain('Dynamics')
  })
})
