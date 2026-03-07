'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  Building2Icon,
  Wallet,
  Trophy,
  ShieldAlert,
  Settings,
  Users,
  Plus,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  Star,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type {
  CompanyStrategyRow,
  StakeholderRow,
  StakeholderRole,
  CompanyRefRow,
  RoadmapProjectRow,
  RecommendedReference,
} from './actions'
import {
  upsertCompanyStrategy,
  getStakeholders,
  createStakeholder,
  deleteStakeholder,
  getRoadmapProjects,
  upsertRoadmapProject,
  deleteRoadmapProject,
  getRecommendedReferences,
  getReferencesForOrg,
} from './actions'
import { createSharedPortfolio, getExistingShareForReference, getReferencesByIds } from '../actions'
import type { ReferenceRow } from '../actions'
import { ReferenceReader } from '../reference-reader'

const STAKEHOLDER_ROLE_CONFIG: Record<
  StakeholderRole,
  { label: string; Icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  economic_buyer: {
    label: 'Economic Buyer',
    Icon: Wallet,
    className: 'text-amber-500',
  },
  champion: {
    label: 'Champion',
    Icon: Trophy,
    className: 'text-emerald-500',
  },
  blocker: {
    label: 'Blocker',
    Icon: ShieldAlert,
    className: 'text-rose-500',
  },
  technical_buyer: {
    label: 'Technical Buyer',
    Icon: Settings,
    className: 'text-slate-500',
  },
  user_buyer: {
    label: 'User Buyer',
    Icon: Users,
    className: 'text-blue-500',
  },
}

type Company = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
}

type Props = {
  company: Company
  strategy: CompanyStrategyRow | null
  stakeholders: StakeholderRow[]
  references: CompanyRefRow[]
  roadmapProjects: RoadmapProjectRow[]
}

