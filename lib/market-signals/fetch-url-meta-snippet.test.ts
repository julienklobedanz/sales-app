import { describe, expect, it } from 'vitest'

import { parseMetaDescriptionFromHtml } from './fetch-url-meta-snippet'

describe('parseMetaDescriptionFromHtml', () => {
  it('reads og:description', () => {
    const html = `<html><head>
      <meta property="og:description" content="Siemens investiert 200 Millionen Euro in ein neues Werk." />
    </head></html>`
    expect(parseMetaDescriptionFromHtml(html)).toContain('200 Millionen')
  })

  it('falls back to name=description', () => {
    const html = `<meta name="description" content="Kurze Zusammenfassung eines strategischen Führungswechsels im Vorstand." />`
    expect(parseMetaDescriptionFromHtml(html)).toContain('Führungswechsels')
  })
})
