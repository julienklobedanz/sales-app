import { redirect } from 'next/navigation'

import { ROUTES } from '@/lib/routes'

/** Legacy URL: Inbox-Referenzen sind unter „Referenzen“ integriert. */
export default function InboxReferencesConceptRedirectPage() {
  redirect(ROUTES.evidence.root)
}
