import { describe, expect, it } from 'vitest'

import { parseReferenceHeuristicsFromText } from './heuristic-reference-extract'

describe('parseReferenceHeuristicsFromText', () => {
  it('erkennt Controlware-Layout: Kunde, Projekttitel, Herausforderung & Lösung', () => {
    const text = `Referenz
Aurubis AG
Die Aurubis AG ist ein weltweit führender Anbieter von Nichteisenmetallen und einer der größten Kupferrecycler der Welt. Das Unternehmen verarbeitet Erze und Recyclingmaterialien zu Kupfer.

Managed Service – Corporate IT-Infrastructure & Cloud

Herausforderung
Der Kunde benötigte eine einheitliche Betriebsmodell-Transformation für die gesamte IT-Infrastruktur.

Unsere Lösung
Controlware implementierte ein Managed Service mit Cloud-Anbindung und 24/7-Betrieb.`

    const parsed = parseReferenceHeuristicsFromText(text, {
      fileName: 'Projekt - Controlware.pdf',
    })
    expect(parsed.company_name).toBe('Aurubis AG')
    expect(parsed.title).toBe('Managed Service – Corporate IT-Infrastructure & Cloud')
    expect(parsed.customer_challenge).toContain('Betriebsmodell')
    expect(parsed.our_solution).toContain('Managed Service')
    expect(parsed.summary).toContain('Betriebsmodell')
    expect(parsed.summary).not.toMatch(/^Die Aurubis AG ist/)
  })
})
