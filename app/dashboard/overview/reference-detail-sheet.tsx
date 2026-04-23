'use client'

import type { Dispatch, MouseEvent, SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Building2,
  Calendar,
  Eye,
  ExternalLink,
  FileText,
  Globe,
  LinkIcon,
  Mail,
  MapPinIcon,
  Pencil,
  Phone,
  Send,
  StarIcon,
  Tag01Icon,
  Timer,
  Trash2,
  UserIcon,
  Users,
} from '@hugeicons/core-free-icons'

import { ReferenceStatusBadge } from '@/components/reference-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { diffMonthsUtc, formatDateUtcDe, formatNumberDe, formatReferenceVolume } from '@/lib/format'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'

import type { ReferenceAssetRow, ReferenceRow } from '../actions'
import { updateReferenceAssetCategory } from '../actions'
import type { Profile } from '../dashboard-shell'

export function ReferenceDetailSheet({
  open,
  onOpenChange,
  selectedRef,
  profile,
  externalContacts,
  detailAssets,
  detailAssetsLoading,
  setDetailAssets,
  normalizeTagLabel,
  onToggleFavorite,
  onOpenShareLink,
  onSubmitForApproval,
  onRequestSpecificApproval,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedRef: ReferenceRow | null
  profile: Profile
  externalContacts: {
    id: string
    company_id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    phone?: string | null
  }[]
  detailAssets: ReferenceAssetRow[]
  detailAssetsLoading: boolean
  setDetailAssets: Dispatch<SetStateAction<ReferenceAssetRow[]>>
  normalizeTagLabel: (raw: string) => string
  onToggleFavorite: (id: string, e?: MouseEvent) => void
  onOpenShareLink: (ref: ReferenceRow) => void
  onSubmitForApproval: (id: string) => void | Promise<void>
  onRequestSpecificApproval: (id: string) => void | Promise<void>
  onDelete: (id: string, e?: MouseEvent) => void
}) {
  const router = useRouter()

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-6 sm:max-w-3xl lg:max-w-[61rem] xl:max-w-[68rem]" onOpenAutoFocus={(e) => e.preventDefault()}>
          {selectedRef && (
            <TooltipProvider delayDuration={150}>
              {/* Fixierter Header */}
              <DialogHeader className="z-10 shrink-0 border-b bg-background px-0 pb-4 pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-lg font-semibold leading-tight tracking-tight truncate">
                        {selectedRef.title}
                      </DialogTitle>
                      <span className="text-muted-foreground text-lg font-semibold leading-tight tracking-tight shrink-0">
                        | {selectedRef.status === 'anonymized'
                          ? 'Anonymisierter Kunde'
                          : selectedRef.company_name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 -mt-1 hover:bg-transparent"
                        onClick={(e: MouseEvent) => onToggleFavorite(selectedRef.id, e)}
                      >
                        <AppIcon
                          icon={StarIcon}
                          size={16}
                          className={
                            selectedRef.is_favorited
                              ? 'text-amber-500 dark:text-amber-400'
                              : 'text-muted-foreground hover:text-amber-500/80'
                          }
                        />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedRef.is_nda_deal && (
                        <Badge variant="secondary" className="text-xs cursor-default">
                          NDA-geschützt
                        </Badge>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ReferenceStatusBadge
                            status={selectedRef.status}
                            customerApprovalStatus={selectedRef.customer_approval_status}
                            className="text-xs cursor-default"
                          />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs leading-snug">
                          {selectedRef.status === 'draft' &&
                            'Entwurf: In Arbeit, nur für den Ersteller sichtbar.'}
                          {selectedRef.status === 'internal_only' &&
                            'Nur Intern: Verifiziert, aber sensible Daten (Preise/Namen) dürfen das Haus nicht verlassen.'}
                          {selectedRef.status === 'approved' &&
                            'Extern freigegeben: Offiziell vom Kunden und Marketing freigegeben für Sales-Pitches.'}
                          {selectedRef.status === 'anonymized' &&
                            'Anonymisiert: Name und Logo entfernt (z. B. „Großbank“), bereit für öffentliche Case Studies.'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                {/* Nutzungs-Statistik unter Freigabestufe: Views + Verknüpfungen */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1.5">
                    <AppIcon icon={Eye} size={14} aria-hidden />
                    {formatNumberDe(selectedRef.total_share_views ?? 0)} Aufrufe
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1.5">
                        <AppIcon icon={LinkIcon} size={14} aria-hidden />
                        {(selectedRef.deal_link_count ?? 0) + (selectedRef.share_link_count ?? 0)} Verknüpfungen
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {selectedRef.deal_link_count ?? 0}× mit Deal verknüpft · {(selectedRef.share_link_count ?? 0)}× Kundenlink erstellt
                    </TooltipContent>
                  </Tooltip>
                </div>
              </DialogHeader>

              {/* Ein scrollbarer Bereich: gleiche 4-Karten-Struktur wie Referenz erstellen */}
              <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
                <div className="space-y-6 pt-4">
                  {/* Card 1: Story (Herausforderung & Lösung + Tags) */}
                  <Card>
                    <CardContent className="space-y-4">
                      {(selectedRef.customer_challenge || selectedRef.our_solution) ? (
                        <div className="space-y-4">
                          {selectedRef.customer_challenge ? (
                            <div className="space-y-2">
                              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Herausforderung des Kunden</span>
                              <p className="text-foreground text-sm leading-relaxed">
                                {selectedRef.customer_challenge}
                              </p>
                            </div>
                          ) : null}
                          {selectedRef.our_solution ? (
                            <div className="space-y-2">
                              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Unsere Lösung</span>
                              <p className="text-foreground text-sm leading-relaxed">
                                {selectedRef.our_solution}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <AppIcon icon={Tag01Icon} size={12} /> Tags
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedRef.tags
                            ? selectedRef.tags
                                .split(/[\s,]+/)
                                .map((tag) => normalizeTagLabel(tag))
                                .filter(Boolean)
                                .map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))
                            : (
                              <span className="text-xs font-medium text-muted-foreground">—</span>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Projektdetails (Volumen, Vertragsart, Zeitraum, Unternehmensdetails, Kontakte) */}
                  <Card>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Projektdetails</span>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <AppIcon icon={FileText} size={12} /> Volumen
                        </span>
                        <p className={`pl-4 text-xs font-medium ${selectedRef.volume_eur ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {selectedRef.volume_eur ? formatReferenceVolume(selectedRef.volume_eur) : '—'}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <AppIcon icon={FileText} size={12} /> Vertragsart
                        </span>
                        <p className={`pl-4 text-xs font-medium ${selectedRef.contract_type ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {selectedRef.contract_type || '—'}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <AppIcon icon={Calendar} size={12} /> Projektstart
                        </span>
                        <p className={`pl-4 text-xs font-medium ${selectedRef.project_start ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {selectedRef.project_start ? formatDateUtcDe(selectedRef.project_start) : '—'}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <AppIcon icon={Timer} size={12} /> Projektende / Dauer
                        </span>
                        {(() => {
                          const start = selectedRef.project_start
                          const end = selectedRef.project_end
                          const status = selectedRef.project_status
                          const label =
                            status === 'active'
                              ? 'Aktiv'
                              : end
                                ? formatDateUtcDe(end)
                                : '—'
                          const nowIso = new Date().toISOString()
                          const duration =
                            selectedRef.duration_months != null
                              ? selectedRef.duration_months
                              : start && end
                                ? diffMonthsUtc(start, end)
                                : status === 'active' && start
                                  ? diffMonthsUtc(start, nowIso)
                                  : null
                          return (
                            <p className="pl-4 text-xs font-medium text-foreground">
                              {duration != null ? `${label} (${duration} Monate)` : label}
                            </p>
                          )
                        })()}
                      </div>
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <AppIcon icon={Building2} size={12} /> Aktueller Dienstleister
                            </span>
                            <p className={`pl-4 text-xs font-medium ${selectedRef.incumbent_provider ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {selectedRef.incumbent_provider || '—'}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <AppIcon icon={Users} size={12} /> Beteiligte Wettbewerber
                            </span>
                            <p className={`pl-4 text-xs font-medium ${selectedRef.competitors ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {selectedRef.competitors || '—'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <hr className="border-border/60" />

                      <div className="space-y-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Unternehmensdetails</span>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <AppIcon icon={Building2} size={12} /> Industrie
                            </span>
                            <p className={`pl-4 text-xs font-medium ${selectedRef.industry ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {selectedRef.industry || '—'}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <AppIcon icon={MapPinIcon} size={12} /> HQ
                            </span>
                            <p className={`pl-4 text-xs font-medium ${selectedRef.country ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {selectedRef.country || '—'}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <AppIcon icon={Globe} size={12} /> Website
                            </span>
                            <div className="pl-4">
                              {selectedRef.website ? (
                                <a
                                  href={selectedRef.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1 text-xs font-medium"
                                >
                                  Öffnen <AppIcon icon={ExternalLink} size={12} />
                                </a>
                              ) : (
                                <p className="text-xs font-medium text-muted-foreground">—</p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <AppIcon icon={UserIcon} size={12} /> Mitarbeiter
                            </span>
                            <p className={`pl-4 text-xs font-medium ${selectedRef.employee_count != null ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {formatNumberDe(selectedRef.employee_count)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <hr className="border-border/60" />

                      <div className="space-y-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Kontakte</span>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-1">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                              <AppIcon icon={UserIcon} size={12} /> Interner Ansprechpartner
                            </span>
                        <p className="pl-4 text-xs font-medium">
                          {selectedRef.contact_display ||
                            selectedRef.contact_email ||
                            'Nicht zugewiesen'}
                        </p>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-2 pl-4">
                          {selectedRef.contact_email && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a href={`mailto:${selectedRef.contact_email}`} className="inline-flex items-center gap-1 text-[10px] hover:underline">
                                  <AppIcon icon={Mail} size={14} />
                                  {selectedRef.contact_email}
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>E-Mail: {selectedRef.contact_email}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-muted-foreground pl-4 text-[10px]">
                          Account Owner
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                          <AppIcon icon={UserIcon} size={12} /> Kundenansprechpartner
                        </span>
                        {(() => {
                          const ext = selectedRef.customer_contact_id
                            ? externalContacts?.find((c) => c.id === selectedRef.customer_contact_id)
                            : undefined
                          const displayName = selectedRef.customer_contact || (ext ? [ext.first_name, ext.last_name].filter(Boolean).join(' ') : null) || '—'
                          const email = ext?.email ?? null
                          const phone = ext?.phone ?? null
                          const role = ext?.role ?? null
                          return (
                            <>
                              <p className={`pl-4 text-xs font-medium ${displayName !== '—' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {displayName}
                              </p>
                              <div className="text-muted-foreground flex flex-wrap items-center gap-2 pl-4">
                                {email && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a href={`mailto:${email}`} className="inline-flex items-center gap-1 text-[10px] hover:underline">
                                        <AppIcon icon={Mail} size={14} />
                                        {email}
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>E-Mail: {email}</TooltipContent>
                                  </Tooltip>
                                )}
                                {phone && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-[10px] hover:underline">
                                        <AppIcon icon={Phone} size={14} />
                                        {phone}
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>Telefon: {phone}</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              {role && (
                                <p className="text-muted-foreground pl-4 text-[10px]">
                                  {role}
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Strategie & Anhänge (Dateien, Historie) */}
                  <Card className="bg-muted/30">
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                          Dateien
                        </span>
                    {detailAssetsLoading ? (
                      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
                        Dateien werden geladen…
                      </div>
                    ) : detailAssets.length === 0 && !selectedRef.file_path ? (
                      <div className="text-muted-foreground bg-muted/10 flex h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs">
                        <span>📎</span>
                        <p>Keine Dateien vorhanden.</p>
                      </div>
                    ) : (
                      <Tabs defaultValue="sales" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="sales">Sales Material</TabsTrigger>
                          <TabsTrigger value="contract">Verträge</TabsTrigger>
                          <TabsTrigger value="other">Sonstiges</TabsTrigger>
                        </TabsList>
                        {(['sales', 'contract', 'other'] as const).map((cat) => {
                          const legacyFile =
                            cat === 'other' && detailAssets.length === 0 && selectedRef.file_path
                              ? { path: selectedRef.file_path, name: selectedRef.file_path.split('/').pop() ?? 'Dokument', isLegacy: true as const }
                              : null
                          const assetsInCat = detailAssets.filter((a) => a.category === cat)
                          const hasLegacy = !!legacyFile
                          const hasItems = assetsInCat.length > 0 || hasLegacy
                          return (
                            <TabsContent key={cat} value={cat} className="mt-2">
                              {!hasItems ? (
                                <p className="text-muted-foreground py-4 text-center text-sm">Keine Dateien in dieser Kategorie.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {legacyFile && (
                                    <li className="flex items-center justify-between gap-2 rounded-lg border p-3">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <AppIcon icon={FileText} size={16} className="shrink-0 text-muted-foreground" />
                                        <span className="truncate text-sm">{legacyFile.name}</span>
                                      </div>
                                      <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs" asChild>
                                        <a
                                          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/references/${legacyFile.path}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <AppIcon icon={ExternalLink} size={12} className="mr-1" /> Öffnen
                                        </a>
                                      </Button>
                                    </li>
                                  )}
                                  {assetsInCat.map((asset) => (
                                    <li
                                      key={asset.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                                    >
                                      <div className="flex min-w-0 flex-1 items-center gap-2">
                                        <AppIcon icon={FileText} size={16} className="shrink-0 text-muted-foreground" />
                                        <span className="truncate text-sm">{asset.file_name || asset.file_path.split('/').pop() || 'Dokument'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {profile.role === 'admin' && (
                                          <Select
                                            value={asset.category}
                                            onValueChange={async (value: 'sales' | 'contract' | 'other') => {
                                              const res = await updateReferenceAssetCategory(asset.id, value)
                                              if (res.success) {
                                                setDetailAssets((prev) =>
                                                  prev.map((a) => (a.id === asset.id ? { ...a, category: value } : a))
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
                                              <SelectItem value="sales">Sales Material</SelectItem>
                                              <SelectItem value="contract">Verträge</SelectItem>
                                              <SelectItem value="other">Sonstiges</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        )}
                                        <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs" asChild>
                                          <a
                                            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/references/${asset.file_path}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <AppIcon icon={ExternalLink} size={12} className="mr-1" /> Öffnen
                                          </a>
                                        </Button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </TabsContent>
                          )
                        })}
                      </Tabs>
                    )}
                      </div>
                      <div className="space-y-2">
                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Historie</span>
                        <div className="relative ml-1.5 space-y-4 border-l pl-4">
                          <div className="relative">
                            <span className="bg-primary ring-background absolute -left-[17px] top-0.5 h-2 w-2 rounded-full ring-2" />
                            <p className="text-xs font-medium">Referenz erstellt</p>
                            <p className="text-muted-foreground mt-1 text-[10px]">
                              {formatDateUtcDe(selectedRef.created_at)}
                            </p>
                          </div>
                          {selectedRef.updated_at && selectedRef.updated_at !== selectedRef.created_at && (
                            <div className="relative">
                              <span className="bg-muted-foreground/50 ring-background absolute -left-[17px] top-0.5 h-2 w-2 rounded-full ring-2" />
                              <p className="text-xs font-medium">Letzte Änderung</p>
                              <p className="text-muted-foreground mt-1 text-[10px]">
                                {formatDateUtcDe(selectedRef.updated_at)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Fixierter Footer (rollenabhängig) */}
              <DialogFooter className="z-10 shrink-0 flex-col gap-2 border-t bg-muted/20 px-0 pt-4 pb-0 sm:flex-row sm:items-center sm:justify-between">
                {/* Linke Seite: Download + Bearbeiten */}
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenShareLink(selectedRef)}
                    title="Kundenlink erstellen"
                  >
                    <AppIcon icon={LinkIcon} size={16} className="mr-2" /> Kundenlink erstellen
                  </Button>
                  {profile.role === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(ROUTES.evidence.edit(selectedRef.id))
                      }
                    >
                      <AppIcon icon={Pencil} size={16} className="mr-2" /> Bearbeiten
                    </Button>
                  )}
                </div>

                {/* Rechte Seite: Freigabe anfragen / Account Owner + Löschen ganz rechts */}
                <div className="flex w-full justify-end gap-2 sm:w-auto">
                  {profile.role === 'sales' &&
                    selectedRef.status === 'internal_only' && (
                      <Button
                        size="sm"
                        onClick={() => void onRequestSpecificApproval(selectedRef.id)}
                      >
                        <AppIcon icon={Send} size={16} className="mr-2" /> Freigabe anfragen
                      </Button>
                    )}
                  {profile.role === 'admin' &&
                    selectedRef.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => void onSubmitForApproval(selectedRef.id)}
                      >
                        <AppIcon icon={Mail} size={16} className="mr-2" /> Freigabe anfragen
                      </Button>
                    )}
                  {profile.role === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e: MouseEvent) => onDelete(selectedRef.id, e)}
                    >
                      <AppIcon icon={Trash2} size={16} className="mr-2" /> Löschen
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </TooltipProvider>
          )}
        </DialogContent>
      </Dialog>
  )
}
