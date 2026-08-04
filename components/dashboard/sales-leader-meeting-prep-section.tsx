'use client'

import { useState } from 'react'
import { Loader, Search01Icon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import {
  DashboardSectionCard,
  HonestEmpty,
} from '@/components/dashboard/dashboard-home-primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CompanyLogo } from '@/components/ui/company-logo'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import type { MeetingPrepSessionListItem } from '@/lib/meeting-prep/meeting-prep-types'
import {
  MeetingPrepCompanyPicker,
  MeetingPrepOverlayDialog,
  runCreateMeetingPrep,
  runLoadMeetingPrepSession,
  useMeetingPrepFlow,
} from '@/components/dashboard/meeting-prep-overlay'

function formatSessionDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function SalesLeaderMeetingPrepSection({
  sessions,
  thin = false,
}: {
  sessions: MeetingPrepSessionListItem[]
  thin?: boolean
}) {
  const c = COPY.dashboard.home.salesLeader.meetingPrep
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(false)
  const flow = useMeetingPrepFlow()

  async function handlePrepare(companyId?: string) {
    const q = query.trim()
    if (!q) {
      toast.error(c.inputRequired)
      return
    }
    setPending(true)
    try {
      await runCreateMeetingPrep(q, companyId, flow)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DashboardSectionCard title={c.title} description={c.description}>
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <AppIcon
                icon={Search01Icon}
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={c.inputPlaceholder}
                className="pl-9"
                disabled={thin || pending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handlePrepare()
                }}
              />
            </div>
            <Button
              type="button"
              className="shrink-0"
              disabled={thin || pending || !query.trim()}
              onClick={() => void handlePrepare()}
            >
              {pending ? (
                <>
                  <AppIcon icon={Loader} size={16} className="mr-1 animate-spin" />
                  {c.preparing}
                </>
              ) : (
                c.prepareCta
              )}
            </Button>
          </div>

          {thin ? (
            <HonestEmpty title={c.emptyTitle} description={c.emptyDescription} />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{c.sessionsEmpty}</p>
          ) : (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.sessionsLabel}
              </p>
              <ul className="space-y-1">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/60"
                      onClick={() => void runLoadMeetingPrepSession(s.id, s.title, flow)}
                    >
                      <CompanyLogo
                        src={s.companyLogoUrl}
                        companyId={s.companyId}
                        fallbackText={s.title}
                        containerClassName="size-8 shrink-0 rounded-md"
                        fallbackIconSize={16}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatSessionDate(s.createdAt)}
                          {s.companyNameQuery !== s.title
                            ? ` · „${s.companyNameQuery}"`
                            : ''}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DashboardSectionCard>

      <MeetingPrepOverlayDialog
        open={flow.overlayOpen}
        onOpenChange={flow.setOverlayOpen}
        title={flow.overlayTitle}
        snapshot={flow.snapshot}
      />

      <MeetingPrepCompanyPicker
        open={flow.pickerOpen}
        hits={flow.pickerHits}
        onCancel={() => flow.setPickerOpen(false)}
        onPick={(hit) => {
          flow.setPickerOpen(false)
          setQuery(hit.name)
          void handlePrepare(hit.id)
        }}
      />
    </>
  )
}
