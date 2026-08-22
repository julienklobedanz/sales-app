#!/usr/bin/env node
/**
 * Copy-key guard — reports unused leaf paths in lib/copy.ts.
 *
 * Checks the full path (`nav.title`), not the last identifier (`title`).
 * A name-only check masks collisions across groups (75 vs 141 in the 2026 audit).
 *
 * Resolution:
 *   COPY.a.b.c              → leaf a.b.c
 *   COPY.a.b[expr]          → every leaf under a.b
 *   const c = COPY.a.b; c.k → a.b.k
 *   export const X = COPY.a → every leaf under a (alias leaves the file)
 *
 * Unresolvable accesses are listed but do not fail.
 * `--fail` (or COPY_GUARD_FAIL=1) fails only when unused leaves remain.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const COPY_FILE = 'lib/copy.ts'
const SCAN_ROOTS = ['app', 'components', 'lib', 'hooks']
const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])

const IDENT_RE = /^[A-Za-z_$][\w$]*/

export function isExcludedPath(relPosix) {
  if (relPosix === COPY_FILE) return true
  if (relPosix === 'scripts/check-copy-keys.mjs') return true
  if (relPosix === 'scripts/check-copy-keys.test.ts') return true
  return false
}

export function skipTrivia(source, i) {
  const n = source.length
  while (i < n) {
    const c = source[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i += 1
      continue
    }
    if (c === '/' && source[i + 1] === '/') {
      i += 2
      while (i < n && source[i] !== '\n') i += 1
      continue
    }
    if (c === '/' && source[i + 1] === '*') {
      i += 2
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i += 1
      i = Math.min(n, i + 2)
      continue
    }
    break
  }
  return i
}

function skipString(source, i) {
  const quote = source[i]
  i += 1
  while (i < source.length) {
    if (source[i] === '\\') {
      i += 2
      continue
    }
    if (quote === '`' && source[i] === '$' && source[i + 1] === '{') {
      i += 2
      i = skipBalanced(source, i - 1, '{', '}')
      continue
    }
    if (source[i] === quote) return i + 1
    i += 1
  }
  return source.length
}

function skipBalanced(source, i, open, close) {
  let depth = 0
  const n = source.length
  while (i < n) {
    const c = source[i]
    if (c === '/' && source[i + 1] === '/') {
      i = skipTrivia(source, i)
      continue
    }
    if (c === '/' && source[i + 1] === '*') {
      i = skipTrivia(source, i)
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      i = skipString(source, i)
      continue
    }
    if (c === open) {
      depth += 1
      i += 1
      continue
    }
    if (c === close) {
      depth -= 1
      i += 1
      if (depth === 0) return i
      continue
    }
    i += 1
  }
  return n
}

function readIdent(source, i) {
  const slice = source.slice(i)
  const m = IDENT_RE.exec(slice)
  if (!m) return null
  return { name: m[0], end: i + m[0].length }
}

function forEachIdent(source, cb) {
  const re = /[A-Za-z_$][\w$]*/g
  let m
  while ((m = re.exec(source))) {
    cb(m[0], m.index + m[0].length, m.index)
  }
}

/** Parse `export const COPY = { ... } as const` into a tree of objects and leaves. */
export function parseCopyTree(source) {
  const marker = 'export const COPY ='
  const start = source.indexOf(marker)
  if (start < 0) throw new Error('COPY export not found')
  let i = skipTrivia(source, start + marker.length)
  if (source[i] !== '{') throw new Error('COPY object literal not found')

  function parseString(idx) {
    const quote = source[idx]
    if (quote !== "'" && quote !== '"' && quote !== '`') {
      throw new Error(`expected string at ${idx}`)
    }
    return skipString(source, idx)
  }

  function parseObject(idx, prefix) {
    const children = Object.create(null)
    i = idx + 1
    while (true) {
      i = skipTrivia(source, i)
      if (source[i] === '}') {
        i += 1
        return { type: 'object', children }
      }
      if (source[i] === ',') {
        i += 1
        continue
      }
      let key
      if (source[i] === "'" || source[i] === '"') {
        const end = skipString(source, i)
        key = source.slice(i + 1, end - 1)
        i = end
      } else {
        const ident = readIdent(source, i)
        if (!ident) throw new Error(`expected key at ${i}: ${source.slice(i, i + 40)}`)
        key = ident.name
        i = ident.end
      }
      i = skipTrivia(source, i)
      if (source[i] !== ':') throw new Error(`expected ':' after ${key}`)
      i = skipTrivia(source, i + 1)
      const pathKey = prefix ? `${prefix}.${key}` : key
      if (source[i] === '{') {
        children[key] = parseObject(i, pathKey)
      } else {
        i = parseString(i)
        children[key] = { type: 'leaf', path: pathKey }
      }
    }
  }

  const tree = parseObject(i, '')
  return tree
}

