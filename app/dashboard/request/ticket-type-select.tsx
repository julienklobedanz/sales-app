'use client'

import { useState } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type TicketType = 'support' | 'feedback'

export function TicketTypeSelect({
  name = 'type',
  defaultValue = 'support',
}: {
  name?: string
  defaultValue?: TicketType
}) {
  const [value, setValue] = useState<TicketType>(defaultValue)

  return (
    <div className="space-y-2">
      <Label htmlFor="ticket-type">Typ</Label>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={(v) => setValue(v as TicketType)}>
        <SelectTrigger id="ticket-type" className="w-full">
          <SelectValue placeholder="Auswählen …" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="support">Referenz-Bedarf (Deal-Unterstützung)</SelectItem>
          <SelectItem value="feedback">Feedback / Verbesserungsvorschlag</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

