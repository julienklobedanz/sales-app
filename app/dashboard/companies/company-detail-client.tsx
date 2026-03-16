'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Target,
  Radar,
  Map,
  TrendingUp,
  FileCheck,
  ExternalLink,
  Calendar,
  Newspaper,
  HelpCircle,
  Save,
  MapPin,
  Globe,
  Cpu,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DealSignalRow,
} from './actions'
import {
  upsertCompanyStrategy,
  getStakeholders,
  createStakeholder,
  updateStakeholder,
  deleteStakeholder,
  getRoadmapProjects,
  upsertRoadmapProject,
  deleteRoadmapProject,
  getRecommendedReferences,
  getReferencesForOrg,
  getRecommendedReferencesForAccount,
  updateCompanyAccountStatus,
  generateOnePagerHtml,
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
  unknown: {
    label: 'Unbekannt',
    Icon: HelpCircle,
    className: 'text-muted-foreground',
  },
}

type Company = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
  account_status?: string | null
}

type Props = {
  company: Company
  strategy: CompanyStrategyRow | null
  stakeholders: StakeholderRow[]
  references: CompanyRefRow[]
  roadmapProjects: RoadmapProjectRow[]
  expiringDeals: DealSignalRow[]
  recommendedRefs: RecommendedReference[]
}

const ACCOUNT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'at_risk', label: 'Account at Risk' },
  { value: 'warmup', label: 'Warm-up' },
  { value: 'expansion', label: 'Expansion' },
]

