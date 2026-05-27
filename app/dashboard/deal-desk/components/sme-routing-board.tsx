'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, Plus, UserRound } from 'lucide-react'

import { listDealDeskBidTeamMembers } from '@/app/dashboard/deal-desk/actions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DealDeskSmeTask } from '@/lib/deal-desk/mock-analysis'
import {
  SME_DEFAULT_EXPERTS,
  SME_ROUTE_META,
  formatSmeDueLabel,
  getSmeCategoryBadgeClass,
  getSmeDueBadgeClass,
  guessRouteFromCategory,
  initialsFromName,
  routeLabel,
  smeContextPreview,
  type DealDeskSmeAssignment,
  type SmeExpertOption,
} from '@/lib/deal-desk/sme-routing'
import { cn } from '@/lib/utils'

type Props = {
  tasks: DealDeskSmeTask[]
  assignments: Record<string, DealDeskSmeAssignment>
  customExperts: SmeExpertOption[]
  onAssign: (taskId: string, expert: SmeExpertOption) => void
  onAddExpert: (expert: SmeExpertOption) => void
  className?: string
}

function SmeExpertAssignPopover({
  task,
  expertPool,
  onAssign,
  onAddExpertRequest,
  triggerLabel = 'Experte zuweisen',
  triggerClassName,
}: {
  task: DealDeskSmeTask
  expertPool: SmeExpertOption[]
  onAssign: (expert: SmeExpertOption) => void
  onAddExpertRequest: () => void
  triggerLabel?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const suggestedRoute = guessRouteFromCategory(task.category)

  const grouped = useMemo(() => {
    return SME_ROUTE_META.map((meta) => ({
      meta,
      experts: expertPool.filter((e) => e.route === meta.value),
    })).filter((g) => g.experts.length > 0)
  }, [expertPool])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-8 gap-2 text-xs', triggerClassName)}
        >
          <UserRound className="size-3.5" aria-hidden />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder="Person oder Rolle suchen …" />
          <CommandList>
            <CommandEmpty>Keine passende Person gefunden.</CommandEmpty>
            {grouped.map(({ meta, experts }) => (
              <CommandGroup key={meta.value} heading={meta.department}>
                {experts.map((expert) => (
                  <CommandItem
                    key={expert.id}
                    value={`${expert.name} ${meta.department} ${expert.email ?? ''}`}
                    onSelect={() => {
                      onAssign(expert)
                      setOpen(false)
                    }}
                  >
                    <Avatar size="sm" className="size-7">
                      <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-700">
                        {initialsFromName(expert.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{expert.name}</p>
                      {expert.email ? (
                        <p className="truncate text-[11px] text-muted-foreground">{expert.email}</p>
                      ) : null}
                    </div>
                    {expert.route === suggestedRoute ? (
                      <Badge variant="outline" className="text-[10px]">
                        Empfohlen
                      </Badge>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="ansprechpartner hinzufügen"
                onSelect={() => {
                  setOpen(false)
                  onAddExpertRequest()
                }}
              >
                <Plus className="size-4" aria-hidden />
                Ansprechpartner hinzufügen …
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function AssignedExpertPanel({
  assignment,
  task,
  expertPool,
  onAssign,
  onAddExpertRequest,
}: {
  assignment: DealDeskSmeAssignment
  task: DealDeskSmeTask
  expertPool: SmeExpertOption[]
  onAssign: (expert: SmeExpertOption) => void
  onAddExpertRequest: () => void
}) {
  const dept = routeLabel(assignment.route)

  return (
    <div className="flex w-full min-w-[200px] flex-col items-end gap-2 sm:w-auto">
      <div className="flex items-center gap-2">
        <Avatar size="sm" className="size-8">
          <AvatarFallback className="bg-slate-200 text-[11px] font-semibold text-slate-700">
            {initialsFromName(assignment.assigneeName)}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-slate-700">
          {assignment.assigneeName}{' '}
          <span className="font-normal text-slate-500">({dept})</span>
        </span>
      </div>
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
      >
        ⏳ Wartet auf Rückmeldung
      </Badge>
      <SmeExpertAssignPopover
        task={task}
        expertPool={expertPool}
        onAssign={onAssign}
        onAddExpertRequest={onAddExpertRequest}
        triggerLabel="Zuweisung ändern"
        triggerClassName="h-7 border-slate-200 text-[11px]"
      />
    </div>
  )
}

export function SmeRoutingBoard({
  tasks,
  assignments,
  customExperts,
  onAssign,
  onAddExpert,
  className,
}: Props) {
  const [orgExperts, setOrgExperts] = useState<SmeExpertOption[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [addForTaskId, setAddForTaskId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newRoute, setNewRoute] = useState<string>('legal')

  useEffect(() => {
    void listDealDeskBidTeamMembers().then((res) => {
      if (!res.success) return
      setOrgExperts(
        res.members.map((m) => ({
          id: `org-${m.id}`,
          name: m.name,
          route: guessRouteFromCategory(m.name),
          department: 'Organisation',
          email: m.email,
        }))
      )
    })
  }, [])

  const expertPool = useMemo(() => {
    const byId = new Map<string, SmeExpertOption>()
    for (const e of [...SME_DEFAULT_EXPERTS, ...customExperts, ...orgExperts]) {
      byId.set(e.id, e)
    }
    return Array.from(byId.values())
  }, [customExperts, orgExperts])

  function openAddDialog(taskId: string) {
    const task = tasks.find((t) => t.id === taskId)
    setAddForTaskId(taskId)
    setNewRoute(task ? guessRouteFromCategory(task.category) : 'legal')
    setNewName('')
    setAddOpen(true)
  }

  function submitNewExpert() {
    const name = newName.trim()
    if (!name) return
    const expert: SmeExpertOption = {
      id: `custom-${crypto.randomUUID()}`,
      name,
      route: newRoute,
      department: routeLabel(newRoute),
    }
    onAddExpert(expert)
    if (addForTaskId) {
      onAssign(addForTaskId, expert)
    }
    setAddOpen(false)
    setAddForTaskId(null)
    setNewName('')
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">SME Routing</CardTitle>
          <CardDescription>
            Offene Punkte, die die KI nicht sicher beantworten konnte — Ansprechpartner zuweisen und
            mit RFP-Kontext weiterleiten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine offenen SME-Punkte.</p>
          ) : (
            tasks.map((task) => {
              const assignment = assignments[task.id]
              const context = smeContextPreview(task)
              const urgent = task.dueInDays < 3

              return (
                <div
                  key={task.id}
                  className="mb-4 flex flex-col items-start justify-between gap-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all last:mb-0 hover:border-slate-300 sm:flex-row sm:items-start"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-md border px-2.5 py-0.5 text-xs font-medium',
                          getSmeCategoryBadgeClass(task.category)
                        )}
                      >
                        {task.category}
                      </Badge>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          getSmeDueBadgeClass(task.dueInDays)
                        )}
                      >
                        <Clock
                          className={cn('size-3', urgent && 'text-red-600')}
                          aria-hidden
                        />
                        {formatSmeDueLabel(task.dueInDays)}
                      </span>
                    </div>
                    <p className="mb-1 text-sm font-semibold text-slate-900">{task.question}</p>
                    {context ? (
                      <details className="group mt-2">
                        <summary className="cursor-pointer list-none text-xs font-medium text-blue-700 hover:text-blue-800 [&::-webkit-details-marker]:hidden">
                          <span className="inline-flex items-center gap-1">
                            📄 Originale RFP-Anforderung anzeigen (Auszug {context.pageHint})
                          </span>
                        </summary>
                        <blockquote className="mt-2 rounded-lg border-l-2 border-slate-300 bg-slate-50 p-3 text-xs italic leading-relaxed text-slate-600">
                          {context.excerpt}
                        </blockquote>
                      </details>
                    ) : null}
                  </div>

                  <div className="w-full shrink-0 sm:w-auto">
                    {assignment ? (
                      <AssignedExpertPanel
                        assignment={assignment}
                        task={task}
                        expertPool={expertPool}
                        onAssign={(expert) => onAssign(task.id, expert)}
                        onAddExpertRequest={() => openAddDialog(task.id)}
                      />
                    ) : (
                      <SmeExpertAssignPopover
                        task={task}
                        expertPool={expertPool}
                        onAssign={(expert) => onAssign(task.id, expert)}
                        onAddExpertRequest={() => openAddDialog(task.id)}
                      />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ansprechpartner hinzufügen</DialogTitle>
            <DialogDescription>
              Person für dieses RFP hinterlegen und direkt der Klärung zuweisen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sme-contact-name">Name</Label>
              <Input
                id="sme-contact-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z. B. Christian K."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sme-contact-route">Zuständigkeit</Label>
              <Select value={newRoute} onValueChange={setNewRoute}>
                <SelectTrigger id="sme-contact-route" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SME_ROUTE_META.map((meta) => (
                    <SelectItem key={meta.value} value={meta.value}>
                      {meta.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={submitNewExpert} disabled={!newName.trim()}>
              Speichern & zuweisen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
