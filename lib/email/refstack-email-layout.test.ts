import { describe, expect, it } from 'vitest'

import {
  buildRefstackEmailHtml,
  buildReferenceMetaRows,
  escapeRefstackEmailHtml,
} from './refstack-email-layout'

describe('buildRefstackEmailHtml', () => {
  it('renders table layout with RefStack header and internal badge', () => {
    const html = buildRefstackEmailHtml({
      audience: 'internal',
      badge: 'Freigabe erteilt',
      greeting: 'Hallo,',
      bodyHtml: '<p style="margin:0 0 16px;">Der Kunde hat freigegeben.</p>',
      meta: { rows: buildReferenceMetaRows('Network 5G', 'AT&T') },
      ctas: [{ label: 'Referenz ansehen', href: 'https://app.refstack.test/ref/1' }],
      footerLink: {
        label: 'Referenz in RefStack öffnen:',
        url: 'https://app.refstack.test/ref/1',
      },
    })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('role="presentation"')
    expect(html).toContain('RefStack')
    expect(html).toContain('Interne Benachrichtigung')
    expect(html).toContain('Freigabe erteilt')
    expect(html).toContain('Network 5G')
    expect(html).toContain('Referenz ansehen')
    expect(html).toContain('Automatische Benachrichtigung')
  })

  it('renders external audience label', () => {
    const html = buildRefstackEmailHtml({
      audience: 'external',
      badge: 'Freigabe-Anfrage',
      greeting: 'Hallo Max!',
      bodyHtml: '<p style="margin:0 0 16px;">Bitte prüfen Sie die Referenz.</p>',
      ctas: [
        { label: 'Zur Freigabe-Seite', href: 'https://app.refstack.test/approval/tok' },
      ],
    })

    expect(html).toContain('Referenz-Freigabe')
    expect(html).toContain('Freigabe-Anfrage')
    expect(html).toContain('Diese E-Mail betrifft eine Referenz-Freigabe')
  })
})

describe('escapeRefstackEmailHtml', () => {
  it('escapes html characters', () => {
    expect(escapeRefstackEmailHtml(`a & b <c> "d"`)).toBe(
      'a &amp; b &lt;c&gt; &quot;d&quot;',
    )
  })
})
