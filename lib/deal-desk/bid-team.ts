import { MOCK_TEAM_MEMBERS } from '@/lib/deal-desk/mock-analysis'

export const BID_TEAM_ADD_CONTACT_VALUE = '__add_contact__'

export type BidTeamMember = {
  id: string
  name: string
  email?: string
}

export function initialBidTeamMembers(): BidTeamMember[] {
  return MOCK_TEAM_MEMBERS.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.id === 'self' ? undefined : undefined,
  }))
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidBidTeamEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function memberFromEmail(email: string): BidTeamMember {
  const normalized = email.trim().toLowerCase()
  return {
    id: `email:${normalized}`,
    name: normalized,
    email: normalized,
  }
}

export function findBidTeamMember(
  members: BidTeamMember[],
  id: string
): BidTeamMember | undefined {
  return members.find((m) => m.id === id)
}
