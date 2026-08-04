import type { ExtractedReferenceData } from '@/lib/references/extract-types'
import {
  extractCompanyNameFromFileName,
  extractProjectTitleHintFromFileName,
} from '@/lib/references/bulk-import-grouping'
import { clampNarrativeTextNullable } from '@/lib/references/reference-narrative-limits'
import { sanitizeExtractedProjectTitle } from '@/lib/references/bulk-import-preview-utils'

const COMPANY_SUFFIX =
  /\b(AG|GmbH|SE|KG|Inc\.?|Ltd\.?|LLC|Corp\.?|Group|Gruppe|Holding|plc)\b/i

const SECTION_CHALLENGE =
  /^(herausforderung|herausforderung\s+des\s+kunden|kundenherausforderung|ausgangssituation|ausgangslage|challenge|problemstellung|situation|ausgangspunkt)\b/i
const SECTION_SOLUTION =
  /^(lösung|unsere\s+lösung|unsere\s+leistung|leistung|solution|vorgehen|umsetzung|projektumsetzung|ergebnis|nutzen|mehrwert)\b/i

const INLINE_CHALLENGE =
  /^(?:herausforderung|kundenherausforderung|ausgangssituation)(?:\s+des\s+kunden)?\s*[:–-]?\s*(.+)/i
const INLINE_SOLUTION =
  /^(?:unsere\s+lösung|lösung|unsere\s+leistung|vorgehen|umsetzung)(?:\s+von\s+controlware)?\s*[:–-]?\s*(.+)/i

const PROJECT_NAME_LABEL =
  /^(?:projektname|project\s*name|referenztitel|projekttitel|titel\s+des\s+projekts?)\s*[:–-]?\s*(.*)$/i
const PROJECT_PERIOD_LABEL =
  /^(?:projektzeitraum|zeitraum|projektlaufzeit|laufzeit|project\s*period|duration)\b/i
const DATE_RANGE_IN_LINE =
  /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\s*[–—-]\s*\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/

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

function isBoilerplateCompanyDescription(
  line: string,
  companyName: string | null,
): boolean {
  const t = line.trim()
  if (t.length > 130) return true
  if (/^Die\s+.+\s+ist\s+(ein|eine|der|die)\s+/i.test(t)) return true
  if (
    /\b(ist ein weltweit|ist eine der|ist einer der|ist ein führender|führender anbieter)\b/i.test(
      t,
    )
  ) {
    return true
  }
  if (companyName) {
    const short = companyName.replace(/\s+(AG|GmbH|SE)$/i, '').trim()
    if (short.length > 3 && t.includes(short) && /\bist\s+(ein|eine)\b/i.test(t))
      return true
  }
  return false
}

function scoreProjectTitle(line: string, companyName: string | null): number {
  const t = line.trim()
  if (t.length < 10 || t.length > 150) return -100
  if (/^referenz$/i.test(t)) return -100
  if (PROJECT_PERIOD_LABEL.test(t)) return -100
  if (DATE_RANGE_IN_LINE.test(t) && t.length < 80) return -100
  if (/^(?:kunde|customer|auftraggeber|mandant)\s*[:–-]/i.test(t)) return -100
  if (companyName && t.toLowerCase() === companyName.toLowerCase()) return -100
  if (
    looksLikeCompanyName(t) &&
    !/\b(service|infrastructure|infrastruktur|cloud|migration)\b/i.test(t)
  ) {
    return -80
  }
  if (isBoilerplateCompanyDescription(t, companyName)) return -100
  if (/^(seite|page)\s+\d+$/i.test(t)) return -100
  if (/^www\./i.test(t) || /^https?:\/\//i.test(t)) return -100

  let score = 0
  if (/[–—]/.test(t)) score += 35
  if (/\s[-–]\s/.test(t)) score += 25
  if (
    /\b(service|infrastructure|infrastruktur|cloud|migration|konsolidierung|digitalisierung|rollout|modernisierung|plattform|transformation)\b/i.test(
      t,
    )
  ) {
    score += 28
  }
  const words = t.split(/\s+/).length
  if (words >= 3 && words <= 14) score += 20
  if (words > 18) score -= 30
  if (/^[A-ZÄÖÜ0-9]/.test(t) && !/[.!?]\s*$/.test(t)) score += 8
  if (/\b(der|die|das)\s+\w+\s+ist\b/i.test(t)) score -= 60
  if (/\b(verarbeitet|produziert|bietet|entwickelt)\b/i.test(t) && words > 8) score -= 25
  return score
}

function pickBestProjectTitle(
  lines: string[],
  companyName: string | null,
): string | null {
  let best: string | null = null
  let bestScore = 15
  for (const line of lines.slice(0, 50)) {
    const score = scoreProjectTitle(line, companyName)
    if (score > bestScore) {
      bestScore = score
      best = line.trim()
    }
  }
  return best
}

function isUsableProjectTitleLine(line: string, companyName: string | null): boolean {
  const t = line.trim()
  if (t.length < 3 || t.length > 150) return false
  if (PROJECT_PERIOD_LABEL.test(t)) return false
  if (/^(?:kunde|customer|auftraggeber|mandant)\s*[:–-]/i.test(t)) return false
  if (
    DATE_RANGE_IN_LINE.test(t) &&
    !/\b(service|infrastructure|cloud|migration)\b/i.test(t)
  ) {
    return false
  }
  if (companyName && t.toLowerCase() === companyName.toLowerCase()) return false
  if (
    looksLikeCompanyName(t) &&
    !/\b(service|infrastructure|infrastruktur|cloud|migration)\b/i.test(t)
  ) {
    return false
  }
  return scoreProjectTitle(t, companyName) > 0
}

function extractLabeledProjectTitle(
  lines: string[],
  companyName: string | null,
): string | null {
  for (let i = 0; i < Math.min(lines.length, 60); i++) {
    const line = lines[i]!
    const labelMatch = line.match(PROJECT_NAME_LABEL)
    if (!labelMatch) continue

    const inline = labelMatch[1]?.trim()
    if (
      inline &&
      !PROJECT_PERIOD_LABEL.test(inline) &&
      !DATE_RANGE_IN_LINE.test(inline)
    ) {
      if (inline.length >= 5) return inline
    }

    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      const candidate = lines[j]!.trim()
      if (!candidate) continue
      if (PROJECT_NAME_LABEL.test(candidate) || PROJECT_PERIOD_LABEL.test(candidate))
        break
      if (isUsableProjectTitleLine(candidate, companyName)) {
        return candidate
      }
      if (candidate.length >= 8 && !DATE_RANGE_IN_LINE.test(candidate)) {
        return candidate
      }
      break
    }
  }
  return null
}

