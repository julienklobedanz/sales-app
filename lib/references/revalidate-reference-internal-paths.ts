import { revalidatePath } from 'next/cache'
import { ROUTES } from '@/lib/routes'

/** Die Einfassung lebt auf der Sammelseite; die Objekt-URL ist nur Redirect. */
export function revalidateReferenceInternalPaths(referenceId: string) {
  revalidatePath(ROUTES.references.detail(referenceId))
  revalidatePath(ROUTES.references.root)
}
