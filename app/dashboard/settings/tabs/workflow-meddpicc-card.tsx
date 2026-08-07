'use client'

import { useState } from 'react'

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

import { SETTINGS_CARD_CLASS } from './settings-tab-shared'
import {
  DEFAULT_MEDDPICC_REQUIRED,
  MEDDPICC_FIELDS,
  type MeddpiccRequiredState,
} from './workflow-types'

export function WorkflowMeddpiccCard() {
  const [meddpiccRequired, setMeddpiccRequired] = useState<MeddpiccRequiredState>(
    DEFAULT_MEDDPICC_REQUIRED,
  )

  return (
    <div className={SETTINGS_CARD_CLASS}>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-base">MEDDPICC</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 px-0 pb-0 sm:grid-cols-2">
        {MEDDPICC_FIELDS.map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            {label}
            <Switch
              checked={meddpiccRequired[key]}
              onCheckedChange={(checked) =>
                setMeddpiccRequired((prev) => ({ ...prev, [key]: checked }))
              }
            />
          </label>
        ))}
      </CardContent>
    </div>
  )
}
