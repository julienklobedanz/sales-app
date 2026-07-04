/** Billiges Gate für Page-Load / konditionalen RFP-Block — kein Desk-Snapshot nötig. */
export function isRfpDeal(deal: { is_rfp_mode: boolean }): boolean {
  return deal.is_rfp_mode === true
}
