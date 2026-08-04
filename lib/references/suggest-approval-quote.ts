/** Kurzes Kunden-Zitat für die Freigabeseite — regelbasiert aus Referenztext. */

function firstSentence(text: string, maxLen = 140): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  const match = normalized.match(/^[^.!?]+[.!?]?/)
  const sentence = (match?.[0] ?? normalized).trim()
  if (sentence.length <= maxLen) return sentence
  const cut = sentence.slice(0, maxLen - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

function benefitPhrase(
  summary: string | null | undefined,
  solution: string | null | undefined,
): string {
  const source = (solution?.trim() || summary?.trim() || '').toLowerCase()
  if (/effizienz|produktiv|schnell|zeit|durchlauf/.test(source)) {
    return 'die Effizienz spürbar steigern'
  }
  if (/kosten|budget|einspar|roi/.test(source)) {
    return 'messbare wirtschaftliche Vorteile erzielen'
  }
  if (/qualität|stabilität|zuverläss|sicher/.test(source)) {
    return 'Qualität und Stabilität nachhaltig verbessern'
  }
  if (/transformation|modern|digital|cloud|sap/.test(source)) {
    return 'unsere Transformation zügig und sicher voranzubringen'
  }
  return 'unsere Projektziele partnerschaftlich und erfolgreich umsetzen'
}

export function suggestApprovalQuote(input: {
  orgName: string
  proposedQuote?: string | null
  summary?: string | null
  customerChallenge?: string | null
  ourSolution?: string | null
}): string {
  const proposed = input.proposedQuote?.trim()
  if (proposed) return proposed

  const org = input.orgName.trim() || 'unserem Partner'
  const benefit = benefitPhrase(input.summary, input.ourSolution)
  const detail = firstSentence(input.ourSolution ?? input.summary ?? '', 100)

  if (detail.length > 25) {
    return `Dank der guten Zusammenarbeit mit ${org} konnten wir ${benefit} — ${detail.replace(/\.$/, '')}.`
  }

  return `Dank der guten Zusammenarbeit mit ${org} konnten wir ${benefit}.`
}
