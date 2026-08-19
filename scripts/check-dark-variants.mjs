#!/usr/bin/env node
/**
 * Dark-variant guard — counts `dark:` Tailwind tokens under app/, components/, lib/.
 *
 * Phase 2 only: `node scripts/check-dark-variants.mjs --fail` (or DARK_GUARD_FAIL=1).
 * There is no migration backlog; CI runs with `--fail`.
 *
 * Includes components/ui. Excludes tests.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const DARK_RE = /\bdark:/g

const SCAN_ROOTS = ['app', 'components', 'lib']
const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css'])

export function isExcludedPath(relPosix) {
  if (/\.(?:integration\.)?test\.[cm]?[jt]sx?$/.test(relPosix)) return true
  return false
}

export function countDarkHits(source) {
  const re = new RegExp(DARK_RE.source, 'g')
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

  for (const full of files) {
    if (!SCAN_EXTS.has(path.extname(full))) continue
    const rel = path.relative(root, full).split(path.sep).join('/')
    if (isExcludedPath(rel)) continue
    const n = countDarkHits(fs.readFileSync(full, 'utf8'))
    if (n === 0) continue
    byFile.push({ rel, n })
    byZone[zoneFor(rel)] += n
  }

  byFile.sort((a, b) => b.n - a.n || a.rel.localeCompare(b.rel))
  const total = byFile.reduce((sum, row) => sum + row.n, 0)
  return { total, byZone, byFile }
}

function shouldFail(argv = process.argv.slice(2), env = process.env) {
  return argv.includes('--fail') || env.DARK_GUARD_FAIL === '1'
}

export function formatReport({ total, byZone, byFile }, { fail }) {
  const top = byFile.slice(0, 10)
  const lines = [
    `Dark variant guard: ${total} dark: tokens in app/components/lib`,
    `  app ${byZone.app} · components ${byZone.components} · lib ${byZone.lib}`,
    fail
      ? '  mode: fail (phase 2)'
      : '  mode: warning (pass `--fail` or DARK_GUARD_FAIL=1 to exit 1)',
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
      `::${level} title=Dark variant guard::${result.total} dark: tokens (app ${result.byZone.app}, components ${result.byZone.components}, lib ${result.byZone.lib}).`,
    )
  }

  if (fail && result.total > 0) {
    process.exitCode = 1
  }
}

if (isDirectRun()) {
  main()
}
