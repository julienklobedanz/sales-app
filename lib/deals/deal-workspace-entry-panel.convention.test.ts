import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildCollectionObjectUrl } from '@/lib/dashboard/use-collection-object-selection'
import { DEAL_WORKSPACE_ENTRY_PARAM } from '@/lib/deals/deal-workspace-areas'

function readCockpit(name: string): string {
  return readFileSync(
    path.join(process.cwd(), 'app/(app)/deals/cockpit', name),
    'utf8',
  )
}

function readDealsComponent(name: string): string {
  return readFileSync(
    path.join(process.cwd(), 'app/(app)/deals/components', name),
    'utf8',
  )
}

describe('deal workspace entry panel conventions (§10.6)', () => {
  it('importiert AiDraftSheet nicht mehr in der Entwurfs-Liste', () => {
    const src = readCockpit('deal-rfp-drafts-section.tsx')
    expect(src).not.toMatch(/AiDraftSheet/)
    expect(src).not.toMatch(/ai-draft-sheet/)
  })

  it('hält das Sheet beim Smart-Match-Aufrufer', () => {
    const src = readFileSync(
      path.join(process.cwd(), 'app/(app)/deals/components/match-result-card.tsx'),
      'utf8',
    )
    expect(src).toMatch(/AiDraftSheet/)
  })

  it('hält den Composer ohne Sheet', () => {
    const src = readDealsComponent('ai-draft-composer.tsx')
    expect(src).not.toMatch(/from ['"]@\/components\/ui\/sheet['"]/)
    expect(src).not.toMatch(/<Sheet/)
  })

  it('öffnet das Workspace-Panel ohne Sheet über dem Panel', () => {
    const src = readCockpit('deal-drafts-entry-panel.tsx')
    expect(src).toMatch(/AiDraftComposer/)
    expect(src).not.toMatch(/AiDraftSheet/)
    expect(src).not.toMatch(/<Sheet/)
  })

  it('führt keine Risiko-Mutation ein', () => {
    for (const name of [
      'deal-rfp-risks-section.tsx',
      'deal-risks-entry-panel.tsx',
    ]) {
      const src = readCockpit(name)
      expect(src).not.toMatch(/['"]use server['"]/)
      expect(src).not.toMatch(/updateDeal/)
    }
  })

  it('forkt das Sammlungs-Layout nicht', () => {
    const src = readCockpit('deal-workspace-layout.tsx')
    expect(src).not.toMatch(/CollectionReadLayout/)
    expect(src).not.toMatch(/ResizablePanelGroup/)
    expect(src).toMatch(/autoSelect:\s*false/)
    expect(src).toMatch(/paramKey:\s*DEAL_WORKSPACE_ENTRY_PARAM/)
  })

  it('encodiert eintrag in der URL, ohne # als Fragment', () => {
    const href = buildCollectionObjectUrl(
      '/deals/d1/arbeitsbereich/risiken',
      new URLSearchParams(),
      { [DEAL_WORKSPACE_ENTRY_PARAM]: 'ev:ISO 27001 Nachweise~2' },
    )
    expect(href).toContain(`${DEAL_WORKSPACE_ENTRY_PARAM}=`)
    expect(href).not.toContain('#')
    expect(href).toMatch(/ISO/)
    expect(decodeURIComponent(href)).toContain('~2')
  })
})
