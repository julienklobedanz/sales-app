'use client'

import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Hinweis } from '@/components/ui/hinweis'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReferenceNarrativeBody } from '@/components/references/reference-narrative-body'
import {
  formatReferenceDate,
  formatReferenceVolume,
  type OrgDateDisplayFormat,
} from '@/lib/format'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'
import {
  visibleReferenceContentFields,
  type ReferenceContentFieldValues,
  type ReferenceContentFile,
  type ReferenceContentSurface,
} from '@/lib/references/reference-content-fields'
import { formatProjectEndWithDurationDe } from '@/lib/references/reference-duration-months'
import { updateReferenceAssetCategory } from '@/app/dashboard/actions'

export type { ReferenceContentFile } from '@/lib/references/reference-content-fields'

export type ReferenceContentSectionRender = (args: {
  fieldId: 'summary' | 'challenge' | 'solution'
  title: string
  children: ReactNode
}) => React.ReactNode

const FILE_CATEGORIES = ['sales', 'contract', 'other'] as const

const FILE_CATEGORY_LABEL: Record<(typeof FILE_CATEGORIES)[number], string> = {
  sales: 'Sales',
  contract: 'Verträge',
  other: 'Sonstiges',
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </Card>
  )
}

function ContactBlock({
  label,
  name,
  email,
  role,
}: {
  label: string
  name: string
  email?: string | null
  role?: string | null
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{name}</div>
      {email ? <div className="text-xs text-muted-foreground">{email}</div> : null}
      {role ? <div className="text-xs text-muted-foreground">{role}</div> : null}
    </div>
  )
}

