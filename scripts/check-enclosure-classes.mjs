#!/usr/bin/env node
/**
 * §11.1 enclosure guard — counts `rounded-*` + `border` class combinations
 * outside the enclosure primitives (Card, Group, Option, Hinweis).
 *
 * Phase 1 (default): print the count and exit 0.
 * Phase 2: `node scripts/check-enclosure-classes.mjs --fail` (or ENCLOSURE_GUARD_FAIL=1).
 * CI runs with `--fail` after §11.3.
 *
 * Excludes: components/ui, tests, documented allowlist, rounded-full,
 * border-input, border-transparent, border-0.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const ROUNDED_RE = /\brounded-(?:none|sm|md|lg|xl|2xl|3xl|full)\b|\brounded\b/
const BORDER_RE = /\bborder\b/

const CLASS_PATTERNS = [
  /(?:className|class)=\{?["'`]([^"'`]{0,1200})["'`]/g,
  /cn\(\s*['"]([^'"]{0,1200})['"]/g,
  /(?:^|\n)\s*(?:export )?(?:const|let) \w+\s*=\s*['"]([^'"]{0,1200})['"]/gm,
]

/**
 * Lasting exceptions — not the migration backlog.
 * Dropzones until a Dropzone primitive exists. Chrome, fields and logo tiles
 * after §11.3: not empty surfaces, not enclosure primitives.
 */
export const ENCLOSURE_ALLOWLIST = new Set([
  // chrome
  'components/dashboard/collection-read-layout.tsx',
  'components/dashboard/shell/app-sidebar.tsx',
  'components/dashboard/sidebar-notifications-button.tsx',
  'components/dashboard/command-center.tsx',
  'components/dashboard/dashboard-user-menu.tsx',
  'components/table/table-bulk-actions-bar.tsx',
  'app/dashboard/overview/references-data-table.tsx',
  'app/dashboard/overview/compliance-documents-table.tsx',
  'app/dashboard/overview/reference-library-toolbar.tsx',
  'app/dashboard/overview/bulk-import-groups-panel.tsx',
  'app/dashboard/overview/compliance-bulk-groups-panel.tsx',
  'app/dashboard/overview/trash-dialog.tsx',
  'app/dashboard/dashboard-overview.tsx',
  'app/dashboard/deals/deals-client.tsx',
  'app/dashboard/settings/sticky-save-bar.tsx',
  // dropzone until primitive
  'app/dashboard/deals/cockpit/deal-document-dropzone.tsx',
  'app/dashboard/accounts/components/nda-pdf-dropzone.tsx',
  'app/dashboard/accounts/components/accounts-import-dialog.tsx',
  'app/dashboard/overview/bulk-import-dropzone.tsx',
  'app/dashboard/overview/compliance-multi-pdf-dropzone.tsx',
  'app/dashboard/references/components/reference-onboarding-empty-state.tsx',
  'lib/references/reference-form/reference-form-files-section.tsx',
  'lib/references/reference-form/reference-form-fields.tsx',
  // field
  'app/dashboard/accounts/components/company-name-suggest-field.tsx',
  'app/dashboard/references/[id]/approval-contact-suggest-field.tsx',
  'app/dashboard/overview/compliance-document-type-combobox.tsx',
  'app/dashboard/overview/share-link-dialog.tsx',
  'app/dashboard/references/[id]/pdf-export-dialog.tsx',
  'app/dashboard/settings/market-signals/newsrooms-card.tsx',
  'app/dashboard/settings/settings-export-templates-card.tsx',
  'app/onboarding/steps/workspace-step.tsx',
  // logo
  'components/dashboard/settings-totp-mfa-card.tsx',
  'app/p/[slug]/showcase-multi-portfolio.tsx',
  'app/dashboard/deals/cockpit/deal-proof-section.tsx',
  'app/dashboard/overview/inbox-references/client.tsx',
  'app/dashboard/overview/compliance-document-type-icon.tsx',
])

const SCAN_ROOTS = ['app', 'components', 'lib']
const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx'])

export function isExcludedPath(relPosix) {
  if (relPosix === 'components/ui' || relPosix.startsWith('components/ui/')) return true
  if (/\.(?:integration\.)?test\.[cm]?[jt]sx?$/.test(relPosix)) return true
  return false
}

