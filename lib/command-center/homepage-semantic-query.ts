/**
 * Kurze Anreicherung vor dem Embedding — verbessert Volumen- und Branchen-Treffer.
 */
export function enrichHomepageSemanticQuery(raw: string): string {
  const q = raw.trim()
  if (!q) return q

  const hints: string[] = []

  const mio = q.match(/(\d+(?:[.,]\d+)?)\s*(?:mio\.?|million(?:en)?|m\.?\s*€)/i)
  if (mio) {
    const num = Number.parseFloat(mio[1]!.replace(',', '.'))
    if (Number.isFinite(num) && num > 0) {
      const eur = Math.round(num * 1_000_000)
      hints.push(`Volumen: ${eur} EUR`)
      hints.push(`Projektvolumen circa ${num} Millionen Euro`)
    }
  }

  const thousand = q.match(/(\d{3,})\s*(?:€|eur|euro)/i)
  if (!mio && thousand) {
    const digits = thousand[1]!.replace(/\./g, '')
    if (digits.length >= 6) {
      hints.push(`Volumen: ${digits} EUR`)
    }
  }

  const industryPatterns: Array<{ re: RegExp; label: string }> = [
    { re: /finanz(sektor|dienstleistung|branche)?|bank(en|ing)?|versicherung/i, label: 'Branche: Finanzdienstleistungen & Versicherung' },
    { re: /pharma|life\s*science|gesundheits(wesen)?/i, label: 'Branche: Gesundheitswesen & Life Sciences' },
    { re: /automotive|industrie/i, label: 'Branche: Industrie & Automotive' },
    { re: /öffentlich(er)?\s*sektor|behörde/i, label: 'Branche: Öffentlicher Sektor & Bildung' },
  ]
  for (const { re, label } of industryPatterns) {
    if (re.test(q)) {
      hints.push(label)
      break
    }
  }

  if (/zero\s*trust|siem|security|compliance|audit/i.test(q)) {
    hints.push('Security-Hardening, Zero Trust, Compliance und Audit-Anforderungen')
  }

  if (!hints.length) return q
  return `${q}\n\n${hints.join('\n')}`
}
