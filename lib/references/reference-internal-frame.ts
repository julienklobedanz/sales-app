/** §10.4: eine interne Einfassung. Der Host ist Pflicht-Prop der Komponente. */

export const REFERENCE_INTERNAL_FRAME_HOSTS = ['library-pane'] as const
export type ReferenceInternalFrameHost = (typeof REFERENCE_INTERNAL_FRAME_HOSTS)[number]

export const REFERENCE_INTERNAL_FRAME_SLOT_IDS = [
  'identity',
  'headActions',
  'content',
  'approvalMeta',
] as const

export type ReferenceInternalFrameSlotId =
  (typeof REFERENCE_INTERNAL_FRAME_SLOT_IDS)[number]

export type ReferenceInternalFrameSlotFill = 'filled' | 'empty'

/** Der Kern liest die Listenzeile, nicht das Nachlade-Payload. */
export const REFERENCE_INTERNAL_FRAME_CONTENT_SOURCES = ['list-row'] as const
export type ReferenceInternalFrameContentSource =
  (typeof REFERENCE_INTERNAL_FRAME_CONTENT_SOURCES)[number]

export function isReferenceInternalFrameHost(
  host: string,
): host is ReferenceInternalFrameHost {
  return (REFERENCE_INTERNAL_FRAME_HOSTS as readonly string[]).includes(host)
}

/**
 * Fill der einen Einfassung. identity + content kommen aus der Listenzeile
 * und warten nicht auf die Nachladung (Share / Readiness / Approval-Meta).
 */
export function referenceInternalFrameSlotFill(args: {
  hasRow: boolean
  isSalesView: boolean
  approvalMetaReady: boolean
  hasApprovalMeta: boolean
}): Record<ReferenceInternalFrameSlotId, ReferenceInternalFrameSlotFill> {
  if (!args.hasRow) {
    return {
      identity: 'empty',
      headActions: 'empty',
      content: 'empty',
      approvalMeta: 'empty',
    }
  }
  return {
    identity: 'filled',
    headActions: 'filled',
    content: 'filled',
    approvalMeta:
      args.isSalesView || !args.approvalMetaReady || !args.hasApprovalMeta
        ? 'empty'
        : 'filled',
  }
}
