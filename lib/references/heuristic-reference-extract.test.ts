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

  it('liest Kunde und Titel aus Referenz-Dateinamen', () => {
    const parsed = parseReferenceHeuristicsFromText('Referenz\n\n', {
      fileName: 'Referenz_SAP_SE_Cloud_Migration.pdf',
    })
    expect(parsed.company_name).toBe('SAP SE')
    expect(parsed.title).toBe('Cloud Migration')
  })

  it('bereinigt „es“-Artefakt aus extrahiertem Projekttitel', () => {
    const text = `Referenz
Deutsche Telekom AG
es Next-Gen Customer Data Platform & Churn Prevention

Herausforderung
Der Kunde benötigte eine moderne Datenplattform.`

    const parsed = parseReferenceHeuristicsFromText(text)
    expect(parsed.title).toBe('Next-Gen Customer Data Platform & Churn Prevention')
  })

  it('liest Laufzeit, Bestandsdienstleister und Wettbewerber', () => {
    const text = `Großanlage mit 224 Einheiten – gewonnen.
42 Monate Laufzeit · gegen zwei Mitbewerber durchgesetzt.
Gesamtvolumen 290.413 €
Bestandsdienstleister: Hausverwaltung Süd (22,50 €)
Wettbewerber: Competitor GmbH (22,50 €)
München 2026`

    const parsed = parseReferenceHeuristicsFromText(text)
    expect(parsed.duration_months).toBe(42)
    expect(parsed.incumbent_provider).toMatch(/Hausverwaltung Süd/)
    expect(parsed.competitors).toMatch(/Competitor GmbH/)
    expect(parsed.project_end).toBe('2026-12-31')
    expect(parsed.project_start).toBeTruthy()
  })
})