export function isAllowlisted(relPosix) {
  if (ENCLOSURE_ALLOWLIST.has(relPosix)) return true
  if (/skeleton/i.test(relPosix)) return true
  if (
    /(?:^|\/)loading\.tsx$/.test(relPosix) &&
    (relPosix.startsWith('app/') || relPosix.startsWith('components/dashboard/'))
  ) {
    return true
  }
  return false
}

export function isFilteredClassString(s) {
  if (/\brounded-full\b/.test(s)) return true
  if (/\bborder-input\b/.test(s)) return true
  if (/\bborder-transparent\b/.test(s)) return true
  if (/\bborder-0\b/.test(s) && !/\bborder-(?!0\b)\S+/.test(s) && !/(?:^|\s)border(?:\s|$)/.test(s)) {
    return true
  }
  return false
}

export function extractClassStrings(source) {
  const out = []
  for (const pat of CLASS_PATTERNS) {
    pat.lastIndex = 0
    let m
    while ((m = pat.exec(source)) !== null) {
      out.push(m[1].replace(/\s+/g, ' '))
    }
  }
  return out
}

export function countEnclosureHits(source) {
  let n = 0
  for (const s of extractClassStrings(source)) {
    if (!ROUNDED_RE.test(s) || !BORDER_RE.test(s)) continue
    if (isFilteredClassString(s)) continue
    n += 1
  }
  return n
}

export function zoneFor(relPosix) {
  if (relPosix.startsWith('app/')) return 'app'
  if (relPosix.startsWith('components/')) return 'components'
  if (relPosix.startsWith('lib/')) return 'lib'
  return 'other'
}

function walkFiles(dir, acc) {
  if (!fs.existsSync(dir)) return
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === 'dist') {
      continue
    }
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walkFiles(full, acc)
    else acc.push(full)
  }
}

export function scanRepo(root = ROOT) {
  const files = []
  for (const name of SCAN_ROOTS) {
    walkFiles(path.join(root, name), files)
  }

  const byZone = { app: 0, components: 0, lib: 0, other: 0 }
  const byFile = []
  let allowlisted = 0

  for (const full of files) {
    if (!SCAN_EXTS.has(path.extname(full))) continue
    const rel = path.relative(root, full).split(path.sep).join('/')
    if (isExcludedPath(rel)) continue
    const source = fs.readFileSync(full, 'utf8')
    const n = countEnclosureHits(source)
    if (n === 0) continue
    if (isAllowlisted(rel)) {
      allowlisted += n
      continue
    }
    byFile.push({ rel, n })
    byZone[zoneFor(rel)] += n
  }

  byFile.sort((a, b) => b.n - a.n || a.rel.localeCompare(b.rel))
  const total = byFile.reduce((sum, row) => sum + row.n, 0)
  return { total, byZone, byFile, allowlisted }
}

function shouldFail(argv = process.argv.slice(2), env = process.env) {
  return argv.includes('--fail') || env.ENCLOSURE_GUARD_FAIL === '1'
}

export function formatReport({ total, byZone, byFile, allowlisted = 0 }, { fail }) {
  const top = byFile.slice(0, 10)
  const lines = [
    `§11.1 enclosure guard: ${total} rounded+border classes outside primitives`,
    `  app ${byZone.app} · components ${byZone.components} · lib ${byZone.lib}`,
    `  allowlisted: ${allowlisted}`,
    fail
      ? '  mode: fail (phase 2)'
      : '  mode: warning (phase 1 — pass `--fail` or ENCLOSURE_GUARD_FAIL=1 to exit 1)',
  ]
  if (top.length > 0) {
    lines.push('  top files:')
    for (const row of top) {
      lines.push(`    ${row.n}\t${row.rel}`)
    }
  }
  return lines.join('\n')
}

function isDirectRun() {
  const entry = process.argv[1]
  if (!entry) return false
  return path.resolve(entry) === fileURLToPath(import.meta.url)
}

function main() {
  const fail = shouldFail()
  const result = scanRepo()
  const report = formatReport(result, { fail })
  console.log(report)

  if (process.env.GITHUB_ACTIONS === 'true') {
    const level = fail && result.total > 0 ? 'error' : 'warning'
    console.log(
      `::${level} title=§11.1 enclosure guard::${result.total} after allowlist (app ${result.byZone.app}, components ${result.byZone.components}, lib ${result.byZone.lib}). Phase 2 fail after §11.3.`,
    )
  }

  if (fail && result.total > 0) {
    process.exitCode = 1
  }
}

if (isDirectRun()) {
  main()
}
