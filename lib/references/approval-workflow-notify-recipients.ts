import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { profileCanManageOrgData } from '@/lib/roles/profile-guards'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return normalizeEmail(email).includes('@')
}

function wantsApprovalUpdateEmails(notificationSettings: unknown): boolean {
  if (!notificationSettings || typeof notificationSettings !== 'object') return true
  const flag = (notificationSettings as { email_on_approval_update?: unknown })
    .email_on_approval_update
  return flag !== false
}

async function resolveCoordinatorEmail(
  admin: SupabaseClient,
  companyId: string,
  organizationId: string,
  coordinatorEmail?: string | null,
): Promise<string | null> {
  const direct = String(coordinatorEmail ?? '').trim()
  if (isValidEmail(direct)) return direct

  const { data: companyRow } = await admin
    .from('companies')
    .select('internal_reference_approval_contact_id')
    .eq('id', companyId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  const contactId = (
    companyRow as { internal_reference_approval_contact_id?: string | null } | null
  )?.internal_reference_approval_contact_id
  if (!contactId) return null

  const { data: person } = await admin
    .from('contact_persons')
    .select('email')
    .eq('id', contactId)
    .eq('company_id', companyId)
    .maybeSingle()

  const email = String(person?.email ?? '').trim()
  return isValidEmail(email) ? email : null
}

async function resolveRequesterEmail(
  admin: SupabaseClient,
  requesterId: string | null,
  organizationId: string,
): Promise<string | null> {
  const id = String(requesterId ?? '').trim()
  if (!id) return null

  const { data: profile } = await admin
    .from('profiles')
    .select('system_role, function_role, notification_settings')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  const { systemRole, functionRole } = parseProfileRoles(profile)
  if (!profileCanManageOrgData(systemRole, functionRole)) return null
  if (
    !wantsApprovalUpdateEmails(
      (profile as { notification_settings?: unknown } | null)?.notification_settings,
    )
  ) {
    return null
  }

  // Service-Role weil: auth.users-E-Mail (profiles hat keine email-Spalte).
  // Grenze: requesterId + organization_id zuvor gegen profiles geprüft.
  const serviceAdmin = createServiceRoleSupabaseClient()
  if (!serviceAdmin) return null

  const { data: userData, error } = await serviceAdmin.auth.admin.getUserById(id)
  if (error || !userData?.user?.email) return null

  const email = userData.user.email.trim()
  return isValidEmail(email) ? email : null
}

/** Anfragender (nur Admin/AM, keine Sales) + Accountverantwortlicher der Freigabe. */
export async function resolveApprovalWorkflowNotifyEmails(
  admin: SupabaseClient,
  args: {
    companyId: string
    /** Pflicht — ohne Org kein Bypass-Lookup (E4). */
    organizationId: string
    requesterId: string | null
    coordinatorEmail?: string | null
  },
): Promise<string[]> {
  const organizationId = args.organizationId.trim()
  if (!organizationId) return []

  const emails: string[] = []

  const requesterEmail = await resolveRequesterEmail(
    admin,
    args.requesterId,
    organizationId,
  )
  if (requesterEmail) emails.push(requesterEmail)

  const coordinatorEmail = await resolveCoordinatorEmail(
    admin,
    args.companyId,
    organizationId,
    args.coordinatorEmail,
  )
  if (coordinatorEmail) emails.push(coordinatorEmail)

  const seen = new Set<string>()
  return emails.filter((email) => {
    const key = normalizeEmail(email)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
