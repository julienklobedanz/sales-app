'use client'

import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { CompanyStrategyRow } from './actions'
import { upsertCompanyStrategy } from './actions'

export function useAccountDetailStrategy({
  companyId,
  initialStrategy,
  canEdit,
}: {
  companyId: string
  initialStrategy: CompanyStrategyRow | null
  canEdit: boolean
}) {
  const [goals, setGoals] = useState(initialStrategy?.company_goals ?? '')
  const [valueProposition, setValueProposition] = useState(
    initialStrategy?.value_proposition ?? '',
  )
  const [redFlags, setRedFlags] = useState(initialStrategy?.red_flags ?? '')
  const [competition, setCompetition] = useState(initialStrategy?.competition ?? '')
  const [nextSteps, setNextSteps] = useState(initialStrategy?.next_steps ?? '')
  const [metricsPain, setMetricsPain] = useState(initialStrategy?.metrics_pain ?? '')
  const [mhAssessment] = useState<Record<string, unknown>>(
    initialStrategy?.mh_assessment ?? {},
  )
  const [strategySaving, setStrategySaving] = useState(false)

  const lastSavedRef = useRef({
    goals: initialStrategy?.company_goals ?? '',
    valueProposition: initialStrategy?.value_proposition ?? '',
    redFlags: initialStrategy?.red_flags ?? '',
    competition: initialStrategy?.competition ?? '',
    nextSteps: initialStrategy?.next_steps ?? '',
    metricsPain: initialStrategy?.metrics_pain ?? '',
    mhAssessment: initialStrategy?.mh_assessment ?? {},
  })

  const saveStrategy = async (opts?: { silent?: boolean }) => {
    if (!canEdit) return
    const snapshot = {
      goals,
      valueProposition,
      redFlags,
      competition,
      nextSteps,
      metricsPain,
      mhAssessment,
    }
    const last = lastSavedRef.current
    const changed =
      snapshot.goals !== last.goals ||
      snapshot.valueProposition !== last.valueProposition ||
      snapshot.redFlags !== last.redFlags ||
      snapshot.competition !== last.competition ||
      snapshot.nextSteps !== last.nextSteps ||
      snapshot.metricsPain !== last.metricsPain ||
      JSON.stringify(snapshot.mhAssessment) !== JSON.stringify(last.mhAssessment)
    if (!changed) return

    setStrategySaving(true)
    try {
      const res = await upsertCompanyStrategy(companyId, {
        metrics_pain: snapshot.metricsPain || null,
        company_goals: snapshot.goals || null,
        red_flags: snapshot.redFlags || null,
        competition: snapshot.competition || null,
        next_steps: snapshot.nextSteps || null,
        value_proposition: snapshot.valueProposition || null,
        mh_assessment: snapshot.mhAssessment,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Speichern fehlgeschlagen.')
        return
      }
      lastSavedRef.current = snapshot
      if (!opts?.silent) toast.success('Gespeichert.')
    } finally {
      setStrategySaving(false)
    }
  }

  const strategyFields = useMemo(
    () => [
      {
        key: 'metrics_pain',
        label: 'Metrics & Pain',
        value: metricsPain,
        set: setMetricsPain,
      },
      { key: 'company_goals', label: 'Geschäftsziele', value: goals, set: setGoals },
      {
        key: 'value_proposition',
        label: 'Value Proposition',
        value: valueProposition,
        set: setValueProposition,
      },
      {
        key: 'red_flags',
        label: 'Risiken / Red Flags',
        value: redFlags,
        set: setRedFlags,
      },
      {
        key: 'competition',
        label: 'Wettbewerb / Incumbent',
        value: competition,
        set: setCompetition,
      },
      {
        key: 'next_steps',
        label: 'Nächste Schritte',
        value: nextSteps,
        set: setNextSteps,
      },
    ],
    [metricsPain, goals, valueProposition, redFlags, competition, nextSteps],
  )

  return {
    strategySaving,
    strategyFields,
    saveStrategy,
  }
}