export function collectLeaves(node, acc = []) {
  if (node.type === 'leaf') {
    acc.push(node.path)
    return acc
  }
  for (const child of Object.values(node.children)) collectLeaves(child, acc)
  return acc
}

function nodeAt(tree, segs) {
  let node = tree
  for (const seg of segs) {
    if (!node || node.type !== 'object') return null
    node = node.children[seg]
  }
  return node ?? null
}

function leavesUnder(node) {
  if (!node) return []
  if (node.type === 'leaf') return [node.path]
  return collectLeaves(node)
}

/**
 * Walk COPY.a.b.c / COPY.a[expr] starting after the identifier at `end`.
 * Stops before JS methods (`.replace`) that are not COPY keys.
 */
export function parseMemberChain(source, end, tree, startSegs = []) {
  let i = end
  let node = nodeAt(tree, startSegs)
  const segs = startSegs.slice()
  let dynamic = false

  while (true) {
    i = skipTrivia(source, i)
    if (source[i] === '.') {
      const afterDot = skipTrivia(source, i + 1)
      const ident = readIdent(source, afterDot)
      if (!ident) break
      if (node && node.type === 'object' && ident.name in node.children) {
        segs.push(ident.name)
        node = node.children[ident.name]
        i = ident.end
        continue
      }
      break
    }
    if (source[i] === '[') {
      dynamic = true
      i = skipBalanced(source, i, '[', ']')
      break
    }
    break
  }

  return { segs, dynamic, end: i, node }
}

function inComment(source, index) {
  const lastBlockOpen = source.lastIndexOf('/*', index)
  if (lastBlockOpen >= 0) {
    const lastBlockClose = source.lastIndexOf('*/', index)
    if (lastBlockClose < lastBlockOpen) return true
  }
  const lineStart = source.lastIndexOf('\n', index - 1) + 1
  const prefix = source.slice(lineStart, index)
  const comment = prefix.lastIndexOf('//')
  if (comment < 0) return false
  return !prefix.slice(0, comment).includes("'") && !prefix.slice(0, comment).includes('"')
}

