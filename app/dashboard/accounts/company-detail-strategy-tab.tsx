import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader, Pencil } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'

type StrategyField = {
  key: string
  label: string
  value: string
  set: (v: string) => void
}

type Props = {
  isSales: boolean
  canEdit: boolean
  strategyEditing: boolean
  setStrategyEditing: (v: boolean) => void
  strategySaving: boolean
  strategyFields: StrategyField[]
  saveStrategy: (opts?: { silent?: boolean }) => Promise<void>
  resetStrategyToLastSaved: () => void
}

export function CompanyDetailStrategyTab({
  isSales,
  canEdit,
  strategyEditing,
  setStrategyEditing,
  strategySaving,
  strategyFields,
  saveStrategy,
  resetStrategyToLastSaved,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Strategie</CardTitle>
            <CardDescription>
              {isSales
                ? 'Nur Lesen – nur Account Manager oder Admin können bearbeiten.'
                : 'Bearbeiten über den Button „Bearbeiten“.'}
            </CardDescription>
          </div>
          {!strategyEditing && canEdit ? (
            <Button type="button" variant="outline" onClick={() => setStrategyEditing(true)}>
              <AppIcon icon={Pencil} size={16} className="mr-2" />
              Bearbeiten
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!strategyEditing ? (
          <div className="space-y-6">
            {strategyFields.map((f) => (
              <div key={f.key} className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </div>
                <div className="whitespace-pre-wrap rounded-lg border bg-background px-3 py-2 text-sm">
                  {f.value.trim().length ? f.value : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {strategyFields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Textarea
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  disabled={!canEdit || strategySaving}
                  className="min-h-[110px]"
                />
              </div>
            ))}
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetStrategyToLastSaved()
                  setStrategyEditing(false)
                }}
                disabled={strategySaving}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  await saveStrategy()
                  setStrategyEditing(false)
                }}
                disabled={!canEdit || strategySaving}
              >
                {strategySaving && (
                  <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                )}
                Speichern
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
