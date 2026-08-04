import { describe, expect, it } from 'vitest'

import {
  sanitizeCompellingEventForDisplay,
  truncateToCompleteSentences,
} from '@/lib/market-signals/compelling-event'

describe('truncateToCompleteSentences', () => {
  it('returns null for empty input', () => {
    expect(truncateToCompleteSentences('')).toBeNull()
    expect(truncateToCompleteSentences('   ')).toBeNull()
  })

  it('keeps short text and ensures sentence end', () => {
    expect(truncateToCompleteSentences('Siemens investiert in KI')).toBe(
      'Siemens investiert in KI.',
    )
  })

  it('keeps up to two complete sentences within the limit', () => {
    const input =
      'Apple plant die Übernahme eines KI-Hardware-Start-ups. Das soll die Produktpalette erweitern. Danach folgt noch ein dritter Satz mit viel Text.'
    const out = truncateToCompleteSentences(input, 120)
    expect(out).toBe(
      'Apple plant die Übernahme eines KI-Hardware-Start-ups. Das soll die Produktpalette erweitern.',
    )
    expect(out).not.toContain('…')
    expect(out?.endsWith('.')).toBe(true)
  })

  it('never truncates mid-sentence with ellipsis', () => {
    const longFirst =
      'Mit der Übernahme wird Apple seine KI-Strategie vorantreiben und neue Technologien integrieren bevor die Budgetplanung für das nächste Jahr abgeschlossen ist und weitere Partner eingebunden werden.'
    const out = truncateToCompleteSentences(longFirst, 80)
    expect(out).toBe(
      'Mit der Übernahme wird Apple seine KI-Strategie vorantreiben und neue Technologien integrieren bevor die Budgetplanung für das nächste Jahr abgeschlossen ist und weitere Partner eingebunden werden.',
    )
    expect(out).not.toContain('…')
  })
})

describe('sanitizeCompellingEventForDisplay', () => {
  it('strips legacy cloud boilerplate suffix', () => {
    const raw =
      'Apple stellt mit 89 Emmy Award Nominierungen einen neuen Rekord auf - Apple. Das erhöht kurzfristig den Bedarf an einem klaren Business Case für unsere Cloud-Infrastruktur-Lösung.'
    const out = sanitizeCompellingEventForDisplay(raw)
    expect(out).toContain('Emmy')
    expect(out).not.toMatch(/Cloud-Infrastruktur/i)
  })

  it('hides generic Führungsrolle template', () => {
    expect(
      sanitizeCompellingEventForDisplay(
        'Tim Cook wechselt auf den neue Führungsrolle-Posten bei Apple.',
      ),
    ).toBeNull()
  })
})
