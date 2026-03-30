"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ExtractedReferencePreview = {
  title?: string | null
  summary?: string | null
  industry?: string | null
}

export function ReferenceStep({
  onNext,
  onSkip,
  onExtract,
  preview,
  extracting,
  disabled,
}: {
  onNext: () => void
  onSkip: () => void
  onExtract: (file: File) => void
  preview: ExtractedReferencePreview | null
  extracting: boolean
  disabled?: boolean
}) {
  const [dragOver, setDragOver] = React.useState(false)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-lg font-semibold tracking-tight">Schritt 2: Erste Referenz</div>
        <div className="text-sm text-muted-foreground">
          Optional: Lade eine PDF/DOCX/PPTX hoch. Die KI extrahiert automatisch Titel, Branche und Zusammenfassung.
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg border-2 border-dashed p-6 transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        )}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) onExtract(file)
        }}
      >
        <div className="text-sm font-medium">📄 Drag & Drop</div>
        <div className="mt-1 text-sm text-muted-foreground">
          PDF, DOCX oder PPTX hierher ziehen – oder auswählen.
        </div>
        <div className="mt-4">
          <input
            type="file"
            accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            disabled={disabled || extracting}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onExtract(file)
            }}
          />
        </div>
      </div>

      {extracting ? (
        <div className="text-sm text-muted-foreground">Extrahiere Daten…</div>
      ) : null}

      {preview ? (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="text-sm font-medium">Vorschau</div>
          <div className="text-sm">
            <div className="text-muted-foreground">Titel</div>
            <div className="font-medium">{preview.title || "—"}</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">Branche</div>
            <div className="font-medium">{preview.industry || "—"}</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">Zusammenfassung</div>
            <div className="whitespace-pre-wrap">{preview.summary || "—"}</div>
          </div>
        </div>
      ) : null}

      <div className="flex justify-between gap-2">
        <Button type="button" variant="ghost" onClick={onSkip} disabled={disabled}>
          Überspringen
        </Button>
        <Button type="button" onClick={onNext} disabled={disabled}>
          Weiter →
        </Button>
      </div>
    </div>
  )
}

