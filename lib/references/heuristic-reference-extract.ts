import type { ExtractedReferenceData } from '@/app/dashboard/evidence/new/types'
import { clampNarrativeTextNullable } from '@/lib/references/reference-narrative-limits'

const COMPANY_SUFFIX =
  /\b(AG|GmbH|SE|KG|Inc\.?|Ltd\.?|LLC|Corp\.?|Group|Gruppe|Holding|plc)\b/i

const SECTION_CHALLENGE =
  /^(herausforderung|ausgangssituation|ausgangslage|challenge|problemstellung|situation)\b/i
const SECTION_SOLUTION =
  /^(lösung|unsere\s+lösung|solution|vorgehen|umsetzung|ergebnis|nutzen)\b/i

function normalizeLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)
}

function looksLikeCompanyName(line: string): boolean {
  const t = line.trim()
  if (t.length < 2 || t.length > 120) return false
  if (/^referenz$/i.test(t)) return false
  if (COMPANY_SUFFIX.test(t)) return true
  if (/^[A-ZÄÖÜ][\wäöüß&.\- ]{2,80}$/.test(t) && t.split(/\s+/).length <= 8) return true
  return false
}

function looksLikeTitle(line: string, companyName: string | null): boolean {
  const t = line.trim()
  if (t.length < 8 || t.length > 160) return false
  if (/^referenz$/i.test(t)) return false
  if (companyName && t.toLowerCase() === companyName.toLowerCase()) return false
  if (looksLikeCompanyName(t) && !/\b(case study|projekt|konsolidierung|migration|digitalisierung)\b/i.test(t)) {
    return false
  }
  if (/^(seite|page)\s+\d+$/i.test(t)) return false
  if (/^www\./i.test(t) || /^https?:\/\//i.test(t)) return false
  return true
}

function extractSection(lines: string[], startPattern: RegExp, stopPatterns: RegExp[]): string | null {
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (startPattern.test(lines[i]!)) {
      start = i + 1
      break
    }
  }
  if (start < 0) return null
  const parts: string[] = []
  for (let i = start; i < Math.min(lines.length, start + 24); i++) {
    const line = lines[i]!
    if (stopPatterns.some((p) => p.test(line))) break
    if (line.length >= 20) parts.push(line)
    if (parts.join(' ').length > 400) break
  }
  const joined = parts.join(' ').trim()
  return joined.length >= 20 ? clampNarrativeTextNullable(joined) : null
}

function titleFromFileName(fileName: string | undefined): string | null {
  if (!fileName?.trim()) return null
  const stem = fileName.replace(/\.[^.]+$/, '').trim()
  if (!stem || stem.length < 3) return null
  const cleaned = stem
    .replace(/[-_]+/g, ' ')
    .replace(/\b(case study|casestudy|referenz|projekt)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned.length < 5) return null
  if (/^(tuvsud|csp|bmw)/i.test(cleaned) && cleaned.split(/\s+/).length <= 4) {
    return null
  }
  return cleaned
}

/**
 * Kostenlose Extraktion aus Dokumenttext (ohne OpenAI) — für Bulk-Import & Fallback.
 */
export function parseReferenceHeuristicsFromText(
  documentText: string,
  options?: { fileName?: string; pdfTitle?: string | null }
): ExtractedReferenceData {
  const lines = normalizeLines(documentText)
  let company_name: string | null = null
  let title: string | null = null

  const pdfTitle = String(options?.pdfTitle ?? '').trim()
  if (pdfTitle.length >= 8 && !/^untitled$/i.test(pdfTitle)) {
    title = pdfTitle
  }

  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const line = lines[i]!
    if (/^referenz$/i.test(line)) {
      const next = lines[i + 1]
      if (next && looksLikeCompanyName(next)) {
        company_name = next.trim()
        const after = lines[i + 2]
        if (after && looksLikeTitle(after, company_name) && !title) {
          title = after.trim()
        }
      }
      continue
    }
    const kundeMatch = line.match(/^(?:kunde|customer|auftraggeber|mandant)\s*[:–-]\s*(.+)$/i)
    if (kundeMatch?.[1] && looksLikeCompanyName(kundeMatch[1])) {
      company_name = kundeMatch[1].trim()
    }
  }

  if (!company_name) {
    for (const line of lines.slice(0, 30)) {
      if (looksLikeCompanyName(line) && !/^controlware/i.test(line)) {
        company_name = line.trim()
        break
      }
    }
  }

  if (!title) {
    for (const line of lines.slice(0, 25)) {
      if (looksLikeTitle(line, company_name)) {
        title = line.trim()
        break
      }
    }
  }

  if (!title) {
    title = titleFromFileName(options?.fileName) ?? null
  }

  const customer_challenge = extractSection(lines, SECTION_CHALLENGE, [
    SECTION_SOLUTION,
    /^ergebnis\b/i,
    /^nutzen\b/i,
  ])
  const our_solution = extractSection(lines, SECTION_SOLUTION, [
    SECTION_CHALLENGE,
    /^über\s+/i,
    /^kontakt\b/i,
  ])

  let summary: string | null = null
  if (company_name) {
    const idx = lines.findIndex(
      (l) => l.toLowerCase().startsWith(company_name!.toLowerCase().slice(0, 12))
    )
    if (idx >= 0) {
      const para = lines.slice(idx, idx + 4).join(' ')
      if (para.length >= 40) summary = clampNarrativeTextNullable(para)
    }
  }

  return {
    title,
    summary,
    industry: null,
    volume_eur: null,
    employee_count: null,
    tags: [],
    company_name,
    customer_challenge,
    our_solution,
  }
}