export function CompanyDetailClient({
  company: initialCompany,
  strategy: initialStrategy,
  stakeholders: initialStakeholders,
  references,
  roadmapProjects: initialRoadmapProjects,
  expiringDeals,
  recommendedRefs: initialRecommendedRefs,
}: Props) {
  const [company, setCompany] = useState(initialCompany)
  const [strategy, setStrategy] = useState(initialStrategy)
  const [goals, setGoals] = useState(initialStrategy?.company_goals ?? '')
  const [redFlags, setRedFlags] = useState(initialStrategy?.red_flags ?? '')
  const [valueProposition, setValueProposition] = useState(initialStrategy?.value_proposition ?? '')
  const [competition, setCompetition] = useState(initialStrategy?.competition ?? '')
  const [nextSteps, setNextSteps] = useState(initialStrategy?.next_steps ?? '')
  const [strategySaving, setStrategySaving] = useState(false)
  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [stakeholderModalOpen, setStakeholderModalOpen] = useState(false)
  const [editingStakeholder, setEditingStakeholder] = useState<StakeholderRow | null>(null)
  const [newName, setNewName] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newRole, setNewRole] = useState<StakeholderRole>('champion')
  const [newLinkedIn, setNewLinkedIn] = useState('')
  const [newPriorities, setNewPriorities] = useState('')
  const [newLastContact, setNewLastContact] = useState('')
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
  const [onePagerLoading, setOnePagerLoading] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [strategyStatus, setStrategyStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const intelligenceScore = useMemo(() => {
    let filled = 0
    const total = 8
    if ((goals || '').trim()) filled++
    if ((valueProposition || '').trim()) filled++
    if ((redFlags || '').trim()) filled++
    if (stakeholders.length > 0) filled++
    if (roadmapProjects.length > 0) filled++
    if (references.length > 0) filled++
    if (expiringDeals.length > 0 || true) filled++ // Market Signals: Platzhalter zählt
    if (company.account_status) filled++
    return Math.round((filled / total) * 100)
  }, [goals, valueProposition, redFlags, stakeholders.length, roadmapProjects.length, references.length, expiringDeals.length, company.account_status])

  const handleSaveStrategy = async () => {
    setStrategySaving(true)
    setStrategyStatus('saving')
    try {
      const res = await upsertCompanyStrategy(company.id, {
        company_goals: goals || null,
        red_flags: redFlags || null,
        competition: competition || null,
        next_steps: nextSteps || null,
        value_proposition: valueProposition || null,
      })
      if (res.success) {
        setStrategy((prev) => ({
          ...(prev ?? { id: '', company_id: company.id, updated_at: null, value_proposition: null }),
          company_goals: goals || null,
          red_flags: redFlags || null,
          competition: competition || null,
          next_steps: nextSteps || null,
          value_proposition: valueProposition || null,
        }))
        setStrategyStatus('saved')
      } else {
        setStrategyStatus('error')
        toast.error(res.error ?? 'Speichern fehlgeschlagen.')
      }
    } catch {
      setStrategyStatus('error')
      toast.error('Verbindungsfehler. Bitte erneut versuchen.')
    } finally {
      setStrategySaving(false)
    }
  }

  const handleAccountStatusChange = async (value: string | null) => {
    const status = value === 'at_risk' || value === 'warmup' || value === 'expansion' ? value : null
    setStatusSaving(true)
    try {
      const res = await updateCompanyAccountStatus(company.id, status)
      if (res.success) {
        setCompany((prev) => ({ ...prev!, account_status: status }))
        toast.success('Status aktualisiert.')
      } else toast.error(res.error)
    } finally {
      setStatusSaving(false)
    }
  }

  const openEditStakeholder = (s: StakeholderRow) => {
    setEditingStakeholder(s)
    setNewLinkedIn(s.linkedin_url ?? '')
    setNewPriorities(s.priorities_topics ?? '')
    setNewLastContact(s.last_contact_at ? s.last_contact_at.slice(0, 10) : '')
  }
  const saveStakeholderProfile = async () => {
    if (!editingStakeholder) return
    setStakeholderSaving(true)
    try {
      const res = await updateStakeholder(editingStakeholder.id, {
        linkedin_url: newLinkedIn || null,
        priorities_topics: newPriorities || null,
        last_contact_at: newLastContact || null,
      })
      if (res.success) {
        const list = await getStakeholders(company.id)
        setStakeholders(list)
        setEditingStakeholder(null)
        toast.success('Profil aktualisiert.')
      } else toast.error(res.error)
    } finally {
      setStakeholderSaving(false)
    }
  }

  const handleGenerateOnePager = async () => {
    setOnePagerLoading(true)
    try {
      const result = await generateOnePagerHtml(company.id)
      if (result.success && result.html) {
        const w = window.open('', '_blank')
        if (w) {
          w.document.write(result.html)
          w.document.close()
          w.focus()
          setTimeout(() => w.print(), 300)
        }
        toast.success('One-Pager geöffnet – Drucken oder als PDF speichern.')
      } else toast.error(result.error ?? 'Generierung fehlgeschlagen.')
    } catch {
      toast.error('One-Pager konnte nicht erstellt werden.')
    } finally {
      setOnePagerLoading(false)
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

  // Visuelles Sicherheitsnetz: User warnen, wenn ein Speichervorgang noch läuft
  useEffect(() => {
    if (strategyStatus !== 'saving') return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Einige Browser ignorieren den Text, das Setzen von returnValue reicht aus.
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [strategyStatus])

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
    <div className="space-y-8">
      {/* Header: Logo, Name, Status Badge, Intelligence Score */}
      <div className="flex flex-wrap items-start justify-between gap-4">
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
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
              {company.industry && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2 py-0.5">
                  <Cpu className="size-3" />
                  <span>{company.industry}</span>
                </span>
              )}
              {company.headquarters && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2 py-0.5">
                  <MapPin className="size-3" />
                  <span>{company.headquarters}</span>
                </span>
              )}
              {company.website_url && (
                <a
                  href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2 py-0.5 hover:bg-muted text-foreground"
                >
                  <Globe className="size-3" />
                  <span className="truncate max-w-[140px]">{company.website_url}</span>
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Select
            value={company.account_status ?? '__none__'}
            onValueChange={(v) => handleAccountStatusChange(v === '__none__' ? null : v)}
            disabled={statusSaving}
          >
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Status —</SelectItem>
              {ACCOUNT_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 hover:bg-muted transition-colors"
              >
                <Target className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Intelligence Score</span>
                <span className="text-lg font-semibold tabular-nums">{intelligenceScore}%</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Score Breakdown</span>
                <span className="text-[11px] text-muted-foreground">
                  {intelligenceScore}% vollständig
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${intelligenceScore}%` }}
                />
              </div>
              <ul className="space-y-1.5">
                {[
                  { label: 'Strategy', done: (goals || valueProposition || redFlags || competition || nextSteps).trim().length > 0 },
                  { label: 'Executive Radar', done: stakeholders.length > 0 },
                  { label: 'Relationship Map', done: stakeholders.length > 0 },
                  { label: 'Opportunity Roadmap', done: roadmapProjects.length > 0 },
                  { label: 'Proof Points', done: references.length > 0 },
                  { label: 'Market Signals', done: expiringDeals.length > 0 },
                  { label: 'Account Status', done: !!company.account_status },
                ].map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                    <span
                      className={`h-2 w-8 rounded-full ${
                        item.done ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                      }`}
                    />
                  </span>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Tabs defaultValue="strategy" className="w-full">
        <TabsList className="w-full flex flex-wrap justify-start gap-1 h-auto p-1">
          <TabsTrigger value="strategy" className="gap-1.5">
            <Target className="size-3.5" /> Strategy
          </TabsTrigger>
          <TabsTrigger value="executive" className="gap-1.5">
            <Radar className="size-3.5" /> Executive Radar
          </TabsTrigger>
          <TabsTrigger value="relationship" className="gap-1.5">
            <Map className="size-3.5" /> Relationship Map
          </TabsTrigger>
          <TabsTrigger value="signals" className="gap-1.5">
            <TrendingUp className="size-3.5" /> Market Signals
          </TabsTrigger>
          <TabsTrigger value="proof" className="gap-1.5">
            <FileCheck className="size-3.5" /> Proof Points
          </TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="mt-6 space-y-8">
          {/* Strategy: Ziele, Value Proposition, Herausforderungen */}
          <Card className="bg-muted/30 border-l-4 border-primary/40">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Strategy (Die Basis)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Unternehmensziele, Value Proposition und Herausforderungen.
                </p>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {strategyStatus === 'saving' && (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    <span>Speichert…</span>
                  </>
                )}
                {strategyStatus === 'saved' && !strategySaving && (
                  <span className="text-emerald-600">Gespeichert</span>
                )}
                {strategyStatus === 'error' && (
                  <span className="text-destructive">Fehler beim Speichern</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Unternehmensziele (Was wollen sie erreichen?)</Label>
                <div className="relative">
                  <Textarea
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    onBlur={handleSaveStrategy}
                    placeholder="z. B. Erhöhung der Cloud-Adoption um 20 % bis Q4; Reduktion der Time-to-Market für neue Produkte."
                    rows={3}
                    className="resize-none pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1.5 h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Value Proposition (Warum gewinnen wir hier?)</Label>
                <div className="relative">
                  <Textarea
                    value={valueProposition}
                    onChange={(e) => setValueProposition(e.target.value)}
                    onBlur={handleSaveStrategy}
                    placeholder="z. B. Wir verbinden unsere Branchen-Expertise mit einem skalierbaren Cloud-Stack und verkürzen so Projektlaufzeiten um 30 %."
                    rows={2}
                    className="resize-none pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1.5 h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Herausforderungen / Red Flags</Label>
                <div className="relative">
                  <Textarea
                    value={redFlags}
                    onChange={(e) => setRedFlags(e.target.value)}
                    onBlur={handleSaveStrategy}
                    placeholder="z. B. Starker Kostendruck, laufende Vendor-Konsolidierung, interne Skepsis ggü. Cloud-Migration."
                    rows={2}
                    className="resize-none pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1.5 h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Wettbewerb</Label>
                <div className="relative">
                  <Textarea
                    value={competition}
                    onChange={(e) => setCompetition(e.target.value)}
                    onBlur={handleSaveStrategy}
                    placeholder="z. B. Aktuell starker Footprint von Accenture und Deloitte, lokale Nischen-Player im Bereich Data & AI."
                    rows={2}
                    className="resize-none pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1.5 h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nächste Schritte</Label>
                <div className="relative">
                  <Textarea
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    onBlur={handleSaveStrategy}
                    placeholder="z. B. Executive Briefing im Q3 vorbereiten, Referenz-Call mit Kunde X organisieren, gemeinsames Cloud-Roadmap-Workshop anbieten."
                    rows={3}
                    className="resize-none pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1.5 h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline: Opportunity Roadmap (visuell) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg">Opportunity Roadmap (Timeline)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Projekte und Pipeline – visuell nach Zieltermin.
                </p>
              </div>
              <Button size="sm" onClick={() => openRoadmapModal()}>
                <Plus className="size-4 mr-2" />
                Projekt hinzufügen
              </Button>
            </CardHeader>
            <CardContent>
              {roadmapProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40">
                    <Target className="size-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Noch keine Projekte in der Roadmap.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-md">
                    Erfassen Sie strategische Initiativen, Pipeline-Projekte und Upsell-Chancen, um Ihren Account-Fokus klar zu visualisieren.
                  </p>
                  <Button className="mt-4" size="sm" onClick={() => openRoadmapModal()}>
                    <Plus className="size-4 mr-2" />
                    Projekt hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                  {roadmapProjects.map((p) => (
                    <div key={p.id} className="relative flex gap-4 pb-6 last:pb-0">
                      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background" />
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="font-medium">{p.project_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Wert: {p.estimated_value ?? '—'} · Status: {p.status ?? '—'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {p.target_date
                            ? new Date(p.target_date).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '—'}
                        </div>
                        <div className="flex items-center gap-1 mt-2">
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
                      </div>
                    </div>
                  ))}
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

        <TabsContent value="executive" className="mt-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-sm text-muted-foreground">
              Behalten Sie die wichtigsten Entscheider im Blick. Erhalten Sie tagesaktuelle News-Updates über sie und erstellen Sie per Klick ein fertiges Profiling für Ihre nächste Termin-Vorbereitung.
            </p>
            <Button onClick={() => setStakeholderModalOpen(true)} size="sm">
              <Plus className="size-4 mr-2" />
              Entscheider hinzufügen
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stakeholders.map((s) => {
              const config = STAKEHOLDER_ROLE_CONFIG[s.role]
              const Icon = config.Icon
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-lg font-medium">
                        {(s.name || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{s.name}</CardTitle>
                        {s.title && <p className="text-xs text-muted-foreground truncate">{s.title}</p>}
                        <span className={`text-xs font-medium ${config.className}`}>{config.label}</span>
                        {s.linkedin_url && (
                          <a
                            href={s.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="size-3" /> LinkedIn
                          </a>
                        )}
                        {s.priorities_topics && (
                          <p className="text-xs text-muted-foreground mt-1">Prioritäten: {s.priorities_topics}</p>
                        )}
                        <div className="mt-2 rounded border bg-muted/30 p-2 text-xs text-muted-foreground">
                          Tracking-Feed (Platzhalter – News/Updates später)
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditStakeholder(s)}>
                            Profil bearbeiten
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDeleteStakeholder(s.id)}
                          >
                            Entfernen
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
          {stakeholders.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Noch keine Entscheider angelegt. Klicke auf „Entscheider hinzufügen“.
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
                <div className="flex items-center gap-2">
                  <Label>Rolle im Deal</Label>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                          aria-label="Erklärung zu den Rollen"
                        >
                          <HelpCircle className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-relaxed">
                        <p className="font-semibold mb-1">Rollen im Deal</p>
                        <p><span className="font-semibold">Champion</span>: Treibt unser Projekt intern voran, öffnet Türen.</p>
                        <p><span className="font-semibold">Economic Buyer</span>: Entscheider über Budgets und Kaufentscheidung.</p>
                        <p><span className="font-semibold">Technical Buyer</span>: Prüft Anforderungen, Architektur und Integration.</p>
                        <p><span className="font-semibold">User Buyer</span>: Betroffene Nutzer / Fachbereiche im Alltag.</p>
                        <p><span className="font-semibold">Blocker</span>: Bremst oder stellt das Vorhaben in Frage.</p>
                        <p><span className="font-semibold">Unbekannt</span>: Rolle ist noch nicht klar eingeordnet.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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

          <Dialog open={!!editingStakeholder} onOpenChange={(open) => !open && setEditingStakeholder(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Profil bearbeiten</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>LinkedIn-URL</Label>
                  <Input
                    value={newLinkedIn}
                    onChange={(e) => setNewLinkedIn(e.target.value)}
                    placeholder="https://linkedin.com/in/…"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prioritäten / Themen</Label>
                  <Textarea
                    value={newPriorities}
                    onChange={(e) => setNewPriorities(e.target.value)}
                    placeholder="z. B. Digitalisierung, Cloud, Kostenreduktion"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Letzter Kontakt</Label>
                  <Input
                    type="date"
                    value={newLastContact}
                    onChange={(e) => setNewLastContact(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingStakeholder(null)}>Abbrechen</Button>
                <Button onClick={saveStakeholderProfile} disabled={stakeholderSaving}>
                  {stakeholderSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                  Speichern
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="relationship" className="mt-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-sm text-muted-foreground">
              Kontakte nach Status: Champion, Blocker, Neutral. Letzter Kontakt für Beziehungsintensität.
            </p>
            <Button onClick={() => setStakeholderModalOpen(true)} size="sm">
              <Plus className="size-4 mr-2" />
              Kontakt hinzufügen
            </Button>
          </div>
          <div className="space-y-6">
            {(['champion', 'blocker', 'economic_buyer', 'technical_buyer', 'user_buyer'] as const).map((role) => {
              const list = stakeholders.filter((s) => s.role === role)
              const config = STAKEHOLDER_ROLE_CONFIG[role]
              const Icon = config.Icon
              const groupLabel = role === 'economic_buyer' || role === 'technical_buyer' || role === 'user_buyer' ? 'Neutral' : config.label
              if (list.length === 0) return null
              return (
                <Card key={role}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Icon className={`size-4 ${config.className}`} />
                      {groupLabel}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {list.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          {s.title && <p className="text-xs text-muted-foreground">{s.title}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {s.last_contact_at ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="size-3" />
                              {new Date(s.last_contact_at).toLocaleDateString('de-DE')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Kein Kontakt</span>
                          )}
                          <Button variant="ghost" size="sm" className="h-7" onClick={() => openEditStakeholder(s)}>
                            Bearbeiten
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => handleDeleteStakeholder(s.id)}>×</Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          {stakeholders.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Noch keine Kontakte. Klicke auf „Kontakt hinzufügen“.
            </p>
          )}
        </TabsContent>

        <TabsContent value="signals" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="size-5" />
                Expiring Deals (Verträge laufen aus)
              </CardTitle>
              <CardDescription>
                Verträge bei diesem Kunden – eigene und von Wettbewerbern – mit Ablaufdatum.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expiringDeals.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Keine auslaufenden Deals für diesen Account.
                </p>
              ) : (
                <ul className="space-y-3">
                  {expiringDeals.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Ablauf: {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString('de-DE') : '—'}
                          {d.incumbent_provider && ` · Anbieter: ${d.incumbent_provider}`}
                          {d.volume && ` · ${d.volume}`}
                        </p>
                      </div>
                      <Badge variant="outline">{d.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Newspaper className="size-5" />
                Company News
              </CardTitle>
              <CardDescription>
                Quartalszahlen, Pressemeldungen (Platzhalter – Quellen werden später aus dem Internet gezogen).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                <Newspaper className="size-8 mx-auto mb-2 opacity-50" />
                <p>Company News werden hier als Zusammenfassung mit Quellen-Kapsel angezeigt.</p>
                <p className="mt-1 text-xs">Klick auf Quelle führt zur Originalmeldung.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proof" className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Beweis-Archiv (Referenzen) – priorisiert zu Strategy. Smart Match schlägt passende Referenzen vor.
            </p>
            <Button onClick={handleGenerateOnePager} disabled={onePagerLoading}>
              {onePagerLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <FileCheck className="size-4 mr-2" />}
              One-Pager generieren
            </Button>
          </div>
          {initialRecommendedRefs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="size-5" />
                  Smart Match
                </CardTitle>
                <CardDescription>
                  Für {company.name} passen diese Referenzen (Branche/Herausforderungen). Willst du sie hinzufügen?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {initialRecommendedRefs.map((ref) => (
                    <li key={ref.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                      <div>
                        <span className="font-medium text-sm">{ref.title}</span>
                        {ref.company_name && <span className="text-xs text-muted-foreground ml-2">({ref.company_name})</span>}
                        {ref.score > 0 && <Badge variant="outline" className="ml-2 text-xs">{ref.score}%</Badge>}
                      </div>
                      <Link href={`/dashboard?ref=${ref.id}`} className="text-xs text-primary hover:underline">
                        Zur Referenz
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Beweis-Archiv (Referenzen)</CardTitle>
              <CardDescription>
                Alle dieser Firma zugeordneten Referenzen – priorisiert zu den in Strategy definierten Zielen.
              </CardDescription>
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
