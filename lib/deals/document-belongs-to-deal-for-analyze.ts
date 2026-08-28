export function documentBelongsToDealForAnalyze(args: {
  dealId: string
  dealTenderId: string | null
  document: { deal_id: string | null; tender_id: string | null }
}): boolean {
  if (args.document.deal_id === args.dealId) return true
  return (
    args.document.tender_id != null &&
    args.dealTenderId != null &&
    args.document.tender_id === args.dealTenderId
  )
}
