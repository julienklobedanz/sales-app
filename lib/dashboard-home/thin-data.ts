export type ThinDashboardContext = {
  referenceCount: number
  dealCount: number
  eventCount: number
}

const THIN_REFERENCES_MAX = 2
const THIN_DEALS_MAX = 1
const THIN_EVENTS_MAX = 9

/** Pre-Pilot: zu wenig Volumen für belastbare Kennzahlen — ehrliche Leerzustände statt Fake-Charts. */
export function isThinDashboardContext(ctx: ThinDashboardContext): boolean {
  return (
    ctx.referenceCount <= THIN_REFERENCES_MAX &&
    ctx.dealCount <= THIN_DEALS_MAX &&
    ctx.eventCount <= THIN_EVENTS_MAX
  )
}
