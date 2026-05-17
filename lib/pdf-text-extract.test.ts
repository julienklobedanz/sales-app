import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { extractPdfPlainText } from './pdf-text-extract'

const FIXTURE_PATHS = [
  '/Users/macbookpro/Downloads/Projekt - Controlware.pdf',
  'docs/fixtures/sample-reference.pdf',
]

describe('extractPdfPlainText', () => {
  it('extrahiert ausreichend Text aus einer Referenz-PDF', async () => {
    const path = FIXTURE_PATHS.find((p) => existsSync(p))
    if (!path) {
      return
    }
    const buffer = readFileSync(path)
    const text = await extractPdfPlainText(buffer)
    expect(text.trim().length).toBeGreaterThan(50)
    expect(text.toLowerCase()).toMatch(/referenz|aurubis|kunde|projekt/i)
  })
})
