import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleSupabaseClient: () => ({
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { email: 'requester@refstack.com' } },
        }),
      },
    },
  }),
}))

import { resolveApprovalWorkflowNotifyEmails } from './approval-workflow-notify-recipients'

function roleDimsFromLegacy(requesterRole: string) {
  if (requesterRole === 'account_manager') {
    return { system_role: 'member', function_role: 'account_manager' }
  }
  if (requesterRole === 'admin') {
    return { system_role: 'admin', function_role: 'sales_leader' }
  }
  return { system_role: 'member', function_role: 'sales_rep' }
}

function makeAdmin(overrides: {
  coordinatorEmail?: string | null
  companyContactEmail?: string | null
  requesterRole?: string
  emailOnApprovalUpdate?: boolean
}) {
  const from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  ...roleDimsFromLegacy(overrides.requesterRole ?? 'admin'),
                  notification_settings:
                    overrides.emailOnApprovalUpdate === false
                      ? { email_on_approval_update: false }
                      : { email_on_approval_update: true },
                },
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'companies') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { internal_reference_approval_contact_id: 'contact-1' },
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'contact_persons') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { email: overrides.companyContactEmail ?? 'am@account.com' },
              }),
            }),
          }),
        }),
      }
    }
    return {}
  })

  return { from } as unknown as import('@supabase/supabase-js').SupabaseClient
}

describe('resolveApprovalWorkflowNotifyEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes requester (admin) and coordinator email', async () => {
    const admin = makeAdmin({ coordinatorEmail: 'coordinator@account.com' })
    const emails = await resolveApprovalWorkflowNotifyEmails(admin, {
      companyId: 'company-1',
      organizationId: 'org-1',
      requesterId: 'user-requester',
      coordinatorEmail: 'coordinator@account.com',
    })
    expect(emails).toContain('requester@refstack.com')
    expect(emails).toContain('coordinator@account.com')
    expect(emails).toHaveLength(2)
  })

  it('excludes sales requester but keeps account manager', async () => {
    const admin = makeAdmin({
      requesterRole: 'sales',
      coordinatorEmail: 'am@account.com',
    })
    const emails = await resolveApprovalWorkflowNotifyEmails(admin, {
      companyId: 'company-1',
      organizationId: 'org-1',
      requesterId: 'user-requester',
      coordinatorEmail: 'am@account.com',
    })
    expect(emails).toEqual(['am@account.com'])
  })

  it('dedupes when requester and coordinator share an email', async () => {
    const admin = makeAdmin({ coordinatorEmail: 'requester@refstack.com' })
    const emails = await resolveApprovalWorkflowNotifyEmails(admin, {
      companyId: 'company-1',
      organizationId: 'org-1',
      requesterId: 'user-requester',
      coordinatorEmail: 'requester@refstack.com',
    })
    expect(emails).toEqual(['requester@refstack.com'])
  })

  it('skips requester when email_on_approval_update is disabled', async () => {
    const admin = makeAdmin({
      coordinatorEmail: 'am@account.com',
      emailOnApprovalUpdate: false,
    })
    const emails = await resolveApprovalWorkflowNotifyEmails(admin, {
      companyId: 'company-1',
      organizationId: 'org-1',
      requesterId: 'user-requester',
      coordinatorEmail: 'am@account.com',
    })
    expect(emails).toEqual(['am@account.com'])
  })

  it('returns no emails without organizationId', async () => {
    const admin = makeAdmin({ coordinatorEmail: 'am@account.com' })
    const emails = await resolveApprovalWorkflowNotifyEmails(admin, {
      companyId: 'company-1',
      organizationId: '  ',
      requesterId: 'user-requester',
      coordinatorEmail: 'am@account.com',
    })
    expect(emails).toEqual([])
  })
})
