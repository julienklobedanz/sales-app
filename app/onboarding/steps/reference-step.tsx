"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ExtractedReferenceData } from "@/app/dashboard/evidence/new/types"

export function ReferenceStep({
  onContinue,
  onSkip,
  onExtract,
  preview,
  extracting,
  saving,
  disabled,
}: {
  onContinue: () => void | Promise<void>
  onSkip: () => void
  onExtract: (file: File) => void
  preview: ExtractedReferenceData | null
  extracting: boolean
  saving: boolean
  disabled?: boolean
}) {
  const [dragOver, setDragOver] = React.useState(false)

  const busy = extracting || saving
  const canContinue = Boolean(preview) && !busy

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-lg font-semibold tracking-tight">Schritt 2: Erste Referenz</div>
        <div className="text-sm text-muted-foreground">
          Optional: PDF/DOCX/PPTX hochladen. Die KI extrahiert die Felder – mit &quot;Weiter&quot; wird die Referenz
          wie unter Evidence angelegt und das Dokument gespeichert.
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
            disabled={disabled || busy}
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

      {saving ? (
        <div className="text-sm text-muted-foreground">Speichere Referenz und Dokument…</div>
      ) : null}

      {preview ? (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="text-sm font-medium">Vorschau</div>
          {preview.company_name ? (
            <div className="text-sm">
              <div className="text-muted-foreground">Unternehmen</div>
              <div className="font-medium">{preview.company_name}</div>
            </div>
          ) : null}
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
        <Button type="button" variant="ghost" onClick={onSkip} disabled={disabled || busy}>
          Überspringen
        </Button>
        <Button type="button" onClick={() => void onContinue()} disabled={disabled || !canContinue}>
          {saving ? "Speichern…" : "Weiter →"}
        </Button>
      </div>
    </div>
  )
}
