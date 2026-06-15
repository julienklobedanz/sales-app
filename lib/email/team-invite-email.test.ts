import { describe, expect, it } from 'vitest'

import {
  buildTeamInviteEmailHtml,
  formatTeamInviteRoleLabel,
  humanizeTeamInviteEmailError,
} from '@/lib/email/team-invite-email'

describe('team-invite-email', () => {
  it('formats invite role labels', () => {
    expect(formatTeamInviteRoleLabel('admin')).toBe('Admin')
    expect(formatTeamInviteRoleLabel('sales')).toBe('Sales')
  })

  it('builds branded html with invite link and meta', () => {
    const html = buildTeamInviteEmailHtml({
      to: 'new@example.com',
      inviterName: 'Alex Admin',
      orgName: 'Acme GmbH',
      role: 'sales',
      inviteLink: 'https://app.refstack.test/register?invite=abc',
      expiresAtLabel: '03.06.2026',
    })

    expect(html).toContain('Team-Einladung')
    expect(html).toContain('Alex Admin')
    expect(html).toContain('Acme GmbH')
    expect(html).toContain('Konto erstellen')
    expect(html).toContain('https://app.refstack.test/register?invite=abc')
    expect(html).toContain('03.06.2026')
    expect(html).toContain('RefStack')
  })

  it('humanizes missing resend configuration', () => {
    expect(humanizeTeamInviteEmailError('RESEND_API_KEY fehlt')).toMatch(/nicht konfiguriert/i)
    expect(humanizeTeamInviteEmailError('Invalid API key')).toMatch(/nicht korrekt konfiguriert/i)
  })
})
