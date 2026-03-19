/**
 * Market Signal / Company News – Platzhalter für spätere News-/RSS-API (z. B. Perplexity).
 * Gibt aggregierte News-Signale pro Firma zurück; später durch echten Fetch ersetzen.
 */

export type NewsItem = {
  id: string
  title: string
  summary: string
  sourceUrl: string
  sourceName: string
  publishedAt: string
}

export type CompanyNewsResult = {
  companyId: string
  companyName: string
  items: NewsItem[]
  /** Top 3 Bulletpoints: "Warum sollte Sales jetzt anrufen?" */
  topBullets: string[]
}

/**
 * Simulierter News-Fetch pro Firma. Später: echte API (RSS, News-API, Perplexity).
 */
export async function fetchCompanyNewsSignals(
  companyIds: { id: string; name: string }[]
): Promise<CompanyNewsResult[]> {
  // Simulierte Verzögerung
  await new Promise((r) => setTimeout(r, 400))

  return companyIds.map((c) => ({
    companyId: c.id,
    companyName: c.name,
    topBullets: [
      `Neue strategische Initiative bei ${c.name} – idealer Zeitpunkt für Gespräche.`,
      `Quartalszahlen zeigen Fokus auf Digitalisierung – passende Use Cases präsentieren.`,
      `Branchentrend: Entscheider suchen nach Partnern – Warm Intro vorbereiten.`,
    ],
    items: [
      {
        id: `sim-${c.id}-1`,
        title: `${c.name} kündigt Digitalisierungs-Offensive an`,
        summary: 'Das Unternehmen setzt im kommenden Jahr auf Cloud und Prozessoptimierung.',
        sourceUrl: 'https://example.com/news/1',
        sourceName: 'Unternehmenspresse (Simulation)',
        publishedAt: new Date().toISOString(),
      },
      {
        id: `sim-${c.id}-2`,
        title: `Quartalsergebnisse: ${c.name} übertrifft Erwartungen`,
        summary: 'Starker Fokus auf IT-Investitionen im nächsten Halbjahr.',
        sourceUrl: 'https://example.com/news/2',
        sourceName: 'Finanznachrichten (Simulation)',
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: `sim-${c.id}-3`,
        title: `CIO-Wechsel bei ${c.name}`,
        summary: 'Neuer IT-Leiter bringt Erfahrung aus der Branche mit.',
        sourceUrl: 'https://example.com/news/3',
        sourceName: 'Branchenportal (Simulation)',
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
  }))
}
