'use server'

import { logEventForCurrentOrg } from '@/lib/events/log-event'

import type { KiEntwurfOutputFormat, KiEntwurfTone } from '@/lib/ki-entwurf-prompt'

/** Nach erfolgreicher Stream-Generierung (Client ruft nach Abschluss auf). */
export async function recordKiEntwurfGenerated(args: {
  referenceId: string
  dealId?: string | null
  outputFormat: KiEntwurfOutputFormat
  tone: KiEntwurfTone
}): Promise<void> {
  await logEventForCurrentOrg({
    eventType: 'ki_entwurf_generated',
    referenceId: args.referenceId,
    dealId: args.dealId ?? null,
    payload: {
      output_format: args.outputFormat,
      tone: args.tone,
      source: 'ki_entwurf_sheet',
    },
  })
}
