/** Ergebniszeile für semantische Referenz-Suche (Epic 4 / Match Engine). */
export type MatchReferenceHit = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  /** Cosinus-Ähnlichkeit 0–1 (wie RPC `similarity`). */
  similarity: number
  /** Kurztext für Karten (aus Summary gekürzt). */
  snippet: string
  /** Account (Firma) der Referenz. */
  companyName: string | null
  companyId?: string | null
  companyLogoUrl?: string | null
  /** Projekt-/Volumenangabe (Rohwert wie in Evidence). */
  volumeEur: string | null
  /** Lifecycle-Status (draft/approved/internal_only/anonymized/external). */
  status?: string | null
  /** ISO-Timestamp der Erstellung (Fallback für Aktualität). */
  createdAt?: string | null
  /** Projektstart (ISO/Date). */
  projectStart?: string | null
  /** Projektende (ISO/Date) — bevorzugter Anker für Aktualitätsfilter. */
  projectEnd?: string | null
}

export type MatchReferencesResult =
  | { success: true; matches: MatchReferenceHit[] }
  | { success: false; error: string }

/** Strukturelle Vorfilter (Stufe C) — jeweils weggelassen/null = kein Filter. */
export type MatchReferenceFilters = {
  industries?: string[] | null
  /** Branchen-Ids ausschließen. */
  excludeIndustries?: string[] | null
  /** Freitext-Negationen (Titel/Summary/Snippet). */
  excludeTerms?: string[] | null
  /** Mindest-Volumen in Euro (numerisch). */
  minVolume?: number | null
  /** Höchst-Volumen in Euro (numerisch). */
  maxVolume?: number | null
  /**
   * Mehrere Volumen-Bänder (OR). Wenn gesetzt, hat Vorrang vor min/max
   * in der Client-Nachfilterung.
   */
  volumeBands?: Array<'lt1' | 'gte1' | 'gte2' | 'gte5' | 'gte10'> | null
  statuses?: string[] | null
  /** ISO-Timestamp; nur Referenzen mit Ankerdatum >= createdAfter. */
  createdAfter?: string | null
  /** ISO-Timestamp; nur Referenzen mit Ankerdatum < createdBefore (z. B. älter als 36 Monate). */
  createdBefore?: string | null
  /**
   * Mehrere Aktualitäts-Fenster (AND): positiv = letzte N Monate,
   * negativ = älter als |N| Monate. Hat Vorrang vor createdAfter/Before clientseitig.
   */
  monthsBackList?: number[] | null
  /** Kalenderjahre (UTC, Ankerdatum), die ausgeschlossen werden. */
  excludeCreatedYears?: number[] | null
}

export type MatchReferencesOptions = {
  matchThreshold?: number
  matchCount?: number
  /**
   * Nach Vektor-Top-N: GPT-4o-mini sortiert Kandidaten neu nach inhaltlicher Passung (~1–2s extra).
   * Bei API-Fehler bleibt die Vektor-Reihenfolge erhalten.
   */
  rerank?: boolean
  /** Strukturelle Vorfilter (Branche/Volumen/Status/Aktualität). */
  filters?: MatchReferenceFilters
}
