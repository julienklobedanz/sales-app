const GENERIC_PREFIXES = new Set([
  'referenz',
  'referenzprojekt',
  'projekt',
  'project',
  'case',
  'casestudy',
  'case-study',
  'case_study',
  'ref',
  'document',
  'dokument',
])

const COMPANY_SUFFIX_PATTERN =
  /^(ag|gmbh|se|kg|kgaa|inc|ltd|llc|corp|corporation|group|gruppe|holding|plc|co)$/i

const PROJECT_PART_HINTS =
  /^(teil|part|anlage|appendix|anhang|doc|dokument|v\d+|version|final|draft|signed|kopie|copy)$/i

export function splitFileStem(stem: string): string[] {
  return stem
    .split(/[_-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function extractCompanyParts(parts: string[]): {
  companyParts: string[]
  restIndex: number
} {
  const companyParts: string[] = []
  let i = 1

  while (i < parts.length && companyParts.length < 5) {
    const part = parts[i]!
    const partLower = part.toLowerCase()

    if (companyParts.length > 0 && PROJECT_PART_HINTS.test(partLower)) break

    companyParts.push(part)
    if (COMPANY_SUFFIX_PATTERN.test(part)) {
      i++
      break
    }

    i++
  }

  return { companyParts, restIndex: i }
}

/** Gruppierungsschlüssel — trennt z. B. Referenz_SAP_* von Referenz_BMW_*. */
export function groupingKeyFromFileName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, '').trim()
  if (!stem) return fileName.toLowerCase()

  const parts = splitFileStem(stem)
  if (parts.length <= 1) return stem.toLowerCase()

  const firstLower = parts[0]!.toLowerCase()
  if (!GENERIC_PREFIXES.has(firstLower)) {
    return parts[0]!.toLowerCase()
  }

  const { companyParts } = extractCompanyParts(parts)
  if (companyParts.length === 0) {
    return parts.slice(0, Math.min(3, parts.length)).join('_').toLowerCase()
  }

  return [parts[0], ...companyParts].join('_').toLowerCase()
}

function formatCompanyPart(part: string): string {
  if (COMPANY_SUFFIX_PATTERN.test(part)) {
    const lower = part.toLowerCase()
    if (lower === 'gmbh') return 'GmbH'
    if (lower === 'se') return 'SE'
    if (lower === 'ag') return 'AG'
    if (lower === 'kg') return 'KG'
    if (lower === 'kgaa') return 'KGaA'
    if (lower === 'gruppe' || lower === 'group') {
      return lower === 'gruppe' ? 'Gruppe' : 'Group'
    }
    return part.toUpperCase()
  }
  if (part === part.toUpperCase() && part.length <= 5) return part
  if (/^[A-ZÄÖÜ]{2,}$/.test(part)) return part
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
}

/** Kundenname aus Dateinamen wie Referenz_SAP_SE_…. */
export function extractCompanyNameFromFileName(
  fileName: string | undefined,
): string | null {
  if (!fileName?.trim()) return null

  const stem = fileName.replace(/\.[^.]+$/, '').trim()
  const parts = splitFileStem(stem)
  if (parts.length < 2) return null

  const firstLower = parts[0]!.toLowerCase()
  if (!GENERIC_PREFIXES.has(firstLower)) return null

  const { companyParts } = extractCompanyParts(parts)
  if (companyParts.length === 0) return null

  return companyParts.map(formatCompanyPart).join(' ')
}

/** Projekttitel-Hinweis aus dem Rest des Dateinamens nach dem Kundenteil. */
export function extractProjectTitleHintFromFileName(
  fileName: string | undefined,
): string | null {
  if (!fileName?.trim()) return null

  const stem = fileName.replace(/\.[^.]+$/, '').trim()
  const parts = splitFileStem(stem)
  if (parts.length < 3) return null

  const firstLower = parts[0]!.toLowerCase()
  if (!GENERIC_PREFIXES.has(firstLower)) return null

  const { restIndex } = extractCompanyParts(parts)
  const titleParts = parts.slice(restIndex)
  if (titleParts.length === 0) return null

  const title = titleParts.join(' ').replace(/\s+/g, ' ').trim()
  if (title.length < 5) return null
  return title
}

export type BulkImportGroupLike = {
  id: string
  projectName: string
  companyName?: string
  files: File[]
}

/** Gruppiert Dateien mit gleichem Kundenschlüssel (nicht nur „Referenz“). */
export function autoGroupBulkImportByFileName<T extends BulkImportGroupLike>(
  groups: T[],
): T[] {
  const metaByFile = new Map<File, { projectName: string; companyName?: string }>()
  for (const group of groups) {
    for (const file of group.files) {
      metaByFile.set(file, {
        projectName: group.projectName,
        companyName: group.companyName,
      })
    }
  }

  const byKey = new Map<string, File[]>()
  for (const group of groups) {
    for (const file of group.files) {
      const key = groupingKeyFromFileName(file.name)
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key)!.push(file)
    }
  }

  return Array.from(byKey.entries()).map(([key, files]) => {
    const first = files[0]
    const meta = first ? metaByFile.get(first) : undefined
    const fileNameCompany = first ? extractCompanyNameFromFileName(first.name) : null
    const fileNameTitle = first ? extractProjectTitleHintFromFileName(first.name) : null

    return {
      id: `g-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      projectName:
        meta?.projectName ??
        fileNameTitle ??
        first?.name.replace(/\.[^.]+$/, '').trim() ??
        key ??
        'Referenz',
      companyName: meta?.companyName ?? fileNameCompany ?? undefined,
      files,
    } as T
  })
}