function looksLikeImportLine(source, identStart) {
  const lineStart = source.lastIndexOf('\n', identStart - 1) + 1
  const prefix = source.slice(lineStart, identStart)
  return /^\s*import\b/.test(prefix) || /^\s*export\s+\{/.test(prefix)
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length
}

function markNode(read, node) {
  for (const leaf of leavesUnder(node)) read.add(leaf)
}

function markPath(read, tree, segs, dynamic) {
  const node = nodeAt(tree, segs)
  if (dynamic) {
    markNode(read, node)
    return
  }
  if (!node) return
  if (node.type === 'leaf') read.add(node.path)
}

function isKeyword(name) {
  return (
    name === 'const' ||
    name === 'let' ||
    name === 'var' ||
    name === 'export' ||
    name === 'import' ||
    name === 'return' ||
    name === 'function' ||
    name === 'if' ||
    name === 'else' ||
    name === 'typeof'
  )
}

function findAliasBindings(source, tree) {
  /** @type {Map<string, { paths: string[][], exported: boolean, declIndex: number }>} */
  const bindings = new Map()

  forEachIdent(source, (name, end, start) => {
    if (name !== 'const' && name !== 'let') return
    let i = skipTrivia(source, end)
    const ident = readIdent(source, i)
    if (!ident) return
    i = skipTrivia(source, ident.end)
    if (source[i] !== '=') return

    const rhsStart = skipTrivia(source, i + 1)
    let rhsEnd = rhsStart
    let depth = 0
    while (rhsEnd < source.length) {
      const c = source[rhsEnd]
      if (c === '/' && (source[rhsEnd + 1] === '/' || source[rhsEnd + 1] === '*')) {
        rhsEnd = skipTrivia(source, rhsEnd)
        continue
      }
      if (c === "'" || c === '"' || c === '`') {
        rhsEnd = skipString(source, rhsEnd)
        continue
      }
      if (c === '(' || c === '{' || c === '[') {
        depth += 1
        rhsEnd += 1
        continue
      }
      if (c === ')' || c === '}' || c === ']') {
        if (depth === 0) break
        depth -= 1
        rhsEnd += 1
        continue
      }
      if (depth === 0 && (c === ';' || c === ',' || c === '\n')) break
      rhsEnd += 1
    }

    const rhs = source.slice(rhsStart, rhsEnd)
    const objectPaths = []
    forEachIdent(rhs, (id, idEnd) => {
      if (id !== 'COPY') return
      const chain = parseMemberChain(rhs, idEnd, tree, [])
      if (chain.dynamic) return
      const node = nodeAt(tree, chain.segs)
      if (node && node.type === 'object') objectPaths.push(chain.segs)
    })
    if (objectPaths.length === 0) return

    const before = source.slice(Math.max(0, start - 12), start)
    const exported = /\bexport\s+$/.test(before)
    const existing = bindings.get(ident.name)
    if (existing) {
      existing.paths.push(...objectPaths)
      existing.exported = existing.exported || exported
    } else {
      bindings.set(ident.name, {
        paths: objectPaths,
        exported,
        declIndex: ident.end - ident.name.length,
      })
    }
  })

  return bindings
}

/**
 * Collect read leaf paths and unresolvable COPY accesses from one source file.
 */
export function collectReads(source, tree, fileLabel = 'fixture') {
  const read = new Set()
  const unresolvable = []
  const bindings = findAliasBindings(source, tree)

  for (const binding of bindings.values()) {
    if (binding.exported) {
      for (const segs of binding.paths) markNode(read, nodeAt(tree, segs))
    }
  }

  const copyUseSites = []
  forEachIdent(source, (name, end, start) => {
    if (name !== 'COPY') return
    if (inComment(source, start)) return
    if (looksLikeImportLine(source, start)) return
    copyUseSites.push({ start, end })
  })

  for (const site of copyUseSites) {
    const after = skipTrivia(source, site.end)
    if (source[after] === '[') {
      unresolvable.push({
        file: fileLabel,
        line: lineOf(source, site.start),
        kind: 'computed-root',
        snippet: source.slice(site.start, Math.min(source.length, site.start + 40)),
      })
      continue
    }
    if (source[after] !== '.') {
      unresolvable.push({
        file: fileLabel,
        line: lineOf(source, site.start),
        kind: 'bare-copy',
        snippet: source.slice(site.start, Math.min(source.length, after + 20)),
      })
      continue
    }
    const chain = parseMemberChain(source, site.end, tree, [])
    if (chain.dynamic) {
      markPath(read, tree, chain.segs, true)
      continue
    }
    if (chain.segs.length === 0) {
      unresolvable.push({
        file: fileLabel,
        line: lineOf(source, site.start),
        kind: 'empty-chain',
        snippet: source.slice(site.start, Math.min(source.length, site.end + 20)),
      })
      continue
    }
    markPath(read, tree, chain.segs, false)
  }

  const destructure = /\{\s*[\w,\s]+\}\s*=\s*COPY\b/.exec(source)
  if (destructure) {
    unresolvable.push({
      file: fileLabel,
      line: lineOf(source, destructure.index),
      kind: 'destructure',
      snippet: destructure[0].slice(0, 60),
    })
  }

  forEachIdent(source, (name, end, start) => {
    const binding = bindings.get(name)
    if (!binding) return
    if (isKeyword(name)) return
    if (start === binding.declIndex) return
    if (looksLikeImportLine(source, start)) return

    const before = skipTriviaBack(source, start)
    if (before.spread) {
      for (const segs of binding.paths) markNode(read, nodeAt(tree, segs))
      return
    }

    const chain = parseMemberChain(source, end, tree, binding.paths[0] ?? [])
    const after = skipTrivia(source, end)
    const memberAccess = source[after] === '.' || source[after] === '['

    if (!memberAccess) {
      for (const segs of binding.paths) markNode(read, nodeAt(tree, segs))
      return
    }

    if (chain.dynamic) {
      for (const segs of binding.paths) markNode(read, nodeAt(tree, segs))
      return
    }

    const extra = chain.segs.slice((binding.paths[0] ?? []).length)
    for (const base of binding.paths) {
      markPath(read, tree, [...base, ...extra], false)
    }
  })

  return { read, unresolvable }
}

function skipTriviaBack(source, start) {
  let i = start - 1
  while (i >= 0 && /\s/.test(source[i])) i -= 1
  if (i >= 2 && source[i] === '.' && source[i - 1] === '.' && source[i - 2] === '.') {
    return { spread: true }
  }
  return { spread: false }
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

export function loadCopyTree(root = ROOT) {
  const source = fs.readFileSync(path.join(root, COPY_FILE), 'utf8')
  return parseCopyTree(source)
}

export function scanRepo(root = ROOT) {
  const tree = loadCopyTree(root)
  const leaves = collectLeaves(tree)
  const read = new Set()
  const unresolvable = []

  const files = []
  for (const name of SCAN_ROOTS) walkFiles(path.join(root, name), files)

  for (const full of files) {
    if (!SCAN_EXTS.has(path.extname(full))) continue
    const rel = path.relative(root, full).split(path.sep).join('/')
    if (isExcludedPath(rel)) continue
    const source = fs.readFileSync(full, 'utf8')
    const result = collectReads(source, tree, rel)
    for (const leaf of result.read) read.add(leaf)
    unresolvable.push(...result.unresolvable)
  }

  const dead = leaves.filter((leaf) => !read.has(leaf)).sort()
  const readCount = leaves.length - dead.length
  return {
    leaves,
    read,
    dead,
    unresolvable,
    readCount,
    deadCount: dead.length,
    unresolvableCount: unresolvable.length,
  }
}

function shouldFail(argv = process.argv.slice(2), env = process.env) {
  return argv.includes('--fail') || env.COPY_GUARD_FAIL === '1'
}

export function formatReport(result, { fail }) {
  const lines = [
    `Copy key guard: ${result.readCount} gelesen, ${result.deadCount} tot, ${result.unresolvableCount} nicht auflösbar (${result.leaves.length} Blätter)`,
    fail
      ? '  mode: fail (unused leaves only)'
      : '  mode: warning (pass `--fail` or COPY_GUARD_FAIL=1 to exit 1 on unused leaves)',
  ]
  if (result.dead.length > 0) {
    lines.push('  tot:')
    for (const leaf of result.dead) lines.push(`    ${leaf}`)
  }
  if (result.unresolvable.length > 0) {
    lines.push('  nicht auflösbar:')
    for (const row of result.unresolvable) {
      lines.push(`    ${row.file}:${row.line} ${row.kind}`)
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
    const level = fail && result.deadCount > 0 ? 'error' : 'warning'
    console.log(
      `::${level} title=Copy key guard::${result.readCount} gelesen, ${result.deadCount} tot, ${result.unresolvableCount} nicht auflösbar.`,
    )
  }

  if (fail && result.deadCount > 0) {
    process.exitCode = 1
  }
}

if (isDirectRun()) {
  main()
}
