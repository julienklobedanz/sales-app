import { describe, expect, it } from 'vitest'
import { parseRequirementsTextToExtracted } from './deal-requirements-parse'

describe('parseRequirementsTextToExtracted', () => {
  it('splits multiline requirements_text', () => {
    const rows = parseRequirementsTextToExtracted('ISO 27001\n• DSGVO Hosting EU\n2. 24/7 Support')
    expect(rows).toHaveLength(3)
    expect(rows[0]?.text).toBe('ISO 27001')
    expect(rows[1]?.text).toBe('DSGVO Hosting EU')
  })

  it('deduplicates case-insensitive lines', () => {
    const rows = parseRequirementsTextToExtracted('ISO 27001\niso 27001')
    expect(rows).toHaveLength(1)
  })
})
