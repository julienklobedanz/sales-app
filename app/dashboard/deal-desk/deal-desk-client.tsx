'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  FileType,
  Loader2,
  Sparkles,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  BID_TEAM_ROLE_DEFS,
  buildMockDealDeskAnalysis,
  DEFAULT_BID_TEAM,
  SME_ROUTE_OPTIONS,
  type BidTeamAssignment,
  type BidTeamRoleKey,
  type DealDeskMockAnalysis,
  type DealDeskRedFlag,
} from '@/lib/deal-desk/mock-analysis'
import { initialBidTeamMembers, type BidTeamMember } from '@/lib/deal-desk/bid-team'
import { WIN_PROBABILITY_THRESHOLDS } from '@/lib/deal-desk/win-probability'
import { BidTeamRoleSelect } from './components/bid-team-role-select'
import { RedFlagsPanel } from './components/red-flags-panel'
import { WinProbabilityGauge } from './components/win-probability-gauge'

const MAX_RFP_FILES = 10

const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
])

const ACCEPTED_FILE_RE = /\.(pdf|xlsx|xls|docx?|doc)$/i

const ACCEPT_ATTR =
  '.pdf,.xlsx,.xls,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword'

type TabKey = 'decision' | 'draft' | 'sme'

const DESK_LAYOUT_CLASS = 'mx-auto w-full max-w-6xl space-y-6'
const TAB_PANEL_CLASS =
  'mt-6 w-full outline-none focus-visible:outline-none data-[state=inactive]:hidden'
const TAB_STAGE_CLASS = 'w-full min-h-[680px] [scrollbar-gutter:stable]'
const TAB_CARD_CLASS = 'w-full shadow-sm'

function isAcceptedRfpFile(file: File): boolean {
  return ACCEPTED_TYPES.has(file.type) || ACCEPTED_FILE_RE.test(file.name)
}

function fileIcon(name: string) {
  if (/\.(docx?|doc)$/i.test(name)) return FileType
  if (/\.(xlsx?|xls)$/i.test(name)) return FileSpreadsheet
  return FileText
}

function mergePendingFiles(existing: File[], incoming: File[]): File[] {
  const seen = new Set(existing.map((f) => `${f.name}:${f.size}`))
  const next = [...existing]
  for (const file of incoming) {
    if (!isAcceptedRfpFile(file)) {
      toast.error(`Übersprungen: ${file.name} — nur PDF, Word oder Excel.`)
      continue
    }
    const key = `${file.name}:${file.size}`
    if (seen.has(key)) continue
    if (next.length >= MAX_RFP_FILES) {
      toast.error(`Maximal ${MAX_RFP_FILES} Dokumente pro Analyse.`)
      break
    }
    seen.add(key)
    next.push(file)
  }
  return next
}

