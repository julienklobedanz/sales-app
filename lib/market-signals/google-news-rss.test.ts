import { describe, expect, it } from 'vitest'
import { buildCompanyNewsRssQuery, parseGoogleNewsRssXml } from './google-news-rss'

describe('parseGoogleNewsRssXml', () => {
  it('parses a minimal RSS item', () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[ACME kauft Beta GmbH - Handelsblatt]]></title>
          <link>https://news.google.com/rss/articles/abc123</link>
          <pubDate>Mon, 03 Feb 2025 10:00:00 GMT</pubDate>
          <source url="https://example.com">Handelsblatt</source>
        </item>
      </channel></rss>`
    const items = parseGoogleNewsRssXml(xml)
    expect(items).toHaveLength(1)
    expect(items[0]!.title).toContain('ACME')
    expect(items[0]!.link).toContain('google.com')
    expect(items[0]!.sourceLabel).toBe('Handelsblatt')
    expect(items[0]!.pubDate?.getUTCFullYear()).toBe(2025)
  })
})

describe('buildCompanyNewsRssQuery', () => {
  it('includes site: when host present', () => {
    expect(buildCompanyNewsRssQuery('Siemens AG', 'siemens.com')).toContain('site:siemens.com')
  })
  it('falls back to quoted name only', () => {
    expect(buildCompanyNewsRssQuery('Local Shop', null)).toBe('"Local Shop"')
  })
})
