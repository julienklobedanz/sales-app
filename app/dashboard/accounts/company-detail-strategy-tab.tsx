import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert01Icon, LinkIcon, Loader, Shield01Icon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import type { StakeholderRole, StakeholderRow } from './actions'
import type { CompanyDetailClientProps } from './company-detail-types'
import { formatDateUtcDe } from '@/lib/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function autoResizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = '0px'
  el.style.height = `${Math.max(el.scrollHeight, 36)}px`
}

type StrategyField = {
  key: string
  label: string
  value: string
  set: (v: string) => void
}

type Props = {
  isSales: boolean
  canEdit: boolean
  strategySaving: boolean
  strategyFields: StrategyField[]
  saveStrategy: (opts?: { silent?: boolean }) => Promise<void>
  stakeholders: StakeholderRow[]
  marketSignals: CompanyDetailClientProps['marketSignals']
  mhAssessment: Record<string, unknown>
  setMhAssessment: (next: Record<string, unknown>) => void
  onSetStakeholderRole: (id: string, role: StakeholderRole) => Promise<void>
}

export function CompanyDetailStrategyTab({
  isSales,
  canEdit,
  strategySaving,
  strategyFields,
  saveStrategy,
  stakeholders,
  marketSignals,
  mhAssessment,
  setMhAssessment,
  onSetStakeholderRole,
}: Props) {
  const champions = stakeholders.filter((s) => s.role === 'champion')
  const buyers = stakeholders.filter((s) => s.role === 'economic_buyer')
  const primaryChampionId = champions[0]?.id ?? '__none__'
  const primaryBuyerId = buyers[0]?.id ?? '__none__'

  function signalHref(url: string | null, label: string) {
    const u = String(url ?? '').trim()
    if (u && /^https?:\/\//i.test(u)) return u
    const q = label.trim()
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Mission Control</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                {canEdit ? (
                  <>
                    Änderungen werden automatisch gespeichert, wenn du ein Feld verlässt.
                    {strategySaving ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <AppIcon icon={Loader} size={14} className="animate-spin" />
                        Speichern…
                      </span>
                    ) : null}
                  </>
                ) : (
                  '—'
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-xl border bg-muted/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Why now? (Signale)</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Neueste Marktsignale, die Handlungsdruck erzeugen.
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {marketSignals.accountNews.slice(0, 3).map((n) => {
                const label = `${n.sourceLabel ?? 'News'} · ${formatDateUtcDe(`${n.publishedOn}T00:00:00.000Z`)}`
                const href = signalHref(n.sourceUrl, `${n.sourceLabel ?? ''} ${n.body}`.trim())
                return (
                  <div key={n.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-sm text-foreground line-clamp-2">{n.body}</div>
                    </div>
                    <Button asChild variant="ghost" size="icon" className="shrink-0">
                      <Link href={href} target="_blank" rel="noreferrer" aria-label="Quelle öffnen">
                        <AppIcon icon={LinkIcon} size={16} />
                      </Link>
                    </Button>
                  </div>
                )
              })}
              {marketSignals.accountNews.length === 0 ? (
                <div className="text-sm text-muted-foreground">Keine aktuellen Signale.</div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-semibold">MEDDPICC</div>
            {strategyFields.map((f) => (
              <div key={f.key} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`strategy-${f.key}`}>{f.label}</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      title="Red Flag markieren (MH Assessment)"
                      onClick={() => {
                        const current = (mhAssessment[f.key] ?? {}) as Record<string, unknown>
                        const risk = current.risk === 'high' ? 'none' : 'high'
                        setMhAssessment({ ...mhAssessment, [f.key]: { ...current, risk } })
                      }}
                    >
                      <AppIcon icon={Alert01Icon} size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      title="Beziehungsstatus bewerten (MH Assessment)"
                      onClick={() => {
                        const current = (mhAssessment[f.key] ?? {}) as Record<string, unknown>
                        const rel = current.relationship === 'strong' ? 'neutral' : current.relationship === 'neutral' ? 'weak' : 'strong'
                        setMhAssessment({ ...mhAssessment, [f.key]: { ...current, relationship: rel } })
                      }}
                    >
                      <AppIcon icon={Shield01Icon} size={16} />
                    </Button>
                  </div>
                </div>
                <Textarea
                  id={`strategy-${f.key}`}
                  rows={1}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  onInput={(e) => autoResizeTextarea(e.currentTarget)}
                  ref={(el) => {
                    if (el) autoResizeTextarea(el)
                  }}
                  onBlur={() => {
                    void saveStrategy({ silent: true })
                  }}
                  disabled={!canEdit || strategySaving}
                  className="h-9 min-h-0 resize-none overflow-hidden leading-6"
                />
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {(() => {
                    const current = (mhAssessment[f.key] ?? {}) as Record<string, unknown>
                    const risk = String(current.risk ?? 'none')
                    const rel = String(current.relationship ?? 'neutral')
                    return (
                      <>
                        <span className="inline-flex items-center gap-1">
                          <AppIcon icon={Alert01Icon} size={12} />
                          Risk: {risk}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <AppIcon icon={Shield01Icon} size={12} />
                          Relationship: {rel}
                        </span>
                      </>
                    )
                  })()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Champion & Economic Buyer</CardTitle>
            <CardDescription>
              Vorauswahl aus Buying-Center-Kandidaten (Rollenmarkierung).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Champion</div>
              {canEdit ? (
                <Select
                  value={primaryChampionId}
                  onValueChange={(id) => {
                    if (id === '__none__') {
                      void Promise.all(champions.map((c) => onSetStakeholderRole(c.id, 'unknown')))
                      return
                    }
                    void Promise.all([
                      ...champions.filter((c) => c.id !== id).map((c) => onSetStakeholderRole(c.id, 'unknown')),
                      onSetStakeholderRole(id, 'champion'),
                    ])
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Champion auswählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {stakeholders.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.title ? ` · ${s.title}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <div className="space-y-2">
                {champions.length ? (
                  champions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{s.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{s.title ?? '—'}</div>
                      </div>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void onSetStakeholderRole(s.id, 'unknown')}
                        >
                          Entfernen
                        </Button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Noch nicht markiert.</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Economic Buyer</div>
              {canEdit ? (
                <Select
                  value={primaryBuyerId}
                  onValueChange={(id) => {
                    if (id === '__none__') {
                      void Promise.all(buyers.map((c) => onSetStakeholderRole(c.id, 'unknown')))
                      return
                    }
                    void Promise.all([
                      ...buyers.filter((c) => c.id !== id).map((c) => onSetStakeholderRole(c.id, 'unknown')),
                      onSetStakeholderRole(id, 'economic_buyer'),
                    ])
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Economic Buyer auswählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {stakeholders.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.title ? ` · ${s.title}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <div className="space-y-2">
                {buyers.length ? (
                  buyers.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{s.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{s.title ?? '—'}</div>
                      </div>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void onSetStakeholderRole(s.id, 'unknown')}
                        >
                          Entfernen
                        </Button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Noch nicht markiert.</div>
                )}
              </div>
            </div>

            {canEdit ? (
              <div className="pt-2 text-xs text-muted-foreground">
                Tipp: Rollen werden im Buying Center gepflegt. Du kannst dort Personen hinzufügen und
                anschließend hier als Champion/Economic Buyer markieren.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
