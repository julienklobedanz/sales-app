'use client'

import { Loader, Sparkles } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AppIcon } from '@/lib/icons'
import { REFERENCE_NARRATIVE_MAX_CHARS } from '@/lib/references/reference-narrative-limits'
import {
  RequiredLabel,
  OptionalLabel,
} from '@/lib/references/reference-form/reference-form-labels'
import type { ReferenceFormViewModel } from '@/lib/references/reference-form/use-reference-form'
import { generateSummaryFromStory } from '@/app/(app)/actions'

export type ReferenceFormStorySectionProps = Pick<
  ReferenceFormViewModel,
  | 'initialData'
  | 'submitting'
  | 'summary'
  | 'setSummary'
  | 'customerChallenge'
  | 'setCustomerChallenge'
  | 'ourSolution'
  | 'setOurSolution'
  | 'tags'
  | 'setTags'
  | 'tagInputValue'
  | 'setTagInputValue'
  | 'summaryLoading'
  | 'setSummaryLoading'
  | 'normalizeTag'
>

export function ReferenceFormStorySection({
  initialData,
  submitting,
  summary,
  setSummary,
  customerChallenge,
  setCustomerChallenge,
  ourSolution,
  setOurSolution,
  tags,
  setTags,
  tagInputValue,
  setTagInputValue,
  summaryLoading,
  setSummaryLoading,
  normalizeTag,
}: ReferenceFormStorySectionProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <OptionalLabel htmlFor="summary">Zusammenfassung</OptionalLabel>
          <div className="relative">
            <Textarea
              id="summary"
              name="summary"
              placeholder="Kurze Beschreibung der Referenz …"
              rows={4}
              disabled={submitting}
              value={summary}
              maxLength={REFERENCE_NARRATIVE_MAX_CHARS}
              onChange={(e) => setSummary(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:bg-muted"
              disabled={submitting || summaryLoading}
              onClick={async () => {
                setSummaryLoading(true)
                try {
                  const result = await generateSummaryFromStory(
                    customerChallenge,
                    ourSolution,
                    initialData?.id,
                  )
                  if (result.success) {
                    setSummary(result.summary)
                    toast.success('KI-Zusammenfassung übernommen.')
                  } else {
                    toast.error(result.error)
                  }
                } finally {
                  setSummaryLoading(false)
                }
              }}
              aria-label="KI-Vorschlag für Zusammenfassung"
            >
              {summaryLoading ? (
                <AppIcon icon={Loader} size={14} className="animate-spin" />
              ) : (
                <AppIcon icon={Sparkles} size={14} />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-right tabular-nums">
            {summary.length}/{REFERENCE_NARRATIVE_MAX_CHARS}
          </p>
        </div>

        {/* Storytelling: Herausforderung & Lösung */}
        <div className="space-y-3">
          <div className="space-y-1">
            <RequiredLabel htmlFor="customer_challenge">
              Herausforderung des Kunden
            </RequiredLabel>
            <Textarea
              id="customer_challenge"
              name="customer_challenge"
              placeholder="Welche Herausforderung oder welches Ziel hatte der Kunde?"
              rows={4}
              disabled={submitting}
              value={customerChallenge}
              maxLength={REFERENCE_NARRATIVE_MAX_CHARS}
              onChange={(e) => setCustomerChallenge(e.target.value)}
              className="text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground text-right tabular-nums">
              {customerChallenge.length}/{REFERENCE_NARRATIVE_MAX_CHARS}
            </p>
          </div>
          <div className="space-y-1">
            <RequiredLabel htmlFor="our_solution">Unsere Lösung</RequiredLabel>
            <Textarea
              id="our_solution"
              name="our_solution"
              placeholder="Wie haben wir die Herausforderung gelöst?"
              rows={4}
              disabled={submitting}
              value={ourSolution}
              maxLength={REFERENCE_NARRATIVE_MAX_CHARS}
              onChange={(e) => setOurSolution(e.target.value)}
              className="text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground text-right tabular-nums">
              {ourSolution.length}/{REFERENCE_NARRATIVE_MAX_CHARS}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <OptionalLabel htmlFor="tags-input">Tags</OptionalLabel>
          <input type="hidden" name="tags" value={tags.join(' ')} />
          <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
              >
                {tag}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="rounded-full hover:bg-muted-foreground/20 -mr-0.5 p-0.5"
                  aria-label={`Tag „${tag}" entfernen`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="tags-input"
              type="text"
              placeholder={
                tags.length === 0
                  ? 'z. B. Cloud — Enter drücken, um einen Tag zu übernehmen'
                  : 'Weiterer Tag… (Enter)'
              }
              disabled={submitting}
              value={tagInputValue}
              onChange={(e) => setTagInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const value = normalizeTag(tagInputValue)
                  if (value) {
                    setTags((prev) => {
                      const exists = prev.some(
                        (t) => t.toLowerCase() === value.toLowerCase(),
                      )
                      return exists ? prev : [...prev, value]
                    })
                    setTagInputValue('')
                  }
                }
              }}
              className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
