'use server'

import { revalidatePath } from 'next/cache'

import {
  markMarketSignalOutcome,
  markMarketSignalsIrrelevant,
  snoozeMarketSignal,
} from '@/app/(app)/market-signals/actions'
import { ROUTES } from '@/lib/routes'

export async function leaderCallQueueSnoozeAction(signalKey: string) {
  const key = String(signalKey ?? '').trim()
  if (!key) return { success: false as const, error: 'Ungültiges Signal.' }
  const until = new Date()
  until.setDate(until.getDate() + 7)
  const result = await snoozeMarketSignal({
    signalKey: key,
    untilIso: until.toISOString(),
  })
  if (!result.success) return result
  revalidatePath(ROUTES.home)
  return { success: true as const }
}

export async function leaderCallQueueCompleteAction(signalKey: string) {
  const key = String(signalKey ?? '').trim()
  if (!key) return { success: false as const, error: 'Ungültiges Signal.' }
  const outcome = await markMarketSignalOutcome({ signalKey: key, stage: 'outreach' })
  if (!outcome.success) return outcome
  const dismissed = await markMarketSignalsIrrelevant([key])
  if (!dismissed.success) return dismissed
  revalidatePath(ROUTES.home)
  return { success: true as const }
}
