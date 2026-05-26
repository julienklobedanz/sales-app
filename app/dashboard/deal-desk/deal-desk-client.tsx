'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  FileType,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  Sprout,
  Trash2,
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
  SME_ROUTE_OPTIONS,
  type BidTeamRoleKey,
} from '@/lib/deal-desk/mock-analysis'
import type { BidTeamMember } from '@/lib/deal-desk/bid-team'
import { projectToWorkspaceState } from '@/lib/deal-desk/project-mapper'
import {
  defaultProjectNameFromFiles,
  type DealDeskProject,
} from '@/lib/deal-desk/deal-desk-project'
import {
  createDealDeskProjectAction,
  deleteDealDeskProjectAction,
  getDealDeskProject,
  listDealDeskBidTeamMembers,
  listDealDeskProjects,
  logDealDeskGoAction,
  logDealDeskNoBidAction,
  logDealDeskSmeRouteAction,
  removeDealDeskDocumentAction,
  resetDealDeskDemoForOrg,
  runDealDeskDemoAnalyzeAction,
  updateDealDeskProjectAction,
} from './actions'
import { BidTeamRoleSelect } from './components/bid-team-role-select'
import { DealDeskProjectHeader } from './components/deal-desk-project-header'
import { RedFlagsPanel } from './components/red-flags-panel'
import { ReferenceIncubatorTab } from './components/reference-incubator-tab'
import { WinProbabilityGauge } from './components/win-probability-gauge'
import {
  RFP_SCAN_OCR_STATUS,
  RFP_SCAN_PDF_HINT,
} from '@/lib/deal-desk/rfp-extraction-messages'

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

type TabKey = 'decision' | 'draft' | 'sme' | 'incubator'

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

function isLikelyScanExtractionError(message: string | null | undefined): boolean {
  if (!message) return false
  return /scan|ocr|zu wenig|extrahierbar|durchsuchbar/i.test(message)
}

function showAnalysisErrorToast(error: string, isScanLikely?: boolean) {
  if (isScanLikely || isLikelyScanExtractionError(error)) {
    toast.error(error, { duration: 12_000 })
  } else {
    toast.error(error)
  }
}

type AnalyzeApiResult = {
  success?: boolean
  error?: string
  source?: string
  isScanLikely?: boolean
  extractionUsedOcr?: boolean
  quotaExceeded?: boolean
  warning?: string
}

