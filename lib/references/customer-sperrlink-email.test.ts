import { describe, expect, it } from 'vitest'
import { buildCustomerControlLoopEmailHtml } from './customer-sperrlink-email'

describe('buildCustomerControlLoopEmailHtml', () => {
  it('includes vendor org and control copy with CTA', () => {
    const html = buildCustomerControlLoopEmailHtml({
      firstName: 'Anna',
      vendorOrgName: 'RefStack Demo Workspace',
      companyName: 'Allianz',
      refTitle: 'ESG-Reporting',
      manageUrl: 'https://app.example/p/demo?manage=secret&mode=revoke',
    })
    expect(html).toContain('RefStack Demo Workspace')
    expect(html).toContain('Vielen Dank für die Freigabe')
    expect(html).toContain('Anonymisierungs-Level ändern')
    expect(html).toContain('Zur freigegebenen Referenz')
    expect(html).toContain('manage=secret')
  })

  it('marks rotated link emails', () => {
    const html = buildCustomerControlLoopEmailHtml({
      firstName: '',
      vendorOrgName: 'RefStack Demo Workspace',
      companyName: 'Allianz',
      refTitle: 'ESG-Reporting',
      manageUrl: 'https://app.example/p/demo?manage=new',
      isNewLink: true,
    })
    expect(html).toContain('neuen persönlichen Kontroll-Link')
  })
})
