# Arbeitspaket: Perf-7 — Infra-Latenz (Auth-Konsolidierung + Streaming)

**Quelle:** Latenz-Diagnose (konstante 1–2 s auf Vercel-Prod bei winziger Datenmenge = Roundtrips, nicht Datenmenge).
**Voraussetzung/Reihenfolge:** **#1 (Vercel-Region `fra1`) zuerst deployen** — das ist der größte Einzelhebel. Perf-7 ist die Ergänzung (#2 + #3); unabhängig umsetzbar, aber nach dem Region-Fix.
**Zweck:** Redundante Auth-/Profil-Roundtrips pro Request eliminieren (#2) und die wahrgenommene Ladezeit per Streaming senken (#3).

---

## Vorab lesen
- `docs/ai-coding-agent-guide.md`.
- Supabase-Sicherheit: `auth.getUser()` verifiziert das Token serverseitig (Roundtrip) — **bleibt** für sicherheitsrelevante Checks. `getSession()` liest nur das Cookie (kein Roundtrip), ist aber **nicht** verifiziert → **nicht** als Security-Gate verwenden.

## Ist-Stand (verifiziert)
- **17** `auth.getUser()`-Aufrufe in Layout + Pages; das Profil (`organization_id`, Rollen) wird pro Request **mehrfach** geladen: `app/dashboard/layout.tsx`, die jeweilige `page.tsx`, `lib/roles/load-reference-visibility.ts`, **und** die Dashboard-Loader (`lib/dashboard-home/*` — sales-rep, account-manager, admin, dispatch).
- **Kein** React `cache()` (request-scoped Memoization). `unstable_cache` existiert (Perf-2), ist aber **cross-request** — das falsche Werkzeug fürs Dedup *innerhalb* eines Requests.
- Nur **6** `<Suspense>` im Dashboard; Hot-Routen sind `force-dynamic` und blockieren den First Paint bis alle Server-Awaits fertig sind.

---

## T1 — Auth + Profil pro Request konsolidieren (#2)

**Soll:** Request-scoped Helfer mit React `cache()` (dedupliziert mehrfache Aufrufe **innerhalb eines** Renders auf **einen** Roundtrip):
```ts
// lib/auth/request-user.ts
import { cache } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const getRequestUser = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()   // verifiziert, 1× pro Request
  return user
})

export const getRequestProfile = cache(async () => {
  const user = await getRequestUser()
  if (!user) return null
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role, capabilities')
    .eq('id', user.id)
    .single()
  return data
})
```
- Die duplizierten `getUser()`+Profil-Stellen (Layout, Pages, `load-reference-visibility.ts`, Dashboard-Loader) auf diese Helfer umstellen → **ein** Auth- + **ein** Profil-Roundtrip pro Seiten-Render statt 3–5.
- `getUser()` (verifiziert) **beibehalten** — `cache()` ändert nur die Anzahl, nicht die Verifikation.

**Akzeptanz:** Pro Seiten-Render genau **ein** `auth.getUser()` und **ein** Profil-Read (per Log/Zähler belegbar); Verhalten/Sicherheit unverändert; `tenant-isolation`-Integrationstest grün.

> Hinweis: `cache()` memoisiert **innerhalb eines** Render-/Request-Durchlaufs. Server Actions sind eigene Invocations — dort greift es separat (auch ok).

---

## T2 — Streaming auf den Hot-Routen (#3)

**Soll:** Auf `/dashboard`, `/dashboard/evidence`, `/dashboard/deals` (+ Deal-Detail) die schweren datenabhängigen Subtrees in `<Suspense fallback={<Skeleton/>}>` kapseln, sodass Shell + Skeleton **sofort** erscheinen und die Daten nachströmen. `force-dynamic` kann bleiben — Streaming wirkt unabhängig.
- Skeletons an bestehendes Design anlehnen (`docs/ai-coding-agent-guide.md`), passende Min-Höhen (kein Layout-Shift).
- Muster wie bereits bei Perf-4 (Match/Command-Center) genutzt.

**Akzeptanz:** Hot-Routen zeigen sofort Struktur statt Leerlauf; sichtbar früheres First Paint (DevTools Performance/Lighthouse); Inhalt unverändert.

---

## Out of Scope
- Vercel-Region (#1, separat).
- Wechsel `getUser()` → `getSession()` als Security-Gate (nicht zulässig).
- Daten-Caching (Perf-2, erledigt).
- Monolith-Zerlegung.

## Risiken
- `cache()` nur für **lesende**, idempotente Helfer (Auth/Profil) — keine Mutationen cachen.
- Suspense-Fallbacks ohne Layout-Shift dimensionieren.
- Sicherheits-Checks weiterhin auf `getUser()` (verifiziert), nicht auf das Cookie.

## Verifikation
```bash
npm run typecheck && npm test && npm run build
```
- Perf-1-Logs/Server-Timing: pro Seiten-Render nur **ein** Auth/Profil-Roundtrip.
- Manuell (Prod, nach #1-Deploy): TTFB + First Paint der Hot-Routen spürbar besser; Verhalten/Rollen-Sichtbarkeit unverändert.

## Reihenfolge
T1 (Auth/Profil-Dedup, größter Roundtrip-Gewinn) → T2 (Streaming, perceived). Ein zusammenhängender Block, gern 2 PRs.
