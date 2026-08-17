import { describe, expect, it } from 'vitest'

import {
  REFERENCE_INTERNAL_FRAME_HOSTS,
  REFERENCE_INTERNAL_FRAME_SLOT_IDS,
  isReferenceInternalFrameHost,
  referenceInternalFrameSlotFill,
  type ReferenceInternalFrameContentSource,
  type ReferenceInternalFrameHost,
} from './reference-internal-frame'

describe('reference internal frame (§10.4)', () => {
  it('lässt nur die Bibliothek-Pane als Host zu', () => {
    expect([...REFERENCE_INTERNAL_FRAME_HOSTS]).toEqual(['library-pane'])
    expect(isReferenceInternalFrameHost('library-pane')).toBe(true)
    expect(isReferenceInternalFrameHost('detail-page')).toBe(false)
    expect(isReferenceInternalFrameHost('sheet')).toBe(false)
  })

  it('weist andere Hosts auf Typebene ab', () => {
    const host: ReferenceInternalFrameHost = 'library-pane'
    expect(host).toBe('library-pane')
    // @ts-expect-error — Detailseite und Sheet sind keine internen Rahmen
    const _detail: ReferenceInternalFrameHost = 'detail-page'
    // @ts-expect-error — Detailseite und Sheet sind keine internen Rahmen
    const _sheet: ReferenceInternalFrameHost = 'sheet'
    void _detail
    void _sheet
  })

  it('mappt die vier Slots in fester Reihenfolge', () => {
    expect([...REFERENCE_INTERNAL_FRAME_SLOT_IDS]).toEqual([
      'identity',
      'headActions',
      'content',
      'approvalMeta',
    ])
  })

  it('speist den Kern aus der Listenzeile, nicht aus der Nachladung', () => {
    const source: ReferenceInternalFrameContentSource = 'list-row'
    expect(source).toBe('list-row')
    // @ts-expect-error — der Kern wartet nicht auf Share/Readiness/Approval-Meta
    const _fromSupplement: ReferenceInternalFrameContentSource = 'supplement'
    void _fromSupplement
  })

  it('füllt identity und content aus der Zeile ohne Nachladung', () => {
    expect(
      referenceInternalFrameSlotFill({
        hasRow: true,
        isSalesView: false,
        approvalMetaReady: false,
        hasApprovalMeta: false,
      }),
    ).toEqual({
      identity: 'filled',
      headActions: 'filled',
      content: 'filled',
      approvalMeta: 'empty',
    })
  })

  it('lässt approvalMeta in der Sales-Sicht leer — dieselbe Auslassung, kein zweites Layout', () => {
    expect(
      referenceInternalFrameSlotFill({
        hasRow: true,
        isSalesView: true,
        approvalMetaReady: true,
        hasApprovalMeta: true,
      }).approvalMeta,
    ).toBe('empty')
  })

  it('füllt approvalMeta erst wenn die Nachladung Inhalt hat', () => {
    expect(
      referenceInternalFrameSlotFill({
        hasRow: true,
        isSalesView: false,
        approvalMetaReady: true,
        hasApprovalMeta: true,
      }).approvalMeta,
    ).toBe('filled')
  })
})
