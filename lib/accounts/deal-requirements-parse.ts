import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'

/** Zeilen aus `deals.requirements_text` in Anforderungs-Labels überführen. */
export function parseRequirementsTextToExtracted(text: string | null | undefined): ExtractedRfpRequirement[] {
  const raw = String(text ?? '').trim()
  if (!raw) return []

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-*\d.)]+/, '').trim())
    .filter((line) => line.length >= 3)

  const seen = new Set<string>()
  const out: ExtractedRfpRequirement[] = []

  for (const line of lines) {
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const slug = line
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
    out.push({
      id: slug ? `req-${slug}` : `req-${out.length + 1}`,
      text: line,
    })
  }

  return out
}
