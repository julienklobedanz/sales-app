import { DEFAULT_DIGEST_TIMEZONE, parseDigestTimezone } from '@/lib/market-signals/digest-schedule'

export type OrganizationBillingSettings = {
  companyAddress: string
  vatId: string
  defaultTimezone: string
  inviteAllowedEmailDomains: string
}

export function parseOrganizationBillingSettings(raw: unknown): OrganizationBillingSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      companyAddress: '',
      vatId: '',
      defaultTimezone: DEFAULT_DIGEST_TIMEZONE,
      inviteAllowedEmailDomains: '',
    }
  }
  const obj = raw as Record<string, unknown>
  return {
    companyAddress: typeof obj.billing_company_address === 'string' ? obj.billing_company_address : '',
    vatId: typeof obj.billing_vat_id === 'string' ? obj.billing_vat_id : '',
    defaultTimezone: parseDigestTimezone(obj.default_timezone),
    inviteAllowedEmailDomains:
      typeof obj.invite_allowed_email_domains === 'string' ? obj.invite_allowed_email_domains : '',
  }
}

export function parseInviteAllowedDomains(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
}