export function DealDeskClient() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [analysis, setAnalysis] = useState<DealDeskMockAnalysis | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('decision')
  const [bidTeam, setBidTeam] = useState<BidTeamAssignment[]>(DEFAULT_BID_TEAM)
  const [teamMembers, setTeamMembers] = useState<BidTeamMember[]>(initialBidTeamMembers)
  const [bidTeamOpen, setBidTeamOpen] = useState(false)
  const [redFlags, setRedFlags] = useState<DealDeskRedFlag[]>([])
  const [smeRoutes, setSmeRoutes] = useState<Record<string, string>>({})
  const [decision, setDecision] = useState<'go' | 'no-bid' | null>(null)

  const startAnalysis = useCallback((files: File[]) => {
    if (files.length === 0) {
      toast.error('Bitte mindestens ein Dokument hochladen.')
      return
    }
    const valid = files.filter(isAcceptedRfpFile)
    if (valid.length === 0) {
      toast.error('Bitte PDF, Word (DOC/DOCX) oder Excel (XLS/XLSX) hochladen.')
      return
    }
    setAnalyzing(true)
    window.setTimeout(() => {
      const mock = buildMockDealDeskAnalysis(valid.map((f) => f.name))
      setAnalysis(mock)
      setPendingFiles([])
      setRedFlags(mock.redFlags)
      setSmeRoutes({})
      setDecision(null)
      setActiveTab('decision')
      setAnalyzing(false)
      toast.success(
        valid.length === 1
          ? 'Bid-Analyse bereit (Demo-Daten).'
          : `Bid-Analyse aus ${valid.length} Dokumenten bereit (Demo).`
      )
    }, 1400)
  }, [])

  function onFilesPick(fileList: FileList | null | undefined) {
    if (!fileList?.length) return
    setPendingFiles((prev) => mergePendingFiles(prev, Array.from(fileList)))
    if (inputRef.current) inputRef.current.value = ''
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function resetDesk() {
    setAnalysis(null)
    setPendingFiles([])
    setDecision(null)
    setRedFlags([])
    setSmeRoutes({})
    setBidTeam(DEFAULT_BID_TEAM)
    setTeamMembers(initialBidTeamMembers())
  }

  function assignBidRole(role: BidTeamRoleKey, member: BidTeamMember) {
    setBidTeam((prev) =>
      prev.map((row) =>
        row.role === role
          ? {
              ...row,
              assigneeId: member.id,
              assigneeName: member.email ?? member.name,
            }
          : row
      )
    )
  }

  if (!analysis) {
    return (
      <div className={DESK_LAYOUT_CLASS}>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragActive(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            onFilesPick(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex min-h-[320px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors',
            dragActive
              ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
              : 'border-border bg-card hover:border-blue-400/60 hover:bg-muted/30'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="sr-only"
            onChange={(e) => onFilesPick(e.target.files)}
            onClick={(e) => e.stopPropagation()}
          />
          {analyzing ? (
            <>
              <Loader2 className="size-10 animate-spin text-blue-600" aria-hidden />
              <p className="mt-4 text-sm font-medium text-foreground">
                {pendingFiles.length > 1
                  ? `${pendingFiles.length} Dokumente werden analysiert …`
                  : 'RFP wird analysiert …'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Red Flags, Eignungsmatrizen und Referenz-Matches über alle Unterlagen
              </p>
            </>
          ) : (
            <>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                <Upload className="size-7" aria-hidden />
              </div>
              <p className="mt-5 text-lg font-semibold text-foreground">
                RFP-Dokumente (PDF, Word, Excel) hier ablegen
              </p>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Bis zu {MAX_RFP_FILES} Dateien für ein holistisches Bild — Leistungsbeschreibung,
                Eignungsmatrix, Vertragsentwurf usw.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <FileText className="size-3" />
                  PDF
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <FileType className="size-3" />
                  Word
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <FileSpreadsheet className="size-3" />
                  Excel
                </Badge>
              </div>
            </>
          )}
        </div>

        {pendingFiles.length > 0 && !analyzing ? (
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {pendingFiles.length} / {MAX_RFP_FILES} Dokumente
              </CardTitle>
              <CardDescription>
                Weitere Dateien per Drag & Drop oder Klick auf die Zone hinzufügen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                {pendingFiles.map((file, index) => {
                  const Icon = fileIcon(file.name)
                  return (
                    <li
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label={`${file.name} entfernen`}
                        onClick={(e) => {
                          e.stopPropagation()
                          removePendingFile(index)
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    startAnalysis(pendingFiles)
                  }}
                >
                  <Sparkles className="size-4" />
                  Bid-Analyse starten
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPendingFiles([])
                  }}
                >
                  Liste leeren
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          Demo-Modus: Nach Start werden Beispieldaten aus allen hochgeladenen Dateien geladen.
        </p>
      </div>
    )
  }

  return (
    <div className={cn(DESK_LAYOUT_CLASS, 'pb-8')}>
      <div className="flex w-full flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-100">
            <Briefcase className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{analysis.documentName}</p>
            <p className="text-sm text-muted-foreground">
              {analysis.customerName} · {analysis.documentNames.length} Dokument
              {analysis.documentNames.length === 1 ? '' : 'e'} · Demo
            </p>
            {analysis.documentNames.length > 1 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {analysis.documentNames.map((name) => {
                  const Icon = fileIcon(name)
                  return (
                    <li key={name}>
                      <Badge variant="outline" className="max-w-[220px] gap-1 truncate font-normal">
                        <Icon className="size-3 shrink-0" />
                        <span className="truncate">{name}</span>
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={resetDesk}>
          Neues RFP
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
          <TabsTrigger value="decision" className="gap-1.5">
            <CheckCircle2 className="size-3.5" />
            Bid-Entscheidung
            {redFlags.length > 0 ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {redFlags.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="draft" className="gap-1.5">
            <Sparkles className="size-3.5" />
            Antwort-Entwürfe
          </TabsTrigger>
          <TabsTrigger value="sme" className="gap-1.5">
            <Clock className="size-3.5" />
            SME Routing
          </TabsTrigger>
        </TabsList>

        <div className={TAB_STAGE_CLASS}>
          <TabsContent value="decision" forceMount className={TAB_PANEL_CLASS}>
            <div className="w-full space-y-6">
              <Card className={cn(TAB_CARD_CLASS, 'overflow-hidden border-blue-200/60 dark:border-blue-900/40')}>
                <CardContent className="flex w-full flex-col gap-6 p-6 md:flex-row md:items-start">
                  <WinProbabilityGauge value={analysis.winProbability} size={152} />
                  <div className="min-w-0 flex-1 space-y-3">
                    <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                      {analysis.icpFitLabel}
                    </Badge>
                    <p className="text-sm leading-relaxed text-foreground/90">{analysis.icpSummary}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Score: ≥{WIN_PROBABILITY_THRESHOLDS.goMin}% GO · {WIN_PROBABILITY_THRESHOLDS.cautionMin}–
                      {WIN_PROBABILITY_THRESHOLDS.goMin - 1}% prüfen · &lt;{WIN_PROBABILITY_THRESHOLDS.cautionMin}%
                      NO-BID
                    </p>
                  </div>
                </CardContent>
              </Card>

              <RedFlagsPanel flags={redFlags} onFlagsChange={setRedFlags} className={TAB_CARD_CLASS} />

              <Card className={TAB_CARD_CLASS}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Go oder No-Bid</CardTitle>
                  <CardDescription>
                    Entscheidung dokumentieren — bei GO das Bid-Team aktivieren.
                  </CardDescription>
                  {decision ? (
                    <p className="pt-1 text-sm font-medium text-muted-foreground">
                      Status:{' '}
                      <span
                        className={
                          decision === 'go'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-red-700 dark:text-red-300'
                        }
                      >
                        {decision === 'go' ? 'GO — Bid-Team aktiviert' : 'NO-BID'}
                      </span>
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                    <Popover open={bidTeamOpen} onOpenChange={setBidTeamOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          size="lg"
                          className="h-12 w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="size-5" />
                          GO: Bid-Team aktivieren
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[min(26rem,calc(100vw-2rem))] p-4"
                        align="center"
                      >
                        <div className="w-full">
                          <p className="text-sm font-semibold text-foreground">Bid-Team definieren</p>
                          <p className="mt-1 text-xs leading-snug text-muted-foreground">
                            Rollen zuweisen — Sales Lead kann delegiert werden.
                          </p>
                        </div>
                        <div className="mt-4 w-full space-y-3">
                          {BID_TEAM_ROLE_DEFS.map((def) => {
                            const row = bidTeam.find((b) => b.role === def.key)!
                            return (
                              <BidTeamRoleSelect
                                key={def.key}
                                role={def.key}
                                roleLabel={def.label}
                                roleDescription={def.description}
                                assigneeId={row.assigneeId}
                                teamMembers={teamMembers}
                                onTeamMembersChange={setTeamMembers}
                                onAssign={assignBidRole}
                              />
                            )
                          })}
                        </div>
                        <Button
                          type="button"
                          className="mt-4 w-full"
                          size="sm"
                          onClick={() => {
                            setDecision('go')
                            setBidTeamOpen(false)
                            toast.success('Bid-Team gespeichert (Demo).')
                          }}
                        >
                          Team bestätigen
                        </Button>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="h-12 w-full gap-2 border-red-200 text-red-800 hover:bg-red-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
                      onClick={() => {
                        setDecision('no-bid')
                        toast.message('NO-BID dokumentiert (Demo).')
                      }}
                    >
                      <XCircle className="size-5" />
                      NO-BID: Strategisch ablehnen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="draft" forceMount className={TAB_PANEL_CLASS}>
            <Card className={TAB_CARD_CLASS}>
              <CardHeader>
                <CardTitle className="text-base">First Draft Engine</CardTitle>
                <CardDescription>
                  Kundenanforderung und Entwurf im Überblick — nur mit verifizierter Referenz (keine
                  Halluzination). Eignungsmatrizen werden spaltenweise aus Referenzen befüllt, wo ein
                  Match vorliegt.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 w-[42%] px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Kundenanforderung
                      </TableHead>
                      <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Unsere Antwort
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.draftRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-normal px-4 py-4 align-top text-sm leading-relaxed text-foreground">
                          {row.requirement}
                        </TableCell>
                        <TableCell className="whitespace-normal px-4 py-4 align-top">
                          {row.answer ? (
                            <>
                              <p className="text-sm leading-relaxed text-foreground/90">{row.answer}</p>
                              {row.reference ? (
                                <div className="mt-3 flex w-full items-start gap-3 rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-background">
                                    {row.reference.logoUrl ? (
                                      <Image
                                        src={row.reference.logoUrl}
                                        alt=""
                                        fill
                                        sizes="40px"
                                        className="object-contain p-1"
                                      />
                                    ) : (
                                      <div className="flex size-full items-center justify-center text-[10px] font-bold text-muted-foreground">
                                        {row.reference.companyName.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 text-xs">
                                    <p className="font-semibold text-foreground">{row.reference.title}</p>
                                    <p className="text-muted-foreground">
                                      Proof · {row.reference.matchPercent}% Match ·{' '}
                                      {row.reference.companyName}
                                    </p>
                                  </div>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <p className="text-sm italic text-muted-foreground/80">
                              Keine internen Informationen gefunden.
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sme" forceMount className={TAB_PANEL_CLASS}>
            <Card className={TAB_CARD_CLASS}>
              <CardHeader>
                <CardTitle className="text-base">SME Routing</CardTitle>
                <CardDescription>
                  Offene Punkte, die die KI nicht sicher beantworten konnte — intern weiterleiten.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.smeTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex w-full flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {task.category}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="size-3" aria-hidden />
                          Frist: {task.dueInDays} Tage
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground">{task.question}</p>
                    </div>
                    <Select
                      value={smeRoutes[task.id] ?? ''}
                      onValueChange={(v) => setSmeRoutes((prev) => ({ ...prev, [task.id]: v }))}
                    >
                      <SelectTrigger className="h-9 w-full shrink-0 text-xs md:w-[220px]">
                        <SelectValue placeholder="Weiterleiten …" />
                      </SelectTrigger>
                      <SelectContent>
                        {SME_ROUTE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
