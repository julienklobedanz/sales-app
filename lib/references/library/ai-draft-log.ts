'use server'

import { logEventForCurrentOrg } from '@/lib/events/log-event'

import type { AiDraftOutputFormat, AiDraftTone } from '@/lib/ai-draft-prompt'

/** Nach erfolgreicher Stream-Generierung (Client ruft nach Abschluss auf). */
export async function recordAiDraftGenerated(args: {
  referenceId: string
  dealId?: string | null
  outputFormat: AiDraftOutputFormat
  tone: AiDraftTone
}): Promise<void> {
  await logEventForCurrentOrg({
    eventType: 'ki_entwurf_generated',
    referenceId: args.referenceId,
    dealId: args.dealId ?? null,
    payload: {
      output_format: args.outputFormat,
      tone: args.tone,
      source: 'ai_draft_sheet',
    },
  })
}
