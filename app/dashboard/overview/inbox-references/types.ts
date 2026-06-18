import type { ReferenceRow } from "@/app/dashboard/actions"

// Für das Konzept nutzen wir denselben Row-Typ wie im Dashboard,
// damit wir die bestehenden Detail-Abschnitte möglichst direkt übernehmen können.
export type ConceptReferenceRow = ReferenceRow

export function splitTags(tags: string | null | undefined): string[] {
  return (tags ?? "")
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

