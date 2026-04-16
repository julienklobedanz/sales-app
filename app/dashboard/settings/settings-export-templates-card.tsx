'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExternalLink, LayoutGrid, Save } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import type {
  ExportSettings,
  PdfLayoutKey,
} from './settings-export-templates-actions'
import { updateExportSettings } from './settings-export-templates-actions'

const LAYOUT_OPTIONS: Array<{ key: PdfLayoutKey; label: string }> = [
  { key: 'one_pager', label: 'One-Pager' },
  { key: 'detail', label: 'Detail' },
  { key: 'anonymized', label: 'Anonymisiert' },
]

export function SettingsExportTemplatesCard({
  organizationId,
  initial,
}: {
  organizationId: string | null
  initial: ExportSettings
}) {
  const [layout, setLayout] = useState<PdfLayoutKey>(
    initial.pdf_layout ?? 'one_pager'
  )
  const [logoEnabled, setLogoEnabled] = useState<boolean>(
    initial.pdf_logo_enabled ?? true
  )
  const [pending, setPending] = useState(false)

  const layoutLabel = useMemo(
    () => LAYOUT_OPTIONS.find((x) => x.key === layout)?.label ?? 'One-Pager',
    [layout]
  )

  async function handleSave() {
    if (!organizationId) return
    setPending(true)
    const result = await updateExportSettings(organizationId, {
      pdf_layout: layout,
      pdf_logo_enabled: logoEnabled,
    })
    setPending(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Export-Templates gespeichert')
  }

  function handlePreview() {
    // Demo-PDF in neuem Tab (auth required)
    const qs = new URLSearchParams()
    qs.set('template', layout)
    qs.set('logo', logoEnabled ? '1' : '0')
    window.open(`/api/pdf/demo?${qs.toString()}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        <AppIcon icon={LayoutGrid} size={20} />
        <span className="text-sm font-medium uppercase tracking-wider">
          Export-Templates
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-1">
          <Label>PDF-Layout</Label>
          <Select
            value={layout}
            onValueChange={(v) => setLayout(v as PdfLayoutKey)}
            disabled={!organizationId}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Layout" />
            </SelectTrigger>
            <SelectContent>
              {LAYOUT_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Aktuell: <span className="font-medium text-foreground">{layoutLabel}</span>
          </p>
        </div>

        <div className="space-y-2 sm:col-span-1">
          <Label>Logo</Label>
          <div className="flex h-10 items-center justify-between rounded-md border bg-background px-3">
            <span className="text-sm text-foreground">
              {logoEnabled ? 'An' : 'Aus'}
            </span>
            <Switch
              checked={logoEnabled}
              onCheckedChange={setLogoEnabled}
              disabled={!organizationId}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Gilt für PDF-Exports (One-Pager/Detail/Anonymisiert).
          </p>
        </div>

        <div className="space-y-2 sm:col-span-1">
          <Label>Vorschau</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={handlePreview}
            disabled={!organizationId}
          >
            <AppIcon icon={ExternalLink} size={16} />
            Demo-PDF öffnen
          </Button>
          <p className="text-xs text-muted-foreground">
            Öffnet ein Demo-PDF in einem neuen Tab.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!organizationId || pending}
        >
          <AppIcon icon={Save} size={16} className="mr-2" />
          Speichern
        </Button>
      </div>
    </div>
  )
}

