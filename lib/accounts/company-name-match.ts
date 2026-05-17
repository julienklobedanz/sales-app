/** Rechtsform-Suffixe für Abgleich (Import: „Aurubis AG“ ↔ bestehender Account „Aurubis“). */
const LEGAL_SUFFIX_RE =
  /\s+(AG|GmbH|GmbH\s*&\s*Co\.?\s*KG|SE|KG|Inc\.?|Ltd\.?|LLC|Corp\.?|Corporation|Group|Gruppe|Holding|plc)\.?$/i

/**
 * Kernname für Vergleich — ohne Rechtsform, Kleinbuchstaben, ohne Sonderzeichen.
 */
export function normalizeCompanyNameForMatch(name: string): string {
  return String(name ?? '')
    .trim()
    .replace(LEGAL_SUFFIX_RE, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Zwei Firmennamen bezeichnen dieselbe Organisation (z. B. Aurubis / Aurubis AG). */
export function companyNamesEquivalent(a: string, b: string): boolean {
  const na = normalizeCompanyNameForMatch(a)
  const nb = normalizeCompanyNameForMatch(b)
  if (!na || !nb || na.length < 2 || nb.length < 2) return false
  return na === nb
}

const LEGAL_SUFFIX_STRIP_RE =
  /\s+(AG|GmbH|GmbH\s*&\s*Co\.?\s*KG|SE|KG|Inc\.?|Ltd\.?|LLC|Corp\.?|Corporation|Group|Gruppe|Holding|plc)\.?$/i

/** Anzeigename ohne Rechtsform, wenn Brandfetch keinen Namen liefert. */
export function stripLegalSuffixFromCompanyName(name: string): string {
  return String(name ?? '')
    .trim()
    .replace(LEGAL_SUFFIX_STRIP_RE, '')
    .trim()
}

/** Brandfetch-Name hat Vorrang; sonst Kernname ohne AG/GmbH. */
export function displayCompanyNameForImport(
  rawName: string,
  brandfetchName: string | null | undefined
): string {
  const fromApi = String(brandfetchName ?? '').trim()
  if (fromApi) return fromApi
  const stripped = stripLegalSuffixFromCompanyName(rawName)
  return stripped || rawName.trim()
}

/** Suchkern für DB-ilike (min. 3 Zeichen). */
export function companyNameSearchToken(name: string): string | null {
  const core = normalizeCompanyNameForMatch(name)
  if (core.length < 3) return null
  const first = core.split(/\s+/)[0]
  return first && first.length >= 3 ? first : core
}