function extractSectionInline(
  lines: string[],
  inlinePattern: RegExp,
  startPattern: RegExp,
  stopPatterns: RegExp[],
): string | null {
  for (const line of lines) {
    const m = line.match(inlinePattern)
    if (m?.[1] && m[1].trim().length >= 20) {
      return clampNarrativeTextNullable(m[1].trim())
    }
  }
  return extractSection(lines, startPattern, stopPatterns)
}

function extractSection(
  lines: string[],
  startPattern: RegExp,
  stopPatterns: RegExp[],
): string | null {
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (startPattern.test(lines[i]!)) {
      start = i + 1
      break
    }
  }
  if (start < 0) {
    return extractSectionFromFullText(lines.join('\n'), startPattern, stopPatterns)
  }
  const parts: string[] = []
  for (let i = start; i < Math.min(lines.length, start + 30); i++) {
    const line = lines[i]!
    if (stopPatterns.some((p) => p.test(line))) break
    if (line.length >= 15 && !startPattern.test(line)) parts.push(line)
    if (parts.join(' ').length > 500) break
  }
  const joined = parts.join(' ').trim()
  return joined.length >= 20 ? clampNarrativeTextNullable(joined) : null
}

function extractSectionFromFullText(
  text: string,
  startPattern: RegExp,
  stopPatterns: RegExp[],
): string | null {
  const normalized = text.replace(/\r\n/g, '\n')
  const label = startPattern.source.replace(/^\^/, '').replace(/\\b/g, '')
  const stopLabel = stopPatterns
    .map((p) => p.source.replace(/^\^/, '').replace(/\\b/g, ''))
    .join('|')
  const startRe = new RegExp(
    `(?:${label})(?:\\s+des\\s+kunden)?\\s*[:–-]?\\s*\\n?([\\s\\S]{30,1400}?)(?=(?:\\n\\s*(?:${stopLabel}))|$)`,
    'i',
  )
  const match = normalized.match(startRe)
  const body = match?.[1]?.replace(/\s+/g, ' ').trim()
  return body && body.length >= 20 ? clampNarrativeTextNullable(body) : null
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
  if (
    /^(tuvsud|csp|bmw|controlware)/i.test(cleaned) &&
    cleaned.split(/\s+/).length <= 4
  ) {
    return null
  }
  return cleaned
}

/**
 * Kostenlose Extraktion aus Dokumenttext (ohne OpenAI) — für Bulk-Import & Fallback.
 */
