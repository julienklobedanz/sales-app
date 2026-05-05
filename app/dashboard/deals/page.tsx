import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Deals-Übersicht vorübergehend ausgeblendet (kein Sidebar-Eintrag). Detailrouten bleiben für Deep Links erhalten. */
export default function DealsPage() {
  redirect(ROUTES.home)
}
