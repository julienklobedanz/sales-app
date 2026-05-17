'use client'

import Link from 'next/link'
import { toast } from 'sonner'

import { ROUTES } from '@/lib/routes'
import type { BulkImportReviewSuggestions } from '@/lib/references/bulk-import-review-types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const SUGGESTION_LABELS: Record<keyof BulkImportReviewSuggestions, string> = {
  title: 'Titel',
  summary: 'Kurzfassung',
  industry: 'Branche',
  volume_eur: 'Volumen',
  customer_challenge: 'Herausforderung',
  our_solution: 'Lösung',
}

export type BulkImportReviewItem = {
  referenceId: string
  title: string
  needsInput: boolean
  extractionOk: boolean
  extractionError?: string
  suggestions: BulkImportReviewSuggestions
}

export function BulkImportReviewDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: BulkImportReviewItem[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,920px)] w-[calc(100vw-2rem)] max-w-[90vw] flex-col gap-0 overflow-hidden border-0 p-0 sm:max-w-[90vw] lg:max-w-7xl">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-6 md:px-10 md:py-8">
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle>Import prüfen</DialogTitle>
          <DialogDescription>
            Für die folgenden Referenzen fehlen noch verlässliche Angaben oder es gab Hinweise beim
            Einlesen. Vorschläge kannst du kopieren und im Editor einfügen.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2 pr-1">
          {items.map((item) => (
            <Card key={item.referenceId} className="gap-3 py-4 shadow-none">
              <CardHeader className="px-4 pb-0">
                <CardTitle className="text-base">{item.title || 'Referenz'}</CardTitle>
                <CardDescription className="text-xs">
                  {item.extractionError ? (
                    <span className="text-destructive">{item.extractionError}</span>
                  ) : item.needsInput ? (
                    <span>Bitte Herausforderung und Lösung prüfen oder ergänzen.</span>
                  ) : (
                    <span>Bitte Vorschläge prüfen.</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-4">
                {(Object.keys(item.suggestions) as (keyof BulkImportReviewSuggestions)[]).map(
                  (key) => {
                    const values = item.suggestions[key]
                    if (!values?.length) return null
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">
                          {SUGGESTION_LABELS[key]}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {values.map((text) => (
                            <Badge
                              key={text}
                              variant="secondary"
                              className="max-w-full cursor-pointer whitespace-normal px-2 py-1 text-left font-normal"
                              title="Klicken zum Kopieren"
                              onClick={() => {
                                void navigator.clipboard.writeText(text)
                                toast.success('In die Zwischenablage kopiert')
                              }}
                            >
                              {text}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )
                  },
                )}
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link href={ROUTES.evidence.edit(item.referenceId)}>Im Editor bearbeiten</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter className="shrink-0 border-t border-border pt-4 sm:justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
