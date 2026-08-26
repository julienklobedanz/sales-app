import type { RfpStammdatenRow } from '@/lib/deals/build-rfp-stammdaten-rows'

/** Erster Blick auf der Deal-Seite — Reihenfolge laut §3. */
const RFP_FACTS_IDENTITY_KEYS = [
  'customer',
  'procedure',
  'location',
  'serviceStart',
] as const

export function splitRfpFactsRows(rows: RfpStammdatenRow[]): {
  identity: RfpStammdatenRow[]
  tail: RfpStammdatenRow[]
} {
  const byKey = new Map(rows.map((row) => [row.key, row]))
  const identity = RFP_FACTS_IDENTITY_KEYS.map((key) => byKey.get(key)).filter(
    (row): row is RfpStammdatenRow => Boolean(row),
  )
  const identitySet = new Set<string>(RFP_FACTS_IDENTITY_KEYS)
  const tail = rows.filter((row) => !identitySet.has(row.key))
  return { identity, tail }
}
