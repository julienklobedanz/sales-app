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

  it('liest explizites Projektname-Label und ignoriert Projektzeitraum', () => {
    const text = `Referenz
Kunde: Apex Financial Health AG
Projektname
Managed Cloud Platform – Financial Services

Projektzeitraum 01.09.2023 – 28.02.2025

Herausforderung
Der Kunde benötigte eine skalierbare Cloud-Plattform.`

    const parsed = parseReferenceHeuristicsFromText(text, {
      fileName: 'Apex_Financial_Health.pdf',
    })
    expect(parsed.company_name).toBe('Apex Financial Health AG')
    expect(parsed.title).toBe('Managed Cloud Platform – Financial Services')
    expect(parsed.title).not.toMatch(/Projektzeitraum/)
  })

  it('bevorzugt inline Projektname vor Datumszeile', () => {
    const text = `Kunde: BioHealth Pharma Systems
Projektname: GxP-konforme Infrastruktur für Produktionssysteme
Projektzeitraum 01.02.2025 – 31.08.2025`

    const parsed = parseReferenceHeuristicsFromText(text)
    expect(parsed.title).toBe('GxP-konforme Infrastruktur für Produktionssysteme')
  })
})
