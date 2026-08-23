'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CopyIcon, Loader, RefreshCw, Sparkles } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Option } from '@/components/ui/option'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import type { AiDraftOutputFormat, AiDraftTone } from '@/lib/ai-draft-prompt'
import { recordAiDraftGenerated } from '@/app/(app)/actions'
import { cn } from '@/lib/utils'

const FORMAT_OPTIONS: Array<{ value: AiDraftOutputFormat; label: string }> = [
  { value: 'email_snippet', label: 'E-Mail-Snippet' },
  { value: 'proposal_passage', label: 'Angebots-Passage' },
  { value: 'elevator_pitch', label: 'Elevator Pitch (3 Sätze)' },
]

const TONE_OPTIONS: Array<{ value: AiDraftTone; label: string }> = [
  { value: 'professional', label: 'Professionell' },
  { value: 'casual', label: 'Locker' },
  { value: 'formal', label: 'Formell' },
]

export function AiDraftComposer({
  referenceId,
  referenceTitle,
  matchScore,
  dealId,
  dealContext,
  onApplyToAnswer,
  showMeta = true,
  className,
}: {
  referenceId: string
  referenceTitle: string
  matchScore: number
  dealId?: string | null
  dealContext?: string | null
  onApplyToAnswer?: (text: string) => void
  showMeta?: boolean
  className?: string
}) {
  const [outputFormat, setOutputFormat] = useState<AiDraftOutputFormat>('email_snippet')
  const [tone, setTone] = useState<AiDraftTone>('professional')
  const [additionalContext, setAdditionalContext] = useState('')
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setOutput('')
  }, [referenceId])

  const runStream = useCallback(async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setStreaming(true)
    setOutput('')
    try {
      const res = await fetch('/api/ai-draft/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({
          referenceId,
          matchScore,
          outputFormat,
          tone,
          additionalContext: additionalContext.trim() || null,
          dealContext: dealContext?.trim() || null,
        }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(err?.error ?? 'Generierung fehlgeschlagen.')
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        toast.error('Kein Datenstrom erhalten.')
        return
      }

      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setOutput(acc)
      }

      if (!acc.includes('[Fehler:')) {
        void recordAiDraftGenerated({
          referenceId,
          dealId: dealId ?? null,
          outputFormat,
          tone,
        })
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      toast.error(e instanceof Error ? e.message : 'Netzwerkfehler.')
    } finally {
      setStreaming(false)
      setRegenerating(false)
    }
  }, [
    referenceId,
    matchScore,
    outputFormat,
    tone,
    additionalContext,
    dealContext,
    dealId,
  ])

  async function handleRegenerate() {
    setRegenerating(true)
    await runStream()
  }

  const scorePct = Math.round(Math.min(1, Math.max(0, matchScore)) * 100)
  const formatGroupName = `ai-draft-format-${referenceId}`

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {showMeta ? (
          <div className="text-muted-foreground space-y-1 text-sm">
            <div>
              Basierend auf:{' '}
              <span className="text-foreground font-medium">{referenceTitle}</span>
            </div>
            <div>
              Match-Score:{' '}
              <span className="text-foreground font-medium font-mono tabular-nums">
                {scorePct} %
              </span>
            </div>
          </div>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">Format</legend>
          <div className="space-y-2" role="radiogroup" aria-label="Ausgabeformat">
            {FORMAT_OPTIONS.map((opt) => (
              <Option key={opt.value}>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name={formatGroupName}
                  value={opt.value}
                  checked={outputFormat === opt.value}
                  onChange={() => setOutputFormat(opt.value)}
                  className="mt-0.5"
                />
                <span>{opt.label}</span>
              </label>
              </Option>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="ai-draft-tone">Tonalität</Label>
          <Select value={tone} onValueChange={(v) => setTone(v as AiDraftTone)}>
            <SelectTrigger id="ai-draft-tone" className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-draft-context">Zusätzlicher Kontext (optional)</Label>
          <Textarea
            id="ai-draft-context"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            rows={3}
            placeholder="z. B. „Prospect ist CIO bei einem Pharmaunternehmen“"
            className="resize-y text-sm"
          />
        </div>

        <Button
          type="button"
          disabled={streaming}
          onClick={() => void runStream()}
          className="w-full sm:w-auto"
        >
          {streaming ? (
            <>
              <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
              Wird erzeugt …
            </>
          ) : (
            <>
              <AppIcon icon={Sparkles} size={16} className="mr-2" />
              Entwurf generieren
            </>
          )}
        </Button>

        <div className="space-y-2">
          <Label htmlFor="ai-draft-result">Ergebnis</Label>
          <Card className="p-3">
            <Textarea
              id="ai-draft-result"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              readOnly={streaming}
              placeholder={
                streaming
                  ? '…'
                  : 'Nach „Entwurf generieren“ erscheint der Text hier und kann bearbeitet werden.'
              }
              className="min-h-[200px] max-h-[40vh] resize-y border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border bg-muted/10 px-4 py-4 sm:flex-row sm:justify-end">
        {onApplyToAnswer ? (
          <Button
            type="button"
            disabled={!output.trim() || streaming}
            onClick={() => onApplyToAnswer(output)}
          >
            {COPY.deals.cockpit.draftsApplyToAnswer}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={!output.trim() || streaming}
          onClick={() => {
            void navigator.clipboard
              .writeText(output)
              .then(() => toast.success('Kopiert!'))
          }}
        >
          <AppIcon icon={CopyIcon} size={16} className="mr-2" />
          Kopieren
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={streaming || regenerating}
          onClick={() => void handleRegenerate()}
        >
          {regenerating || streaming ? (
            <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
          ) : (
            <AppIcon icon={RefreshCw} size={16} className="mr-2" />
          )}
          Neu generieren
        </Button>
      </div>
    </div>
  )
}