export function CompanyDetailClient({
  company,
  strategy: initialStrategy,
  stakeholders: initialStakeholders,
  references,
  roadmapProjects: initialRoadmapProjects,
}: Props) {
  const [strategy, setStrategy] = useState(initialStrategy)
  const [goals, setGoals] = useState(initialStrategy?.company_goals ?? '')
  const [redFlags, setRedFlags] = useState(initialStrategy?.red_flags ?? '')
  const [competition, setCompetition] = useState(initialStrategy?.competition ?? '')
  const [nextSteps, setNextSteps] = useState(initialStrategy?.next_steps ?? '')
  const [strategySaving, setStrategySaving] = useState(false)
  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [stakeholderModalOpen, setStakeholderModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newRole, setNewRole] = useState<StakeholderRole>('champion')
  const [stakeholderSaving, setStakeholderSaving] = useState(false)
  const [roadmapProjects, setRoadmapProjects] = useState(initialRoadmapProjects)
  const [roadmapModalOpen, setRoadmapModalOpen] = useState(false)
  const [roadmapSaving, setRoadmapSaving] = useState(false)
  const [editingProject, setEditingProject] = useState<RoadmapProjectRow | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectValue, setProjectValue] = useState('')
  const [projectStatus, setProjectStatus] = useState('')
  const [projectTargetDate, setProjectTargetDate] = useState('')
  const [projectTags, setProjectTags] = useState('')
  const [recommendPopoverProjectId, setRecommendPopoverProjectId] = useState<string | null>(null)
  const [recommendedRefs, setRecommendedRefs] = useState<RecommendedReference[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [showAllRefsFallback, setShowAllRefsFallback] = useState(false)
  const [shareForRefs, setShareForRefs] = useState<{ ids: string[]; titles: string[] } | null>(null)
  const [shareLinkUrl, setShareLinkUrl] = useState<string | null>(null)
  const [shareLinkLoading, setShareLinkLoading] = useState(false)
  const [shareLinkGenerateLoading, setShareLinkGenerateLoading] = useState(false)
  const [sharePreviewRefs, setSharePreviewRefs] = useState<ReferenceRow[]>([])
  const [selectedRecommendRefIds, setSelectedRecommendRefIds] = useState<Set<string>>(new Set())

  const handleSaveStrategy = async () => {
    setStrategySaving(true)
    try {
      const res = await upsertCompanyStrategy(company.id, {
        company_goals: goals || null,
        red_flags: redFlags || null,
        competition: competition || null,
        next_steps: nextSteps || null,
      })
      if (res.success) {
        setStrategy((prev) => ({
          ...(prev ?? { id: '', company_id: company.id, updated_at: null }),
          company_goals: goals || null,
          red_flags: redFlags || null,
          competition: competition || null,
          next_steps: nextSteps || null,
        }))
        toast.success('Strategie gespeichert.')
      } else {
        toast.error(res.error ?? 'Speichern fehlgeschlagen.')
      }
    } catch {
      toast.error('Verbindungsfehler. Bitte erneut versuchen.')
    } finally {
      setStrategySaving(false)
    }
  }

  const openRoadmapModal = (project?: RoadmapProjectRow) => {
    if (project) {
      setEditingProject(project)
      setProjectName(project.project_name)
      setProjectValue(project.estimated_value ?? '')
      setProjectStatus(project.status ?? '')
      setProjectTargetDate(project.target_date ? project.target_date.slice(0, 10) : '')
      setProjectTags(project.tags ?? '')
    } else {
      setEditingProject(null)
      setProjectName('')
      setProjectValue('')
      setProjectStatus('')
      setProjectTargetDate('')
      setProjectTags('')
    }
    setRoadmapModalOpen(true)
  }

  const handleSaveRoadmapProject = async () => {
    if (!projectName.trim()) return
    setRoadmapSaving(true)
    try {
      const res = await upsertRoadmapProject(company.id, {
        ...(editingProject?.id && { id: editingProject.id }),
        project_name: projectName.trim(),
        estimated_value: projectValue.trim() || null,
        status: projectStatus.trim() || null,
        target_date: projectTargetDate || null,
        tags: projectTags.trim() || null,
      })
      if (res.success) {
        const list = await getRoadmapProjects(company.id)
        setRoadmapProjects(list)
        setRoadmapModalOpen(false)
        setEditingProject(null)
        setProjectName('')
        setProjectValue('')
        setProjectStatus('')
        setProjectTargetDate('')
        setProjectTags('')
        toast.success(editingProject ? 'Projekt aktualisiert.' : 'Projekt hinzugefügt.')
      } else {
        toast.error(res.error ?? 'Speichern fehlgeschlagen.')
      }
    } catch {
      toast.error('Verbindungsfehler. Bitte erneut versuchen.')
    } finally {
      setRoadmapSaving(false)
    }
  }

  const handleDeleteRoadmapProject = async (id: string) => {
    try {
      const res = await deleteRoadmapProject(id)
      if (res.success) {
        setRoadmapProjects((prev) => prev.filter((p) => p.id !== id))
        toast.success('Projekt entfernt.')
      } else {
        toast.error(res.error ?? 'Löschen fehlgeschlagen.')
      }
    } catch {
      toast.error('Verbindungsfehler. Bitte erneut versuchen.')
    }
  }

  useEffect(() => {
    if (!recommendPopoverProjectId) {
      setRecommendedRefs([])
      setShowAllRefsFallback(false)
      return
    }
    setShowAllRefsFallback(false)
    setLoadingRecommendations(true)
    getRecommendedReferences(recommendPopoverProjectId)
      .then(setRecommendedRefs)
      .finally(() => setLoadingRecommendations(false))
  }, [recommendPopoverProjectId])

  useEffect(() => {
    if (!recommendPopoverProjectId) setSelectedRecommendRefIds(new Set())
  }, [recommendPopoverProjectId])

  useEffect(() => {
    if (!shareForRefs?.ids.length) {
      setShareLinkUrl(null)
      setSharePreviewRefs([])
      return
    }
    setShareLinkLoading(true)
    if (shareForRefs.ids.length === 1) {
      getExistingShareForReference(shareForRefs.ids[0])
        .then((existing) => setShareLinkUrl(existing?.url ?? null))
        .finally(() => setShareLinkLoading(false))
    } else {
      setShareLinkUrl(null)
      setShareLinkLoading(false)
    }
    getReferencesByIds(shareForRefs.ids).then(setSharePreviewRefs)
  }, [shareForRefs?.ids?.join(',')])

  const handleShowAllReferences = async () => {
    setLoadingRecommendations(true)
    const list = await getReferencesForOrg(10)
    setRecommendedRefs(list)
    setShowAllRefsFallback(true)
    setLoadingRecommendations(false)
  }

  const toggleRecommendRefSelection = (id: string) => {
    setSelectedRecommendRefIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openShareForSelectedRefs = () => {
    const ids = Array.from(selectedRecommendRefIds)
    if (!ids.length) return
    const titles = ids.map((id) => recommendedRefs.find((r) => r.id === id)?.title ?? '')
    setShareForRefs({ ids, titles })
    setRecommendPopoverProjectId(null)
    setSelectedRecommendRefIds(new Set())
  }

  const handleAddStakeholder = async () => {
    if (!newName.trim()) return
    setStakeholderSaving(true)
    const res = await createStakeholder(company.id, {
      name: newName.trim(),
      title: newTitle.trim() || null,
      role: newRole,
    })
    setStakeholderSaving(false)
    if (res.success) {
      const list = await getStakeholders(company.id)
      setStakeholders(list)
      setStakeholderModalOpen(false)
      setNewName('')
      setNewTitle('')
      setNewRole('champion')
      toast.success('Stakeholder hinzugefügt.')
    } else toast.error(res.error)
  }

  const handleDeleteStakeholder = async (id: string) => {
    const { deleteStakeholder: del } = await import('./actions')
    const res = await del(id)
    if (res.success) {
      setStakeholders((prev) => prev.filter((s) => s.id !== id))
      toast.success('Stakeholder entfernt.')
    } else toast.error(res.error)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        {company.logo_url ? (
          <div className="relative size-16 shrink-0 rounded-lg border bg-muted overflow-hidden">
            <Image
              src={company.logo_url}
              alt=""
              fill
              className="object-contain"
              sizes="64px"
            />
          </div>
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border bg-muted">
            <Building2Icon className="size-8 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          {company.industry && (
            <p className="text-sm text-muted-foreground mt-0.5">{company.industry}</p>
          )}
          {company.headquarters && (
            <p className="text-sm text-muted-foreground">{company.headquarters}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="roadmap" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="roadmap">Opportunity Roadmap</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholder-Mapping</TabsTrigger>
          <TabsTrigger value="references">Referenz-Archiv</TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap" className="mt-6 space-y-6">
          {/* Unternehmens-Ziele (Goals) – klare Trennung von der Roadmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Unternehmens-Ziele & Strategie</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ziele, Risiken und nächste Schritte für diesen Account.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Unternehmensziele (Was wollen sie erreichen?)</Label>
                <Textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="Ziele des Unternehmens …"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Red Flags (Risiken im Deal)</Label>
                <Textarea
                  value={redFlags}
                  onChange={(e) => setRedFlags(e.target.value)}
                  placeholder="Risiken notieren …"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Wettbewerb (Wer funkt uns dazwischen?)</Label>
                <Textarea
                  value={competition}
                  onChange={(e) => setCompetition(e.target.value)}
                  placeholder="Wettbewerber …"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Nächste Schritte</Label>
                <Textarea
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  placeholder="Konkrete nächste Schritte …"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <Button onClick={handleSaveStrategy} disabled={strategySaving}>
                {strategySaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {strategySaving ? 'Speichern…' : 'Strategie speichern'}
              </Button>
            </CardContent>
          </Card>

          {/* Opportunity Roadmap – Projekte mit project_name, estimated_value, status, target_date */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg">Opportunity Roadmap</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Projekte und Pipeline mit Name, Wert, Status und Zieltermin.
                </p>
              </div>
              <Button size="sm" onClick={() => openRoadmapModal()}>
                <Plus className="size-4 mr-2" />
                Projekt hinzufügen
              </Button>
            </CardHeader>
            <CardContent>
              {roadmapProjects.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Noch keine Projekte in der Roadmap. Klicke auf „Projekt hinzufügen“.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Projekt</th>
                        <th className="pb-2 pr-4 font-medium">Wert</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 pr-4 font-medium">Zieltermin</th>
                        <th className="w-8 pb-2" />
                        <th className="w-10 pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {roadmapProjects.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{p.project_name}</td>
                          <td className="py-3 pr-4">{p.estimated_value ?? '—'}</td>
                          <td className="py-3 pr-4">{p.status ?? '—'}</td>
                          <td className="py-3 pr-4">
                            {p.target_date
                              ? new Date(p.target_date).toLocaleDateString('de-DE', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : '—'}
                          </td>
                          <td className="py-3 pr-2">
                            <Popover
                              open={recommendPopoverProjectId === p.id}
                              onOpenChange={(open) => setRecommendPopoverProjectId(open ? p.id : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Passende Referenzen finden"
                                >
                                  <Sparkles className="size-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-3" align="start">
                                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
                                  Passende Referenzen
                                </p>
                                {loadingRecommendations ? (
                                  <p className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                                    <Loader2 className="size-4 animate-spin" /> Wird gesucht…
                                  </p>
                                ) : recommendedRefs.length === 0 && !showAllRefsFallback ? (
                                  <div className="space-y-2 py-2">
                                    <p className="text-muted-foreground text-sm">
                                      Noch keine exakten Matches gefunden – alle Referenzen anzeigen?
                                    </p>
                                    <Button variant="outline" size="sm" onClick={handleShowAllReferences}>
                                      Alle Referenzen anzeigen
                                    </Button>
                                  </div>
                                ) : recommendedRefs.length === 0 ? (
                                  <p className="text-muted-foreground py-2 text-sm">
                                    Keine Referenzen vorhanden.
                                  </p>
                                ) : (
                                  <TooltipProvider delayDuration={300}>
                                    <ul className="space-y-2">
                                      {recommendedRefs.map((ref) => {
                                        const score = ref.score ?? 0
                                        const scoreBadgeClass =
                                          score > 80
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
                                            : score >= 50
                                              ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200'
                                              : 'text-muted-foreground border-muted-foreground/30 bg-muted/50'
                                        const tooltipParts = [
                                          `Branche: ${ref.matchReasons?.industry ? '✓' : '—'}`,
                                          `Thema: ${ref.matchReasons?.tags ? '✓' : '—'}`,
                                          `Größe/Region: ${ref.matchReasons?.sizeRegion ? '✓' : '—'}`,
                                        ]
                                        const isSelected = selectedRecommendRefIds.has(ref.id)
                                        return (
                                          <li
                                            key={ref.id}
                                            className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-2"
                                          >
                                            <div
                                              className="flex cursor-pointer items-start gap-2"
                                              onClick={() => toggleRecommendRefSelection(ref.id)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                  e.preventDefault()
                                                  toggleRecommendRefSelection(ref.id)
                                                }
                                              }}
                                              role="button"
                                              tabIndex={0}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleRecommendRefSelection(ref.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="size-4 shrink-0 rounded border-muted-foreground/50 mt-0.5 accent-primary"
                                                aria-label={ref.title}
                                              />
                                              <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                  <span className="font-medium text-sm leading-tight">{ref.title}</span>
                                                  {score > 0 && (
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Badge
                                                          variant="outline"
                                                          className={`shrink-0 text-[10px] font-medium ${scoreBadgeClass}`}
                                                        >
                                                          {score}%
                                                        </Badge>
                                                      </TooltipTrigger>
                                                      <TooltipContent side="top" className="text-xs">
                                                        Warum dieses Match? ({tooltipParts.join(', ')})
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  )}
                                                  {score > 90 && (
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-500" />
                                                      </TooltipTrigger>
                                                      <TooltipContent side="top" className="text-xs">
                                                        Top Empfehlung
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  )}
                                                </div>
                                                {ref.company_name && (
                                                  <p className="text-muted-foreground mt-0.5 text-xs">{ref.company_name}</p>
                                                )}
                                              </div>
                                            </div>
                                          </li>
                                        )
                                      })}
                                    </ul>
                                    <Button
                                      className="mt-3 w-full"
                                      size="sm"
                                      disabled={selectedRecommendRefIds.size === 0}
                                      onClick={openShareForSelectedRefs}
                                    >
                                      <LinkIcon className="mr-2 size-4" />
                                      {selectedRecommendRefIds.size === 0
                                        ? 'Referenzen auswählen'
                                        : selectedRecommendRefIds.size === 1
                                          ? '1 ausgewählte Referenz teilen'
                                          : `${selectedRecommendRefIds.size} ausgewählte Referenzen teilen`}
                                    </Button>
                                  </TooltipProvider>
                                )}
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => openRoadmapModal(p)}
                              >
                                Bearbeiten
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => handleDeleteRoadmapProject(p.id)}
                              >
                                Löschen
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal: Projekt hinzufügen / bearbeiten */}
          <Dialog open={roadmapModalOpen} onOpenChange={setRoadmapModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? 'Projekt bearbeiten' : 'Projekt hinzufügen'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Projektname</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="z. B. Cloud-Migration Phase 2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Geschätzter Wert</Label>
                  <Input
                    value={projectValue}
                    onChange={(e) => setProjectValue(e.target.value)}
                    placeholder="z. B. 500.000 €"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Input
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value)}
                    placeholder="z. B. Pipeline, Verhandlung, Gewonnen"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zieltermin</Label>
                  <Input
                    type="date"
                    value={projectTargetDate}
                    onChange={(e) => setProjectTargetDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Themen-Tags (für passende Referenzen)</Label>
                  <Input
                    value={projectTags}
                    onChange={(e) => setProjectTags(e.target.value)}
                    placeholder="z. B. Cloud, SAP, Migration (kommagetrennt)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRoadmapModalOpen(false)}>
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSaveRoadmapProject}
                  disabled={!projectName.trim() || roadmapSaving}
                >
                  {roadmapSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  {roadmapSaving ? 'Speichern…' : editingProject ? 'Speichern' : 'Hinzufügen'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Share-Link-Dialog (eine oder mehrere Referenzen → Kundenlink) */}
          <Dialog open={!!shareForRefs?.ids?.length} onOpenChange={(open) => !open && setShareForRefs(null)}>
            <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Kundenlink erstellen</DialogTitle>
                {shareForRefs && (
                  <p className="text-sm text-muted-foreground font-normal">
                    {shareForRefs.ids.length === 1
                      ? shareForRefs.titles[0]
                      : `${shareForRefs.ids.length} Referenzen im Paket`}
                  </p>
                )}
              </DialogHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-4 py-2">
                {sharePreviewRefs.length > 0 && (
                  <div className="rounded-lg border bg-muted/20 p-2">
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
                      Vorschau (scrollbar)
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                      {sharePreviewRefs.map((r) => (
                        <ReferenceReader key={r.id} ref={r} />
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {shareLinkLoading ? (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Loader2 className="size-4 animate-spin" /> Wird geladen…
                    </p>
                  ) : shareLinkUrl ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(shareLinkUrl!)
                          toast.success('Link in Zwischenablage kopiert')
                        } catch {
                          toast.error('Kopieren fehlgeschlagen')
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigator.clipboard.writeText(shareLinkUrl!).then(
                            () => toast.success('Link in Zwischenablage kopiert'),
                            () => toast.error('Kopieren fehlgeschlagen')
                          )
                        }
                      }}
                      className="bg-muted/50 hover:bg-muted border-muted-foreground/20 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                      title="Klicken zum Kopieren"
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-foreground">{shareLinkUrl}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">Klicken zum Kopieren</span>
                    </div>
                  ) : shareForRefs?.ids?.length ? (
                    <Button
                      disabled={shareLinkGenerateLoading}
                      onClick={async () => {
                        setShareLinkGenerateLoading(true)
                        try {
                          const result = await createSharedPortfolio(shareForRefs.ids)
                          if (result.success) {
                            setShareLinkUrl(result.url)
                            toast.success('Kundenlink erstellt')
                          } else {
                            toast.error(result.error ?? 'Erstellen fehlgeschlagen')
                          }
                        } finally {
                          setShareLinkGenerateLoading(false)
                        }
                      }}
                    >
                      {shareLinkGenerateLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <LinkIcon className="mr-2 size-4" />}
                      Link generieren
                    </Button>
                  ) : null}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="stakeholders" className="mt-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-sm text-muted-foreground">
              Schachfiguren im Deal – Rollen und Ansprechpartner.
            </p>
            <Button onClick={() => setStakeholderModalOpen(true)} size="sm">
              <Plus className="size-4 mr-2" />
              Stakeholder hinzufügen
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stakeholders.map((s) => {
              const config = STAKEHOLDER_ROLE_CONFIG[s.role]
              const Icon = config.Icon
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`size-5 shrink-0 ${config.className}`} />
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{s.name}</CardTitle>
                          {s.title && (
                            <p className="text-xs text-muted-foreground truncate">{s.title}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteStakeholder(s.id)}
                        aria-label="Stakeholder entfernen"
                      >
                        ×
                      </Button>
                    </div>
                    <span className={`text-xs font-medium ${config.className}`}>
                      {config.label}
                    </span>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
          {stakeholders.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Noch keine Stakeholder angelegt. Klicke auf „Stakeholder hinzufügen“.
            </p>
          )}

          <Dialog open={stakeholderModalOpen} onOpenChange={setStakeholderModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Stakeholder hinzufügen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Titel / Rolle im Unternehmen</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="z. B. CIO, Abteilungsleiter"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rolle im Deal</Label>
                  <Select
                    value={newRole}
                    onValueChange={(v) => setNewRole(v as StakeholderRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STAKEHOLDER_ROLE_CONFIG) as StakeholderRole[]).map(
                        (role) => (
                          <SelectItem key={role} value={role}>
                            {STAKEHOLDER_ROLE_CONFIG[role].label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStakeholderModalOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleAddStakeholder} disabled={!newName.trim() || stakeholderSaving}>
                  {stakeholderSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  {stakeholderSaving ? 'Wird hinzugefügt…' : 'Hinzufügen'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="references" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Projekte & Referenzen</CardTitle>
              <p className="text-sm text-muted-foreground">
                Alle dieser Firma zugeordneten Referenzen.
              </p>
            </CardHeader>
            <CardContent>
              {references.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Keine Referenzen für diese Firma.
                </p>
              ) : (
                <ul className="divide-y">
                  {references.map((ref) => (
                    <li key={ref.id} className="py-3 first:pt-0 last:pb-0">
                      <Link
                        href="/dashboard"
                        className="text-primary hover:underline font-medium"
                      >
                        {ref.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{ref.status}</span>
                        {ref.project_status && <span>· {ref.project_status}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
