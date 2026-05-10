import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LinkIcon, Loader } from '@hugeicons/core-free-icons'
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
  canEdit: boolean
  strategySaving: boolean
  strategyFields: StrategyField[]
  saveStrategy: (opts?: { silent?: boolean }) => Promise<void>
  stakeholders: StakeholderRow[]
  marketSignals: CompanyDetailClientProps['marketSignals']
  onSetStakeholderRole: (id: string, role: StakeholderRole) => Promise<void>
}

export function CompanyDetailStrategyTab({
  canEdit,
  strategySaving,
  strategyFields,
  saveStrategy,
  stakeholders,
  marketSignals,
  onSetStakeholderRole,
}: Props) {
  const byRole = (role: StakeholderRole) => stakeholders.filter((s) => s.role === role)
  const selectedByRole = (role: StakeholderRole) => byRole(role)[0]?.id ?? '__none__'

  async function setPrimaryRole(role: StakeholderRole, selectedId: string) {
    const current = byRole(role)
    if (selectedId === '__none__') {
      await Promise.all(current.map((c) => onSetStakeholderRole(c.id, 'unknown')))
      return
    }
    await Promise.all([
      ...current.filter((c) => c.id !== selectedId).map((c) => onSetStakeholderRole(c.id, 'unknown')),
      onSetStakeholderRole(selectedId, role),
    ])
  }

  function signalHref(url: string | null, label: string) {
    const u = String(url ?? '').trim()
    if (u && /^https?:\/\//i.test(u)) return u
    const q = label.trim()
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
      <div className="min-w-0 space-y-6">
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <div className="text-sm font-semibold">Signale</div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
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
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              MEDDPICC
              {strategySaving ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <AppIcon icon={Loader} size={14} className="animate-spin" />
                  Speichern…
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {strategyFields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`strategy-${f.key}`}>{f.label}</Label>
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
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Buying Center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {([
              { role: 'champion', label: 'Champion' },
              { role: 'economic_buyer', label: 'Economic Buyer' },
              { role: 'technical_buyer', label: 'Technical Buyer' },
              { role: 'user_buyer', label: 'User Buyer' },
              { role: 'blocker', label: 'Blocker' },
            ] as { role: StakeholderRole; label: string }[]).map((row) => {
              const picked = byRole(row.role)[0]
              return (
                <div key={row.role} className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{row.label}</div>
                  {canEdit ? (
                    <Select
                      value={selectedByRole(row.role)}
                      onValueChange={(id) => {
                        void setPrimaryRole(row.role, id)
                      }}
                    >
                      <SelectTrigger className="h-11 w-full min-w-0 border-input bg-background px-3 text-left shadow-sm">
                        <SelectValue
                          placeholder={`Stakeholder für „${row.label}“ wählen …`}
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(280px,50vh)]">
                        <SelectItem value="__none__">Keine Zuordnung</SelectItem>
                        {stakeholders.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="font-medium">{s.name}</span>
                            {s.title ? (
                              <span className="text-muted-foreground"> · {s.title}</span>
                            ) : null}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="min-h-11 rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                      {picked ? (
                        <>
                          <span className="font-medium text-foreground">{picked.name}</span>
                          {picked.title ? (
                            <span className="text-muted-foreground"> · {picked.title}</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Nicht zugeordnet</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
