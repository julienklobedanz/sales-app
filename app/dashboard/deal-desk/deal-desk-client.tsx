'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Clock,
  FileSpreadsheet,
  FileText,
  FileType,
  Info,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Sparkles,
  Sprout,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { SME_ROUTE_OPTIONS } from '@/lib/deal-desk/mock-analysis'
import { projectToWorkspaceState } from '@/lib/deal-desk/project-mapper'
import {
  buildHeroKeyTakeaways,
  recommendationBadgeClass,
} from '@/lib/deal-desk/hero-key-takeaways'
import {
  winProbabilityRecommendationLabel,
  winProbabilityScoreLegend,
  winProbabilityTone,
} from '@/lib/deal-desk/win-probability'
import {
  defaultProjectNameFromFiles,
  type DealDeskProject,
} from '@/lib/deal-desk/deal-desk-project'
import {
  createDealDeskProjectAction,
  deleteDealDeskProjectAction,
  getDealDeskProject,
  listDealDeskProjects,
  logDealDeskSmeRouteAction,
  removeDealDeskDocumentAction,
  resetDealDeskDemoForOrg,
  runDealDeskDemoAnalyzeAction,
  updateDealDeskProjectAction,
} from './actions'
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
      const listRes = await listDealDeskProjects()
      if (listRes.success) {
        setProjects(listRes.projects)
        if (listRes.projects[0]) setActiveProjectId(listRes.projects[0].id)
      } else {
        toast.error(listRes.error)
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

  const appendDocuments = useCallback(
    async (projectId: string, incoming: File[]) => {
      if (analyzing) return
      const valid = incoming.filter(isAcceptedRfpFile)
      if (valid.length === 0) {
        toast.error('Bitte PDF, Word (DOC/DOCX) oder Excel (XLS/XLSX) hochladen.')
        return
      }

      const project = projects.find((p) => p.id === projectId)
      const existingCount = project?.analysis.documentNames.length ?? 0
      if (existingCount + valid.length > MAX_RFP_FILES) {
        toast.error(`Maximal ${MAX_RFP_FILES} Dokumente pro Projekt.`)
        return
      }

      setAnalyzing(true)
      setAnalyzeStatus(
        valid.length > 1
          ? `${valid.length} Dokumente werden hinzugefügt und analysiert …`
          : 'Dokument wird hinzugefügt und analysiert …'
      )

      try {
        const formData = new FormData()
        formData.set('projectId', projectId)
        formData.set('append', '1')
        for (const file of valid) {
          formData.append('files', file)
        }

        const res = await fetch('/api/deal-desk/analyze', { method: 'POST', body: formData })
        const json = (await res.json()) as AnalyzeApiResult

        if (!res.ok || !json.success) {
          showAnalysisErrorToast(json.error ?? 'Dokumente konnten nicht hinzugefügt werden.', json.isScanLikely)
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
              ? 'Projekt mit neuen Dokumenten aktualisiert (Fallback-Demo).'
              : json.extractionUsedOcr
                ? `${valid.length} Dokument(e) hinzugefügt — Analyse abgeschlossen (OCR).`
                : `${valid.length} Dokument(e) hinzugefügt — Analyse abgeschlossen.`
        )
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Netzwerkfehler.')
      } finally {
        setAnalyzing(false)
        setAnalyzeStatus(null)
      }
    },
    [analyzing, projects, reloadProject]
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
  const showDemo =
    activeProject.showDemoBadge || process.env.NEXT_PUBLIC_DEAL_DESK_DEMO === '1'

  return (
    <div className={cn(DESK_LAYOUT_CLASS, 'pb-8')}>
      <DealDeskProjectHeader
        projects={projects}
        activeProject={activeProject}
        showDemoBadge={showDemo}
        canResetDemo={canResetDemo}
        onResetDemo={handleResetDemo}
        onSelectProject={selectProject}
        onDeleteProject={(id) => void deleteProject(id)}
        onRenameProject={renameProject}
        onRemoveDocument={(projectId, fileName) => void removeProjectDocument(projectId, fileName)}
        onAddDocuments={(files) => void appendDocuments(activeProject.id, files)}
        addingDocuments={analyzing}
        maxDocuments={MAX_RFP_FILES}
        acceptFileAttr={ACCEPT_ATTR}
        onNewRfp={openNewRfpUpload}
        onClose={openNewRfpUpload}
        onReanalyze={() => void rerunAnalysis(activeProject.id)}
        reanalyzing={analyzing}
        canReanalyze={activeProject.analysis.documentNames.length > 0}
        fileIcon={fileIcon}
      />

      {uploadMode ? <div className="space-y-4">{uploadZone}</div> : null}

      {!uploadMode ? (

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="w-full gap-4">
        <TabsList
          variant="line"
          className="h-auto w-full flex-wrap justify-start gap-0 rounded-none border-border bg-transparent p-0"
        >
          <TabsTrigger
            value="decision"
            className="gap-1.5 rounded-none px-3 py-2.5 after:bg-primary data-[state=active]:font-semibold data-[state=active]:text-foreground sm:px-4"
          >
            <LayoutDashboard className="size-3.5" />
            Bid-Übersicht
          </TabsTrigger>
          <TabsTrigger
            value="draft"
            className="gap-1.5 rounded-none px-3 py-2.5 after:bg-primary data-[state=active]:font-semibold data-[state=active]:text-foreground sm:px-4"
          >
            <Sparkles className="size-3.5" />
            Antwort-Entwürfe
          </TabsTrigger>
          <TabsTrigger
            value="sme"
            className="gap-1.5 rounded-none px-3 py-2.5 after:bg-primary data-[state=active]:font-semibold data-[state=active]:text-foreground sm:px-4"
          >
            <Clock className="size-3.5" />
            SME Routing
          </TabsTrigger>
          <TabsTrigger
            value="incubator"
            className="gap-1.5 rounded-none px-3 py-2.5 after:bg-primary data-[state=active]:font-semibold data-[state=active]:text-foreground sm:px-4"
          >
            <Sprout className="size-3.5" />
            Referenz Inkubator
          </TabsTrigger>
        </TabsList>

        <div className={TAB_STAGE_CLASS}>
          <TabsContent value="decision" forceMount className={TAB_PANEL_CLASS}>
            <div className="w-full space-y-6">
              {(() => {
                const winTone = winProbabilityTone(analysis.winProbability ?? 0)
                const heroTakeaways = buildHeroKeyTakeaways(analysis)

                return (
                  <Card className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
                    <CardContent className="flex w-full flex-col gap-6 p-6 lg:flex-row lg:items-start">
                      <div className="flex shrink-0 justify-center lg:justify-start">
                        <WinProbabilityGauge
                          value={analysis.winProbability ?? 0}
                          size={124}
                          showRecommendation={false}
                        />
                      </div>
                      <div className="min-w-0 flex-1 grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="space-y-3 lg:col-span-2">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    className={cn(
                                      'cursor-help rounded px-2.5 py-0.5 text-xs font-medium shadow-none',
                                      recommendationBadgeClass(winTone)
                                    )}
                                    tabIndex={0}
                                  >
                                    {winProbabilityRecommendationLabel(winTone)}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[240px] text-xs">
                                  {winProbabilityScoreLegend()}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Badge className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 shadow-none">
                              {analysis.icpFitLabel}
                            </Badge>
                          </div>
                          <h3 className="text-base font-semibold text-slate-900">
                            Strategischer Cloud- &amp; SAP-Match
                          </h3>
                          <p className="text-sm leading-relaxed text-zinc-600">{analysis.icpSummary}</p>
                        </div>
                        <div className="border-t border-slate-100 pt-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                          <ul className="space-y-2 text-xs font-medium text-slate-500">
                            {heroTakeaways.map((item) => (
                              <li key={item.text} className="flex gap-2 leading-snug">
                                <span className="shrink-0" aria-hidden>
                                  {item.icon}
                                </span>
                                <span>{item.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}

              <RedFlagsPanel
                flags={redFlags ?? []}
                projectId={activeProject.id}
                onFlagsChange={(flags) =>
                  updateProject(activeProject.id, (p) => ({ ...p, redFlags: flags }))
                }
                className={TAB_CARD_CLASS}
              />

              {(() => {
                const timelineItems = analysis.timelineItems ?? []
                const sortedItems = [...timelineItems]
                  .filter((it) => typeof it?.dueDate === 'string' && it.dueDate.length >= 10)
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

                const MS_DAY = 24 * 60 * 60 * 1000
                const now = new Date()
                now.setHours(0, 0, 0, 0)

                function formatDateDe(iso: string) {
                  const d = new Date(iso)
                  const dd = String(d.getDate()).padStart(2, '0')
                  const mm = String(d.getMonth() + 1).padStart(2, '0')
                  const yyyy = d.getFullYear()
                  return `${dd}.${mm}.${yyyy}`
                }

                function daysUntil(iso: string) {
                  const d = new Date(iso)
                  d.setHours(0, 0, 0, 0)
                  return Math.round((d.getTime() - now.getTime()) / MS_DAY)
                }

                return (
                  <Card className={TAB_CARD_CLASS}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Bid-Timeline / Fristen</CardTitle>
                      <CardDescription>
                        Aus dem RFP extrahierte Deadlines (Datum + Countdown).
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {sortedItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Keine konkreten Fristen/Deadlines im Dokument erkannt.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {sortedItems.map((it, idx) => (
                            <div
                              key={`${it.id}-${idx}`}
                              className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
                            >
                              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background">
                                <Clock className="size-4 text-muted-foreground" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">
                                  {formatDateDe(it.dueDate)} ({daysUntil(it.dueDate)} Tage): {it.title}
                                </p>
                                {it.evidence ? (
                                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                    Beleg: {it.evidence}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })()}

              {(() => {
                const draftRows = analysis.draftRows ?? []
                const missingReferenceCount = draftRows.filter((r) => !r.reference).length
                const missingAnswerCount = draftRows.filter((r) => Boolean(r.reference) && !r.answer).length

                const smeTasks = analysis.smeTasks ?? []
                const flags = redFlags ?? []
                const legalMarkedCount = flags.filter((f) => Boolean(f.markedForLegal)).length

                const criticalHigh = flags.filter(
                  (f) => f.severity === 'critical' || f.severity === 'high'
                ).length

                const sortedSme = [...smeTasks].sort(
                  (a, b) => (a.dueInDays ?? 99) - (b.dueInDays ?? 99)
                )

                const steps: Array<{ title: string; detail?: string; tab?: TabKey }> = []

                if (criticalHigh > 0) {
                  steps.push({
                    title:
                      legalMarkedCount > 0
                        ? 'Legal Review für markierte Risiken starten'
                        : 'Kritische/hohe Risiken für Legal markieren',
                    detail:
                      legalMarkedCount > 0
                        ? 'Nächster Schritt: Vertrags-Punkte prüfen und ggf. Ausschlüsse verhandeln.'
                        : 'Im „Red Flags“-Panel passende Punkte markieren und an Legal senden.',
                    tab: 'decision',
                  })
                }

                if (missingReferenceCount > 0) {
                  steps.push({
                    title: `Referenzen für ${missingReferenceCount} Anforderungen nachziehen`,
                    detail: 'Tab „Antwort-Entwürfe“ öffnen und fehlende Proofs ergänzen.',
                    tab: 'draft',
                  })
                }

                if (missingAnswerCount > 0) {
                  steps.push({
                    title: `Antworten für ${missingAnswerCount} passende Anforderungen vervollständigen`,
                    detail: 'Teilweise fehlen noch KI-Antworten — Referenzen prüfen und dann finalisieren.',
                    tab: 'draft',
                  })
                }

                for (const task of sortedSme.slice(0, 2)) {
                  steps.push({
                    title: `SME-Klärung: ${task.category}`,
                    detail: `${task.question} (Due: in ${task.dueInDays} Tagen)`,
                    tab: 'sme',
                  })
                  if (steps.length >= 5) break
                }

                if (steps.length < 5 && smeTasks.length > 0) {
                  steps.push({
                    title: 'SME-Routing finalisieren',
                    detail: 'Stelle sicher, dass alle offenen Aufgaben an die richtigen Rollen geleitet sind.',
                    tab: 'sme',
                  })
                }

                const stepsFinal = steps.slice(0, 5)

                return (
                  <Card className={TAB_CARD_CLASS}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Nächste Schritte (max. 5)</CardTitle>
                      <CardDescription>Aus den Red Flags, Lücken und SME-Aufgaben abgeleitet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stepsFinal.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Keine offenen To-dos gefunden. (Wenn Inhalte fehlen, prüfe Red Flags / Entwürfe.)
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {stepsFinal.map((s, idx) => (
                            <div
                              key={`${idx}-${s.title}`}
                              className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
                            >
                              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background">
                                <span className="text-sm font-bold text-muted-foreground">{idx + 1}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">{s.title}</p>
                                {s.detail ? (
                                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.detail}</p>
                                ) : null}
                              </div>
                              {s.tab ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-2"
                                  onClick={() => setActiveTab(s.tab!)}
                                >
                                  Öffnen
                                </Button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })()}
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
                                        {(row.reference.companyName ?? '?').slice(0, 2).toUpperCase()}
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
