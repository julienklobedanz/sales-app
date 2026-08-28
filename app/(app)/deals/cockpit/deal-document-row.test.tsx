import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { DealDocumentRow } from '@/app/(app)/deals/cockpit/deal-document-row'
import type { DealDocumentRow as DealDocumentRowType } from '@/app/(app)/deals/document-actions'
import { COPY } from '@/lib/copy'
import type { DocumentCardOwner } from '@/lib/deals/document-display'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = () => false
  HTMLElement.prototype.setPointerCapture = () => undefined
  HTMLElement.prototype.releasePointerCapture = () => undefined
  HTMLElement.prototype.scrollIntoView = () => undefined
})

function doc(overrides: Partial<DealDocumentRowType> = {}): DealDocumentRowType {
  return {
    id: 'doc-1',
    deal_id: 'deal-1',
    tender_id: null,
    organization_id: 'org-1',
    file_name: 'RFP.pdf',
    kind: 'ausschreibung',
    storage_path: 'org/deals/deal-1/doc-1/RFP.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1024,
    uploaded_by: null,
    uploaded_by_name: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const dealOwner: DocumentCardOwner = {
  kind: 'deal',
  id: 'deal-1',
  title: 'Los 1',
  tenderId: 'tender-1',
}

const noop = () => undefined

function renderRow(args: {
  row: DealDocumentRowType
  owner?: DocumentCardOwner
}) {
  render(
    <ul>
      <DealDocumentRow
        doc={args.row}
        owner={args.owner ?? dealOwner}
        canManage
        isRfpMode={false}
        analyzingId={null}
        downloadPendingId={null}
        onAnalyze={noop}
        onDownload={noop}
        onRenameRequest={noop}
        onKindChange={noop}
        onDeleteRequest={noop}
        onAssignToTender={noop}
        onAssignToDeal={noop}
      />
    </ul>,
  )
}

describe('DealDocumentRow inheritance', () => {
  it('shows the Ausschreibung badge and hides delete for inherited documents', () => {
    renderRow({
      row: doc({ deal_id: null, tender_id: 'tender-1' }),
    })

    expect(screen.getByText(COPY.tenders.ownedByTender)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: COPY.deals.cockpit.editInheritedDocument }),
    ).toBeTruthy()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Aktionen' }))
    expect(
      screen.queryByRole('menuitem', { name: COPY.deals.cockpit.documentsDelete }),
    ).toBeNull()
    expect(
      screen.getByRole('menuitem', { name: COPY.deals.cockpit.assignDocumentToDeal }),
    ).toBeTruthy()
  })

  it('keeps delete for lot-owned documents', () => {
    renderRow({ row: doc() })

    expect(screen.queryByText(COPY.tenders.ownedByTender)).toBeNull()
    expect(
      screen.queryByRole('link', { name: COPY.deals.cockpit.editInheritedDocument }),
    ).toBeNull()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Aktionen' }))
    expect(
      screen.getByRole('menuitem', { name: COPY.deals.cockpit.documentsDelete }),
    ).toBeTruthy()
    expect(
      screen.getByRole('menuitem', { name: COPY.deals.cockpit.assignDocumentToTender }),
    ).toBeTruthy()
  })
})
