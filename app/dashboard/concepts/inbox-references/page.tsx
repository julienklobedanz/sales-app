import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import type { AppRole } from "@/hooks/useRole"
import { DEV_ROLE_COOKIE, parseAppRoleCookie } from "@/lib/dev-role-preview"
import { ROUTES } from "@/lib/routes"
import { createServerSupabaseClient } from "@/lib/supabase/server"

import { InboxReferencesConceptClient } from "./client"
import type { ConceptReferenceRow } from "./types"

export const dynamic = "force-dynamic"

export default async function InboxReferencesConceptPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, organization_id")
    .eq("id", user.id)
    .single()
  if (!profile) redirect(ROUTES.onboarding)

  const cookieStore = await cookies()
  const previewRole = parseAppRoleCookie(cookieStore.get(DEV_ROLE_COOKIE)?.value)
  const serverRole = profile.role as AppRole
  const effectiveRole: AppRole = previewRole ?? serverRole

  // Reuse der bestehenden Dashboard-Datenfunktion (inkl. Fallbacks/Relations).
  // Die Konzeptseite bleibt dadurch robust bei Schema-Varianten.
  const { getDashboardDataImpl } = await import("@/app/dashboard/references/dashboard")
  const dashboard = (await getDashboardDataImpl(false)) as { references: ConceptReferenceRow[] }

  const references =
    effectiveRole === "sales"
      ? dashboard.references.filter(
          (r) => r.status === "approved" || r.status === "internal_only" || r.status === "anonymized"
        )
      : dashboard.references

  const orgId = (profile as { organization_id?: string | null }).organization_id ?? ""
  const { data: externalContacts } = await supabase
    .from("external_contacts")
    .select("id, company_id, first_name, last_name, email, role, phone")
    .eq("organization_id", orgId)
    .order("last_name")

  return (
    <InboxReferencesConceptClient
      references={references}
      profileRole={effectiveRole}
      externalContacts={externalContacts ?? []}
    />
  )
}