export function ReferenceContentCore({
  surface,
  summary,
  challenge,
  solution,
  usabilityText,
  competitorBlacklist,
  volumeEur,
  contractType,
  projectStart,
  projectEnd,
  projectStatus,
  incumbentProvider,
  competitors,
  salesContact,
  salesContactEmail,
  customerContact,
  customerContactEmail,
  customerContactRole,
  files,
  filesLoading,
  canEditFileCategory,
  dateFmt = 'de-DE',
  onFilesChange,
  renderSection,
  emptyReducedMessage = 'Für diese Freigabe sind keine weiteren Inhalte hinterlegt.',
}: {
  surface: ReferenceContentSurface
  summary?: string | null
  challenge?: string | null
  solution?: string | null
  usabilityText?: string | null
  competitorBlacklist?: readonly string[] | null
  volumeEur?: string | null
  contractType?: string | null
  projectStart?: string | null
  projectEnd?: string | null
  projectStatus?: string | null
  incumbentProvider?: string | null
  competitors?: string | null
  salesContact?: string | null
  salesContactEmail?: string | null
  customerContact?: string | null
  customerContactEmail?: string | null
  customerContactRole?: string | null
  files?: ReferenceContentFile[]
  filesLoading?: boolean
  canEditFileCategory?: boolean
  dateFmt?: OrgDateDisplayFormat | string
  onFilesChange?: (files: ReferenceContentFile[]) => void
  renderSection?: ReferenceContentSectionRender
  emptyReducedMessage?: string
}) {
  const volumeLabel = formatReferenceVolume(volumeEur)
  const contractLabel = formatContractTypeDisplay(contractType)
  const startLabel = projectStart
    ? formatReferenceDate(projectStart, dateFmt as OrgDateDisplayFormat)
    : ''
  const endLabel = projectEnd
    ? formatProjectEndWithDurationDe({
        project_start: projectStart ?? null,
        project_end: projectEnd,
        project_status: projectStatus ?? null,
        formatEndDate: (iso) =>
          formatReferenceDate(iso, dateFmt as OrgDateDisplayFormat),
      })
    : ''

  const values: ReferenceContentFieldValues = {
    summary,
    usabilityStatement: usabilityText,
    competitorBlacklist,
    challenge,
    solution,
    volume: volumeLabel,
    contractType: contractLabel,
    projectStart: startLabel,
    projectEnd: endLabel,
    incumbentProvider,
    competitors,
    customerContact,
    salesContact: salesContact || salesContactEmail,
    files,
  }
  const visible = visibleReferenceContentFields(surface, values)
  const show = (id: (typeof visible)[number]) => visible.includes(id)

  if (surface === 'reduced') {
    if (visible.length === 0) {
      return <p className="text-center text-sm text-muted-foreground">{emptyReducedMessage}</p>
    }

    const blocks: Array<{
      fieldId: 'summary' | 'challenge' | 'solution'
      title: string
      text: string
    }> = []
    if (show('summary') && summary?.trim()) {
      blocks.push({ fieldId: 'summary', title: 'Kurzbeschreibung', text: summary.trim() })
    }
    if (show('challenge') && challenge?.trim()) {
      blocks.push({
        fieldId: 'challenge',
        title: 'Herausforderung',
        text: challenge.trim(),
      })
    }
    if (show('solution') && solution?.trim()) {
      blocks.push({ fieldId: 'solution', title: 'Unsere Lösung', text: solution.trim() })
    }

    return (
      <div className="w-full min-w-0 space-y-5">
        {blocks.map((block) => {
          const body = <ReferenceNarrativeBody text={block.text} />
          if (renderSection) {
            return (
              <div key={block.fieldId}>
                {renderSection({
                  fieldId: block.fieldId,
                  title: block.title,
                  children: body,
                })}
              </div>
            )
          }
          return (
            <section key={block.fieldId} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{block.title}</h3>
              {body}
            </section>
          )
        })}
      </div>
    )
  }

  const projectCells: Array<{ label: string; value: string; id: string }> = []
  if (show('volume')) projectCells.push({ id: 'volume', label: 'Volumen', value: volumeLabel })
  if (show('contractType')) {
    projectCells.push({ id: 'contractType', label: 'Vertragsart', value: contractLabel })
  }
  if (show('projectStart')) {
    projectCells.push({ id: 'projectStart', label: 'Projektstart', value: startLabel })
  }
  if (show('projectEnd')) {
    projectCells.push({ id: 'projectEnd', label: 'Projektende', value: endLabel })
  }
  if (show('incumbentProvider') && incumbentProvider?.trim()) {
    projectCells.push({
      id: 'incumbentProvider',
      label: 'Akt. Dienstleister',
      value: incumbentProvider.trim(),
    })
  }
  if (show('competitors') && competitors?.trim()) {
    projectCells.push({
      id: 'competitors',
      label: 'Wettbewerber',
      value: competitors.trim(),
    })
  }

  const blacklist = (competitorBlacklist ?? []).map((item) => item.trim()).filter(Boolean)

  return (
    <div className="space-y-6">
      {show('summary') && summary?.trim() ? (
        <Hinweis className="px-4 py-3 text-base font-medium leading-relaxed text-foreground">
          {summary.trim()}
        </Hinweis>
      ) : null}

      {show('usabilityStatement') && usabilityText?.trim() ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{usabilityText.trim()}</p>
          {show('competitorBlacklist') && blacklist.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Nicht verwenden für</p>
              <div className="flex flex-wrap gap-1.5">
                {blacklist.map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {show('challenge') || show('solution') ? (
        <div className="space-y-7">
          {show('challenge') && challenge?.trim() ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Herausforderung</div>
              <ReferenceNarrativeBody text={challenge} />
            </div>
          ) : null}
          {show('solution') && solution?.trim() ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Unsere Lösung</div>
              <ReferenceNarrativeBody text={solution} />
            </div>
          ) : null}
        </div>
      ) : null}

      {projectCells.length > 0 ? (
        <section className="space-y-2">
          <div className="text-sm font-semibold">Projektdetails</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {projectCells.map((cell) => (
              <DetailCell key={cell.id} label={cell.label} value={cell.value} />
            ))}
          </div>
        </section>
      ) : null}

      {show('customerContact') || show('salesContact') ? (
        <section className="space-y-3">
          <div className="text-sm font-semibold">Kontakte</div>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {show('salesContact') ? (
              <ContactBlock
                label="Sales"
                name={(salesContact || salesContactEmail || '').trim()}
                email={salesContactEmail}
              />
            ) : null}
            {show('customerContact') && customerContact?.trim() ? (
              <ContactBlock
                label="Kundenansprechpartner"
                name={customerContact.trim()}
                email={customerContactEmail}
                role={customerContactRole}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {filesLoading ? (
        <section className="space-y-3">
          <div className="text-sm font-semibold">Dateien</div>
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Dateien werden geladen…
          </div>
        </section>
      ) : show('files') && files && files.length > 0 ? (
        <section className="space-y-3">
          <div className="text-sm font-semibold">Dateien</div>
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {FILE_CATEGORIES.map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {FILE_CATEGORY_LABEL[cat]}
                </TabsTrigger>
              ))}
            </TabsList>
            {FILE_CATEGORIES.map((cat) => {
              const assetsInCat = files.filter((file) =>
                cat === 'other'
                  ? file.category === 'other' || file.category == null
                  : file.category === cat,
              )
              return (
                <TabsContent key={cat} value={cat} className="mt-2">
                  {assetsInCat.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Keine Dateien in dieser Kategorie.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {assetsInCat.map((file) => (
                        <li key={file.key}>
                          <Card className="flex flex-wrap items-center justify-between gap-2 p-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm">{file.name}</div>
                            {file.createdAt ? (
                              <div className="text-[10px] text-muted-foreground">
                                {formatReferenceDate(
                                  file.createdAt,
                                  dateFmt as OrgDateDisplayFormat,
                                )}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            {canEditFileCategory && file.assetId ? (
                              <Select
                                value={file.category ?? 'other'}
                                onValueChange={async (value: 'sales' | 'contract' | 'other') => {
                                  const res = await updateReferenceAssetCategory(
                                    file.assetId as string,
                                    value,
                                  )
                                  if (res.success) {
                                    onFilesChange?.(
                                      files.map((entry) =>
                                        entry.key === file.key
                                          ? { ...entry, category: value }
                                          : entry,
                                      ),
                                    )
                                    toast.success('Kategorie aktualisiert.')
                                  } else {
                                    toast.error(res.error ?? 'Fehler beim Aktualisieren.')
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 w-[130px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sales">Sales</SelectItem>
                                  <SelectItem value="contract">Verträge</SelectItem>
                                  <SelectItem value="other">Sonstiges</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : null}
                            {file.href ? (
                              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                <a href={file.href} target="_blank" rel="noopener noreferrer">
                                  Öffnen
                                </a>
                              </Button>
                            ) : null}
                          </div>
                          </Card>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </section>
      ) : null}
    </div>
  )
}
