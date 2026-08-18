#!/usr/bin/env node
/**
 * T8 palette guard — counts raw Tailwind palette classes (`slate-50`, `red-600`, …)
 * and raw `white`/`black` utilities under app/, components/, lib/.
 *
 * Phase 1 (default): print the count and exit 0.
 * Phase 2: `node scripts/check-raw-palette-classes.mjs --fail` (or PALETTE_GUARD_FAIL=1).
 *
 * Excludes: components/ui, theme-shell CSS, *.test.ts / *.test.tsx.
 * White/black allowlist: brand panel, TOTP QR well, leftover text-white on raw palettes.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const PALETTE_FAMILIES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'

export const PALETTE_RE = new RegExp(`\\b(?:${PALETTE_FAMILIES})-[0-9]{2,3}\\b`, 'g')

/** `bg-white`, `text-black`, `bg-black/60`, `border-white/10` — not covered by PALETTE_RE. */
export const WHITE_BLACK_RE = /\b(?:bg|text|border|ring|fill|stroke)-(?:white|black)\b/g

/**
 * Documented exceptions for white/black only (family-NNN still counts).
 * Brand/QR stay on purpose; group-4 text-white sits on raw palettes (phase 1).
 */
export const WHITE_BLACK_ALLOWLIST = new Set([
  'components/auth-brand-panel.tsx',
  'components/dashboard/settings-totp-mfa-card.tsx',
  'app/onboarding/steps/workspace-step.tsx',
  'app/onboarding/steps/team-step.tsx',
  'lib/deal-desk/hero-key-takeaways.ts',
  'app/p/[slug]/showcase-action-buttons.tsx',
  'app/approval/[token]/approval-quick-choice.tsx',
])

const SCAN_ROOTS = ['app', 'components', 'lib']
const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css'])

export function isExcludedPath(relPosix) {
  if (relPosix === 'components/ui' || relPosix.startsWith('components/ui/')) return true
  if (/(?:^|\/)theme-shell(?:-content)?\.css$/.test(relPosix)) return true
  if (/\.(?:integration\.)?test\.[cm]?[jt]sx?$/.test(relPosix)) return true
  return false
}

export function isWhiteBlackAllowlisted(relPosix) {
  return WHITE_BLACK_ALLOWLIST.has(relPosix)
}

export function countPaletteHits(source) {
  const re = new RegExp(PALETTE_RE.source, 'g')
  return source.match(re)?.length ?? 0
}

export function countWhiteBlackHits(source) {
  const re = new RegExp(WHITE_BLACK_RE.source, 'g')
  return source.match(re)?.length ?? 0
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
  let whiteBlack = 0
  let whiteBlackAllowlisted = 0

  for (const full of files) {
    if (!SCAN_EXTS.has(path.extname(full))) continue
    const rel = path.relative(root, full).split(path.sep).join('/')
    if (isExcludedPath(rel)) continue
    const source = fs.readFileSync(full, 'utf8')
    const n = countPaletteHits(source)
    if (n > 0) {
      byFile.push({ rel, n })
      byZone[zoneFor(rel)] += n
    }
    const wb = countWhiteBlackHits(source)
    if (wb === 0) continue
    if (isWhiteBlackAllowlisted(rel)) whiteBlackAllowlisted += wb
    else whiteBlack += wb
  }

  byFile.sort((a, b) => b.n - a.n || a.rel.localeCompare(b.rel))
  const total = byFile.reduce((sum, row) => sum + row.n, 0)
  return { total, byZone, byFile, whiteBlack, whiteBlackAllowlisted }
}

function shouldFail(argv = process.argv.slice(2), env = process.env) {
  return argv.includes('--fail') || env.PALETTE_GUARD_FAIL === '1'
}

export function formatReport(
  { total, byZone, byFile, whiteBlack = 0, whiteBlackAllowlisted = 0 },
  { fail },
) {
  const top = byFile.slice(0, 10)
  const lines = [
    `T8 palette guard: ${total} raw Tailwind palette classes outside components/ui`,
    `  app ${byZone.app} · components ${byZone.components} · lib ${byZone.lib}`,
    `  white/black: ${whiteBlack} after allowlist (${whiteBlackAllowlisted} excepted)`,
    fail
      ? '  mode: fail (phase 2)'
      : '  mode: warning (phase 1 — pass `--fail` or PALETTE_GUARD_FAIL=1 to exit 1)',
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

  const blocking = result.total + result.whiteBlack
  if (process.env.GITHUB_ACTIONS === 'true') {
    const level = fail && blocking > 0 ? 'error' : 'warning'
    console.log(
      `::${level} title=T8 palette guard::${result.total} family classes, ${result.whiteBlack} white/black (app ${result.byZone.app}, components ${result.byZone.components}, lib ${result.byZone.lib}). Phase 1 warning only until T1–T3 land.`,
    )
  }

  if (fail && blocking > 0) {
    process.exitCode = 1
  }
}

if (isDirectRun()) {
  main()
}