function showAnalysisSuccessToast(json: AnalyzeApiResult, fallback: string) {
  if (json.warning) {
    toast.warning(json.warning, { duration: 14_000 })
    return
  }
  toast.success(fallback)
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

export function DealDeskClient({ runDemoOnMount = false }: { runDemoOnMount?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const skipPersistRef = useRef(true)
  const persistTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const [dragActive, setDragActive] = useState(false)
  const [loadingDesk, setLoadingDesk] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStatus, setAnalyzeStatus] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [projects, setProjects] = useState<DealDeskProject[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('decision')
  const [teamMembers, setTeamMembers] = useState<BidTeamMember[]>([])
  const [bidTeamOpen, setBidTeamOpen] = useState(false)
  const [canResetDemo, setCanResetDemo] = useState(false)

  const activeProject =
    projects.find((p) => p.id === activeProjectId) ?? projects[projects.length - 1] ?? null

  const schedulePersist = useCallback((project: DealDeskProject) => {
    if (skipPersistRef.current) return
    const existing = persistTimersRef.current.get(project.id)
    if (existing) clearTimeout(existing)
    persistTimersRef.current.set(
      project.id,
      setTimeout(() => {
        void updateDealDeskProjectAction(project.id, {
          projectName: project.projectName,
          workspaceState: projectToWorkspaceState(project),
        })
      }, 450)
    )
  }, [])

  const updateProject = useCallback(
    (id: string, updater: (project: DealDeskProject) => DealDeskProject) => {
      setProjects((prev) => {
        const next = prev.map((p) => {
          if (p.id !== id) return p
          const updated = updater(p)
          schedulePersist(updated)
          return updated
        })
        return next
      })
    },
    [schedulePersist]
  )

  const reloadProject = useCallback(async (projectId: string) => {
    const res = await getDealDeskProject(projectId)
    if (!res.success) return
    setProjects((prev) => {
      const rest = prev.filter((p) => p.id !== projectId)
      return [...rest, res.project]
    })
  }, [])

  useEffect(() => {
    void (async () => {
      setLoadingDesk(true)
      const [listRes, teamRes] = await Promise.all([
        listDealDeskProjects(),
        listDealDeskBidTeamMembers(),
      ])
      if (listRes.success) {
        setProjects(listRes.projects)
        if (listRes.projects[0]) setActiveProjectId(listRes.projects[0].id)
      } else {
        toast.error(listRes.error)
      }
      if (teamRes.success) {
        setTeamMembers(
          teamRes.members.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email ?? undefined,
          }))
        )
      }
      skipPersistRef.current = false
      setLoadingDesk(false)
      setCanResetDemo(
        process.env.NEXT_PUBLIC_DEAL_DESK_DEMO === '1' ||
          process.env.NEXT_PUBLIC_DEAL_DESK_DEMO_MODE === '1'
      )

      if (runDemoOnMount && listRes.success && listRes.projects.length === 0) {
        const demo = await runDealDeskDemoAnalyzeAction()
        if (demo.success) {
          await reloadProject(demo.projectId)
          setActiveProjectId(demo.projectId)
          toast.success('Demo-Projekt geladen.')
        }
      }
    })()
  }, [runDemoOnMount, reloadProject])

  useEffect(() => {
    if (!activeProjectId || !activeProject) return
    if (activeProject.analysisStatus !== 'processing') return

    const interval = window.setInterval(() => {
      void reloadProject(activeProjectId)
    }, 2000)

    return () => window.clearInterval(interval)
  }, [activeProjectId, activeProject?.analysisStatus, reloadProject])

  const startAnalysis = useCallback(
    async (files: File[]) => {
      if (analyzing) return
      if (files.length === 0) {
        toast.error('Bitte mindestens ein Dokument hochladen.')
        return
      }
      const valid = files.filter(isAcceptedRfpFile)
      if (valid.length === 0) {
        toast.error('Bitte PDF, Word (DOC/DOCX) oder Excel (XLS/XLSX) hochladen.')
        return
      }

      const fileNames = valid.map((f) => f.name)
      setAnalyzing(true)
      setAnalyzeStatus('Projekt wird angelegt …')

      const created = await createDealDeskProjectAction({
        projectName: defaultProjectNameFromFiles(fileNames),
        fileNames,
      })
      if (!created.success) {
        toast.error(created.error)
        setAnalyzing(false)
        setAnalyzeStatus(null)
        return
      }

      const formData = new FormData()
      formData.set('projectId', created.projectId)
      for (const file of valid) {
        formData.append('files', file)
      }

      setAnalyzeStatus(
        valid.length > 1
          ? `${valid.length} Dokumente werden ausgelesen und analysiert …`
          : 'Dokument wird ausgelesen (Scan-PDFs ggf. per OCR) …'
      )

      try {
        const res = await fetch('/api/deal-desk/analyze', { method: 'POST', body: formData })
        const json = (await res.json()) as AnalyzeApiResult

        if (!res.ok || !json.success) {
          showAnalysisErrorToast(json.error ?? 'Analyse fehlgeschlagen.', json.isScanLikely)
          await reloadProject(created.projectId)
          setActiveProjectId(created.projectId)
          return
        }

        await reloadProject(created.projectId)
        setActiveProjectId(created.projectId)
        setPendingFiles([])
        setUploadMode(false)
        setActiveTab('decision')
        showAnalysisSuccessToast(
          json,
          json.quotaExceeded
            ? 'Demo-Analyse geladen (OpenAI-Limit).'
            : json.source === 'mock'
              ? 'Bid-Analyse bereit (Fallback-Demo).'
              : json.extractionUsedOcr
                ? 'Bid-Analyse abgeschlossen (Scan-PDF per OCR ausgelesen).'
                : valid.length === 1
                  ? 'Bid-Analyse abgeschlossen.'
                  : `Bid-Analyse aus ${valid.length} Dokumenten abgeschlossen.`
        )
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Netzwerkfehler.')
      } finally {
        setAnalyzing(false)
        setAnalyzeStatus(null)
      }
    },
    [analyzing, reloadProject]
  )

  const rerunAnalysis = useCallback(
    async (projectId: string) => {
      setAnalyzing(true)
      setAnalyzeStatus('Gespeicherte Dokumente werden erneut ausgewertet (ggf. OCR) …')
      try {
        const formData = new FormData()
        formData.set('projectId', projectId)
        formData.set('reRun', '1')

        const res = await fetch('/api/deal-desk/analyze', { method: 'POST', body: formData })
        const json = (await res.json()) as AnalyzeApiResult

        if (!res.ok || !json.success) {
          showAnalysisErrorToast(json.error ?? 'Erneute Analyse fehlgeschlagen.', json.isScanLikely)
          await reloadProject(projectId)
          return
        }

        await reloadProject(projectId)
        setActiveTab('decision')
        showAnalysisSuccessToast(
          json,
          json.quotaExceeded
            ? 'Demo-Analyse geladen (OpenAI-Limit).'
            : json.source === 'mock'
              ? 'Analyse aktualisiert (Fallback-Demo).'
              : json.extractionUsedOcr
                ? 'Analyse erneut abgeschlossen (Scan-PDF per OCR).'
                : 'Analyse erneut abgeschlossen.'
        )
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Netzwerkfehler.')
      } finally {
        setAnalyzing(false)
        setAnalyzeStatus(null)
      }
    },
    [reloadProject]
  )

  function onFilesPick(fileList: FileList | null | undefined) {
    if (!fileList?.length) return
    const incoming = Array.from(fileList)
    const next = mergePendingFiles(pendingFiles, incoming)

    if (next.length === pendingFiles.length) return

    setPendingFiles(next)
    if (inputRef.current) inputRef.current.value = ''

    if (!analyzing) {
      void startAnalysis(next)
    }
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function openNewRfpUpload() {
    setPendingFiles([])
    setUploadMode(true)
    if (inputRef.current) inputRef.current.value = ''
  }

  function selectProject(id: string) {
    setActiveProjectId(id)
    setUploadMode(false)
  }

  async function deleteProject(id: string) {
    const res = await deleteDealDeskProjectAction(id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id)
      if (next.length === 0) {
        setActiveProjectId(null)
        setUploadMode(false)
        return []
      }
      if (activeProjectId === id) {
        setActiveProjectId(next[next.length - 1]!.id)
      }
      return next
    })
    toast.message('Projekt entfernt.')
  }

  function renameProject(id: string, name: string) {
    updateProject(id, (p) => ({ ...p, projectName: name }))
  }

  async function removeProjectDocument(projectId: string, fileName: string) {
    const res = await removeDealDeskDocumentAction(projectId, fileName)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    await reloadProject(projectId)
    toast.success('Dokument aus dem Projekt entfernt.')
  }

  async function handleResetDemo() {
    const res = await resetDealDeskDemoForOrg()
    if (!res.success) {
      toast.error(res.error)
      return
    }
    skipPersistRef.current = true
    const listRes = await listDealDeskProjects()
    if (listRes.success) {
      setProjects(listRes.projects)
      setActiveProjectId(listRes.projects[0]?.id ?? null)
    }
    skipPersistRef.current = false
    toast.success('Deal Desk Demo zurückgesetzt.')
  }

  function assignBidRole(role: BidTeamRoleKey, member: BidTeamMember) {
    if (!activeProject) return
    updateProject(activeProject.id, (p) => ({
      ...p,
      bidTeam: p.bidTeam.map((row) =>
        row.role === role
          ? {
              ...row,
              assigneeId: member.id,
              assigneeName: member.email ?? member.name,
            }
          : row
      ),
    }))
  }

  const uploadZone = (
    <>
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
          onClick={(e) => {
            if (analyzing) return
            if ((e.target as HTMLElement).closest('button')) return
            inputRef.current?.click()
          }}
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
            onChange={(e) => {
              onFilesPick(e.target.files)
              e.target.value = ''
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {analyzing ? (
            <>
              <Loader2 className="size-10 animate-spin text-blue-600" aria-hidden />
              <p className="mt-4 text-sm font-medium text-foreground">
                {analyzeStatus ??
                  (pendingFiles.length > 1
                    ? `${pendingFiles.length} Dokumente werden analysiert …`
                    : 'RFP wird analysiert …')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {analyzeStatus?.includes('OCR') || analyzeStatus === RFP_SCAN_OCR_STATUS
                  ? RFP_SCAN_OCR_STATUS
                  : 'Extraktion, ggf. OCR bei Scan-PDFs, Anforderungen und Referenz-Matching'}
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
              <div className="flex flex-wrap items-center justify-center gap-2">
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
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPendingFiles([])
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Liste leeren
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-left text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden />
          <p>
            <span className="font-medium text-foreground">Scan-PDFs:</span> {RFP_SCAN_PDF_HINT}{' '}
            Kein manueller DOCX-Umweg nötig.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          PDF, Word (DOCX) und Excel werden ausgelesen — echte Anforderungen, Red Flags und Referenz-Matches
          (OPENAI_API_KEY erforderlich).
        </p>
    </>
  )

  if (loadingDesk) {
    return (
      <div className={cn(DESK_LAYOUT_CLASS, 'flex min-h-[320px] items-center justify-center')}>
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }

  if (projects.length === 0) {
    return <div className={DESK_LAYOUT_CLASS}>{uploadZone}</div>
  }

  if (!activeProject) {
    return (
      <div className={cn(DESK_LAYOUT_CLASS, 'flex min-h-[320px] items-center justify-center')}>
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }

  const analysis = activeProject.analysis
  const redFlags = activeProject.redFlags
  const smeRoutes = activeProject.smeRoutes
  const decision = activeProject.decision
  const bidTeam = activeProject.bidTeam

  return (
    <div className={cn(DESK_LAYOUT_CLASS, 'pb-8')}>
      <DealDeskProjectHeader
        projects={projects}
        activeProject={activeProject}
        showDemoBadge={
          activeProject.showDemoBadge || process.env.NEXT_PUBLIC_DEAL_DESK_DEMO === '1'
        }
        canResetDemo={canResetDemo}
        onResetDemo={handleResetDemo}
        onSelectProject={selectProject}
        onDeleteProject={(id) => void deleteProject(id)}
        onRenameProject={renameProject}
        onRemoveDocument={(projectId, fileName) => void removeProjectDocument(projectId, fileName)}
        onNewRfp={openNewRfpUpload}
        onReanalyze={() => void rerunAnalysis(activeProject.id)}
        reanalyzing={analyzing}
        canReanalyze={activeProject.analysis.documentNames.length > 0}
        fileIcon={fileIcon}
      />

      {activeProject.analysisStatus === 'failed' && activeProject.errorMessage ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-medium text-destructive">Letzte Analyse fehlgeschlagen</p>
          <p className="mt-1 text-sm text-muted-foreground">{activeProject.errorMessage}</p>
          {isLikelyScanExtractionError(activeProject.errorMessage) ? (
            <p className="mt-2 text-xs text-muted-foreground">{RFP_SCAN_PDF_HINT}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            disabled={analyzing}
            onClick={() => void rerunAnalysis(activeProject.id)}
          >
            {analyzing ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden />
            )}
            Analyse erneut starten
          </Button>
        </div>
      ) : null}

      {uploadMode ? <div className="space-y-4">{uploadZone}</div> : null}

      {!uploadMode ? (

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
          <TabsTrigger value="incubator" className="gap-1.5">
            <Sprout className="size-3.5" />
            Referenz Inkubator
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
                  </div>
                </CardContent>
              </Card>

              <RedFlagsPanel
                flags={redFlags}
                projectId={activeProject.id}
                onFlagsChange={(flags) =>
                  updateProject(activeProject.id, (p) => ({ ...p, redFlags: flags }))
                }
                className={TAB_CARD_CLASS}
              />

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
                            const row = bidTeam.find((b) => b.role === def.key)
                            if (!row) return null
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
                            updateProject(activeProject.id, (p) => ({ ...p, decision: 'go' }))
                            void logDealDeskGoAction(activeProject.id)
                            setBidTeamOpen(false)
                            toast.success('Bid-Team gespeichert.')
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
                        updateProject(activeProject.id, (p) => ({ ...p, decision: 'no-bid' }))
                        void logDealDeskNoBidAction(activeProject.id)
                        toast.message('NO-BID dokumentiert.')
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
                    {(analysis.draftRows ?? []).map((row) => (
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
                {(analysis.smeTasks ?? []).map((task) => (
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
                      onValueChange={(v) => {
                        updateProject(activeProject.id, (p) => ({
                          ...p,
                          smeRoutes: { ...p.smeRoutes, [task.id]: v },
                        }))
                        void logDealDeskSmeRouteAction(activeProject.id, {
                          taskId: task.id,
                          route: v,
                        })
                      }}
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

          <TabsContent value="incubator" forceMount className={TAB_PANEL_CLASS}>
            <ReferenceIncubatorTab projectId={activeProject.id} analysis={analysis} />
          </TabsContent>
        </div>
      </Tabs>
      ) : null}
    </div>
  )
}
