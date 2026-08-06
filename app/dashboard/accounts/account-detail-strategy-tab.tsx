import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LinkIcon, Loader } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import type { ExternalContactRow, StakeholderRole, StakeholderRow } from './actions'
import type { AccountDetailClientProps } from './account-detail-types'
import { formatReferenceDate } from '@/lib/format'
import { COPY } from '@/lib/copy'
import { externalContactJobTitle } from './account-contact-action-buttons'
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

function externalContactDisplayName(c: ExternalContactRow): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || '—'
}

function externalSelectValue(id: string): string {
  return `external:${id}`
}

function parseSelectValue(
  value: string,
):
  | { kind: 'none' }
  | { kind: 'stakeholder'; id: string }
  | { kind: 'external'; id: string } {
  if (value === '__none__') return { kind: 'none' }
  if (value.startsWith('external:'))
    return { kind: 'external', id: value.slice('external:'.length) }
  return { kind: 'stakeholder', id: value }
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
  externalContacts: ExternalContactRow[]
  marketSignals: AccountDetailClientProps['marketSignals']
  onSetStakeholderRole: (id: string, role: StakeholderRole) => Promise<void>
  onSetExternalBuyingCenterRole: (id: string, role: StakeholderRole) => Promise<void>
}

export function AccountDetailStrategyTab({
  canEdit,
  strategySaving,
  strategyFields,
  saveStrategy,
  stakeholders,
  externalContacts,
  marketSignals,
  onSetStakeholderRole,
  onSetExternalBuyingCenterRole,
}: Props) {
  const stakeholderByRole = (role: StakeholderRole) =>
    stakeholders.filter((s) => s.role === role)
  const externalByRole = (role: StakeholderRole) =>
    externalContacts.filter((c) => (c.buying_center_role ?? 'unknown') === role)

  function selectedValueForRole(role: StakeholderRole): string {
    const ext = externalByRole(role)[0]
    if (ext) return externalSelectValue(ext.id)
    const st = stakeholderByRole(role)[0]
    return st?.id ?? '__none__'
  }

  function pickedLabelForRole(
    role: StakeholderRole,
  ): { name: string; title?: string | null; tag?: string } | null {
    const ext = externalByRole(role)[0]
    if (ext) {
      return {
        name: externalContactDisplayName(ext),
        title: externalContactJobTitle(ext),
        tag: 'Referenz',
      }
    }
    const st = stakeholderByRole(role)[0]
    if (!st) return null
    return { name: st.name, title: st.title }
  }

  async function setPrimaryRole(role: StakeholderRole, selectedId: string) {
    const parsed = parseSelectValue(selectedId)
    const currentStakeholders = stakeholderByRole(role)
    const currentExternals = externalByRole(role)

    if (parsed.kind === 'none') {
      await Promise.all([
        ...currentStakeholders.map((c) => onSetStakeholderRole(c.id, 'unknown')),
        ...currentExternals.map((c) => onSetExternalBuyingCenterRole(c.id, 'unknown')),
      ])
      return
    }

    await Promise.all([
      ...currentStakeholders
        .filter((c) => parsed.kind !== 'stakeholder' || c.id !== parsed.id)
        .map((c) => onSetStakeholderRole(c.id, 'unknown')),
      ...currentExternals
        .filter((c) => parsed.kind !== 'external' || c.id !== parsed.id)
        .map((c) => onSetExternalBuyingCenterRole(c.id, 'unknown')),
    ])

    if (parsed.kind === 'stakeholder') {
      await onSetStakeholderRole(parsed.id, role)
    } else {
      await onSetExternalBuyingCenterRole(parsed.id, role)
    }
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
                const label = `${n.sourceLabel ?? 'News'} · ${formatReferenceDate(`${n.publishedOn}T00:00:00.000Z`, 'de-DE')}`
                const href = signalHref(
                  n.sourceUrl,
                  `${n.sourceLabel ?? ''} ${n.body}`.trim(),
                )
                return (
                  <div key={n.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-sm text-foreground line-clamp-2">{n.body}</div>
                    </div>
                    <Button asChild variant="ghost" size="icon" className="shrink-0">
                      <Link
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Quelle öffnen"
                      >
                        <AppIcon icon={LinkIcon} size={16} />
                      </Link>
                    </Button>
                  </div>
                )
              })}
              {marketSignals.accountNews.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Keine aktuellen Signale.
                </div>
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
            <CardTitle className="text-base">{COPY.accounts.buyingCenterTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {(
              [
                { role: 'champion', label: 'Champion' },
                { role: 'economic_buyer', label: 'Economic Buyer' },
                { role: 'technical_buyer', label: 'Technical Buyer' },
                { role: 'user_buyer', label: 'User Buyer' },
                { role: 'blocker', label: 'Blocker' },
              ] as { role: StakeholderRole; label: string }[]
            ).map((row) => {
              const picked = pickedLabelForRole(row.role)
              return (
                <div key={row.role} className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {row.label}
                  </div>
                  {canEdit ? (
                    <Select
                      value={selectedValueForRole(row.role)}
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
                        {externalContacts.map((c) => {
                          const name = externalContactDisplayName(c)
                          const title = externalContactJobTitle(c)
                          return (
                            <SelectItem
                              key={externalSelectValue(c.id)}
                              value={externalSelectValue(c.id)}
                            >
                              <span className="font-medium">{name}</span>
                              {title !== '—' ? (
                                <span className="text-muted-foreground"> · {title}</span>
                              ) : null}
                              <span className="text-muted-foreground"> · Referenz</span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="min-h-11 rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                      {picked ? (
                        <>
                          <span className="font-medium text-foreground">
                            {picked.name}
                          </span>
                          {picked.title && picked.title !== '—' ? (
                            <span className="text-muted-foreground">
                              {' '}
                              · {picked.title}
                            </span>
                          ) : null}
                          {picked.tag ? (
                            <span className="text-muted-foreground"> · {picked.tag}</span>
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