export function parseReferenceHeuristicsFromText(
  documentText: string,
  options?: { fileName?: string; pdfTitle?: string | null },
): ExtractedReferenceData {
  const lines = normalizeLines(documentText)
  let company_name: string | null = null
  let title: string | null = null

  const pdfTitle = String(options?.pdfTitle ?? '').trim()
  if (
    pdfTitle.length >= 8 &&
    !/^untitled$/i.test(pdfTitle) &&
    !isBoilerplateCompanyDescription(pdfTitle, null)
  ) {
    const pdfScore = scoreProjectTitle(pdfTitle, null)
    if (pdfScore > 10) title = pdfTitle
  }

  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const line = lines[i]!
    if (/^referenz$/i.test(line)) {
      const next = lines[i + 1]
      if (next && looksLikeCompanyName(next)) {
        company_name = next.trim()
      }
      continue
    }
    const kundeMatch = line.match(
      /^(?:kunde|customer|auftraggeber|mandant)\s*[:–-]\s*(.+)$/i,
    )
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

  if (!company_name) {
    const fileCompany = extractCompanyNameFromFileName(options?.fileName)
    if (fileCompany) company_name = fileCompany
  }

  const labeledTitle = extractLabeledProjectTitle(lines, company_name)
  if (labeledTitle) {
    title = labeledTitle
  }

  if (!title) {
    const scoredTitle = pickBestProjectTitle(lines, company_name)
    if (scoredTitle) {
      title = scoredTitle
    }
  }

  if (!title) {
    const fileTitle = extractProjectTitleHintFromFileName(options?.fileName)
    if (fileTitle) title = fileTitle
  }

  if (!title) {
    title = titleFromFileName(options?.fileName) ?? null
  }

  const customer_challenge = extractSectionInline(
    lines,
    INLINE_CHALLENGE,
    SECTION_CHALLENGE,
    [SECTION_SOLUTION, /^ergebnis\b/i, /^nutzen\b/i, /^referenz\b/i, /^mehrwert\b/i],
  )
  const our_solution = extractSectionInline(lines, INLINE_SOLUTION, SECTION_SOLUTION, [
    SECTION_CHALLENGE,
    /^über\s+/i,
    /^kontakt\b/i,
    /^referenz\b/i,
    /^kunde\b/i,
  ])

  let summary: string | null = null
  if (customer_challenge) {
    summary = clampNarrativeTextNullable(customer_challenge)
  } else if (our_solution) {
    summary = clampNarrativeTextNullable(our_solution)
  } else if (title) {
    summary = clampNarrativeTextNullable(`Referenzprojekt: ${title}`)
  }

  const joined = lines.join('\n')

  let duration_months: number | null = null
  const durationMatch = joined.match(
    /\b(\d{1,3})\s*(?:monate|months|monat)\b|\b(?:laufzeit|duration)\s*[:–-]?\s*(\d{1,3})\b/i,
  )
  if (durationMatch) {
    const n = Number.parseInt(durationMatch[1] || durationMatch[2] || '', 10)
    if (Number.isFinite(n) && n > 0 && n <= 600) duration_months = n
  }

  let incumbent_provider: string | null = null
  const incumbentMatch = joined.match(
    /(?:bestandsdienstleister|bisheriger\s+anbieter|incumbent(?:\s+provider)?)\s*[:–-]\s*([^\n|;]{2,80})/i,
  )
  if (incumbentMatch?.[1]) {
    incumbent_provider = incumbentMatch[1].replace(/\s+/g, ' ').trim() || null
  }

  let competitors: string | null = null
  const competitorMatch = joined.match(
    /(?:wettbewerber|mitbewerber|competitors?)\s*[:–-]\s*([^\n]{2,160})/i,
  )
  if (competitorMatch?.[1]) {
    competitors = competitorMatch[1].replace(/\s+/g, ' ').trim() || null
  }

  let project_start: string | null = null
  let project_end: string | null = null
  const rangeMatch = joined.match(
    /\b(\d{1,2})[./](\d{1,2})[./](\d{2,4})\s*[–—-]\s*(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b/,
  )
  if (rangeMatch) {
    const toIso = (d: string, m: string, y: string) => {
      const year = y.length === 2 ? `20${y}` : y
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    project_start = toIso(rangeMatch[1]!, rangeMatch[2]!, rangeMatch[3]!)
    project_end = toIso(rangeMatch[4]!, rangeMatch[5]!, rangeMatch[6]!)
  } else if (duration_months) {
    const yearMatch = joined.match(/\b(20\d{2})\b/)
    if (yearMatch?.[1]) {
      const endYear = yearMatch[1]
      project_end = `${endYear}-12-31`
      const end = new Date(`${project_end}T12:00:00Z`)
      end.setUTCMonth(end.getUTCMonth() - duration_months)
      project_start = end.toISOString().slice(0, 10)
    }
  }

  return {
    title: sanitizeExtractedProjectTitle(title),
    summary,
    industry: null,
    volume_eur: null,
    employee_count: null,
    tags: [],
    company_name,
    customer_challenge,
    our_solution,
    duration_months,
    project_start,
    project_end,
    incumbent_provider,
    competitors,
    contract_type: null,
  }
}
