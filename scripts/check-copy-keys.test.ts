import { describe, expect, it } from 'vitest'

import {
  collectLeaves,
  collectReads,
  formatReport,
  isExcludedPath,
  parseCopyTree,
  scanRepo,
} from './check-copy-keys.mjs'

const FIXTURE_COPY = `
export const COPY = {
  accounts: {
    title: 'Accounts',
    editButton: 'Bearbeiten',
    nested: {
      hint: 'Hinweis',
    },
  },
  roles: {
    owner: 'Inhaber',
    admin: 'Administrator',
  },
} as const
`

function tree() {
  return parseCopyTree(FIXTURE_COPY)
}

describe('isExcludedPath', () => {
  it('skips the COPY source and the guard itself', () => {
    expect(isExcludedPath('lib/copy.ts')).toBe(true)
    expect(isExcludedPath('scripts/check-copy-keys.mjs')).toBe(true)
    expect(isExcludedPath('scripts/check-copy-keys.test.ts')).toBe(true)
    expect(isExcludedPath('app/dashboard/accounts/page.tsx')).toBe(false)
  })
})

describe('parseCopyTree', () => {
  it('collects leaf paths, not just last identifiers', () => {
    const leaves = collectLeaves(tree())
    expect(leaves.sort()).toEqual([
      'accounts.editButton',
      'accounts.nested.hint',
      'accounts.title',
      'roles.admin',
      'roles.owner',
    ])
  })
})

describe('collectReads', () => {
  const t = tree()

  it('marks a direct COPY.a.b.c chain as that leaf', () => {
    const { read } = collectReads(`const x = COPY.accounts.title`, t)
    expect([...read]).toEqual(['accounts.title'])
  })

  it('marks a template interpolation', () => {
    const { read } = collectReads('const html = `<h2>${COPY.accounts.title}</h2>`', t)
    expect([...read]).toEqual(['accounts.title'])
  })

  it('treats COPY.a.b[expr] as the whole subtree', () => {
    const { read } = collectReads('const x = COPY.roles[role]', t)
    expect([...read].sort()).toEqual(['roles.admin', 'roles.owner'])
  })

  it('resolves a local alias const c = COPY.a, then c.key', () => {
    const { read } = collectReads(
      `const c = COPY.accounts
       const label = c.editButton`,
      t,
    )
    expect(read.has('accounts.editButton')).toBe(true)
    expect(read.has('accounts.title')).toBe(false)
  })

  it('resolves a ternary alias to both object paths', () => {
    const { read } = collectReads(
      `const copy = flag ? COPY.accounts : COPY.roles
       return copy.title`,
      t,
    )
    expect(read.has('accounts.title')).toBe(true)
    expect(read.has('roles.owner')).toBe(false)
  })

  it('marks an exported alias subtree as fully read', () => {
    const { read } = collectReads('export const LABELS = COPY.roles', t)
    expect([...read].sort()).toEqual(['roles.admin', 'roles.owner'])
  })

  it('does not treat COPY inside a comment as a reader or as unresolvable', () => {
    const { read, unresolvable } = collectReads(
      '/** COPY-Strings. */\nconst x = COPY.accounts.title',
      t,
    )
    expect([...read]).toEqual(['accounts.title'])
    expect(unresolvable).toEqual([])
  })

  it('does not fail on unresolvable COPY[expr]; it lists them', () => {
    const { read, unresolvable } = collectReads('const x = COPY[key]', t)
    expect(read.size).toBe(0)
    expect(unresolvable).toHaveLength(1)
    expect(unresolvable[0].kind).toBe('computed-root')
  })

  it('does not treat String.replace on a leaf as a copy key', () => {
    const { read } = collectReads(
      `const unread = COPY.accounts.title.replace('{count}', n)`,
      t,
    )
    expect([...read]).toEqual(['accounts.title'])
  })
})

describe('formatReport', () => {
  it('prints gelesen / tot / nicht auflösbar', () => {
    const text = formatReport(
      {
        leaves: ['a', 'b'],
        read: new Set(['a']),
        dead: ['b'],
        unresolvable: [{ file: 'x.ts', line: 1, kind: 'bare-copy' }],
        readCount: 1,
        deadCount: 1,
        unresolvableCount: 1,
      },
      { fail: true },
    )
    expect(text).toContain('1 gelesen, 1 tot, 1 nicht auflösbar')
    expect(text).toContain('tot:')
    expect(text).toContain('nicht auflösbar:')
  })
})

describe('scanRepo', () => {
  it('has no unused copy leaves after the ratchet', () => {
    const result = scanRepo()
    expect(result.dead, result.dead.join('\n')).toEqual([])
  })
})
