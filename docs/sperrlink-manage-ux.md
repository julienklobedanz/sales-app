# Sperrlink / Manage-Ansicht (`/p/?manage=&mode=revoke`)

Dokumentation für die **Verwaltungs-Ansicht** des Referenzgebers (Kundenlink mit Sperrlink).

## URL

- Manage: `/p/{slug}?manage={token}&mode=revoke`
- Empfänger-Vorschau (Prospect): `/p/{slug}` optional `?r={recipientToken}` — **ohne** `manage` / `mode`

## MVP (umgesetzt)

| Thema | Verhalten |
|-------|-----------|
| Leere Meta-Felder | Prospect: Zeile ausblenden. Manage: Schloss + Hinweis „Nicht in Freigabe / keine Angabe“. |
| Banner | Verwaltungs-Ansicht + Link „So sehen Empfänger Ihre Referenz“ (neuer Tab, Kundenlink). |
| Insight-Bar | Views + letzte Ansicht (Flagge, Dauer Min./Sek., relativ) + Gültig bis / Ohne Ablaufdatum — nur Manage. |
| Freigabe-Status | Unter „Meine Freigabe bearbeiten“: Freigegeben seit · Anonymisiert ja/nein. |
| Self-Tracking | Manage-Aufrufe erhöhen `view_count` / Session-Tracker nicht. |
| CTAs | Frage / Termin / PDF ausgeblendet in Manage; „Meine Freigabe bearbeiten“ prominent. |
| Sperren | Dialog + Toast mit klarer Folge (Link tot, Workspace informiert). |
| Freigabe bearbeiten | Weiterhin `/approval/{token}` via `resolveApprovalEditUrlForManageView`. |

## Ist vs. Soll (Checkliste)

- [x] Amber-Banner Manage
- [x] Empfänger-Vorschau-Link im Banner
- [x] Hybrid leere Felder (Prospect / Manage)
- [x] Prospect-CTAs in Manage aus
- [x] Views / letzte Ansicht (Manage-Bar)
- [x] Ablaufdatum in Insight-Bar (`expires_at`)
- [x] Freigabe-Statuszeile unter Bearbeiten (seit / anonym)
- [x] Kein Tracking-Zähler für Freigeber-Self-Views
- [x] Paage-light Tracking (Sessions, Land) — Dashboard + API; Manage-Bar nutzt Sessions

## Paage / Tracking (Referenz)

- **Buyer-Logo:** nur bei personalisiertem Link `?r=` + `companies.logo_url` am Recipient — kein Clearbit/Domain-Raten.
- **Signale:** `view_count`, `portfolio_view_sessions` (Land ISO, `active_seconds`), Klicks via Events.
- **Copy-Idee:** „Letzte Ansicht aus DE · 4 Min · vor 37 Min“.
- **DSGVO:** kein Roh-IP langfristig; nur abgeleitetes Land + Session-Metadaten.

## Backlog (nach MVP)

1. **KPI-Block** unter Projektdetails (Sidebar), aus `kpisForPublicReference` — Aurubis-Zahlen aus Fließtext sichtbar machen.
2. **Zitat + Ansprechpartner** rechts unten, mit Stift → Freigabe bearbeiten / Inline wo sinnvoll.
3. **Materialien / Anhänge** nur wenn `reference_assets` öffentlich freigegeben werden — sonst kein leerer Block.
4. **Vertrauensanker:** „Nur für {Firma}“ wenn Recipient + Ablaufdatum des Kundenlinks in Manage sichtbar.
5. **Freigabe-Checklist-Panel:** Scope-Flags (Logo, anonym, Volumen), `approval_responded_at`, Link-`expires_at`.

## Relevante Dateien

- [`app/p/[slug]/page.tsx`](../app/p/[slug]/page.tsx)
- [`app/p/[slug]/showcase-single-reference.tsx`](../app/p/[slug]/showcase-single-reference.tsx)
- [`app/approval/[token]/approval-case-data-bar.tsx`](../app/approval/[token]/approval-case-data-bar.tsx)
- [`lib/references/resolve-approval-edit-url-for-manage.ts`](../lib/references/resolve-approval-edit-url-for-manage.ts)
- [`supabase/migrations/20260728130000_portfolio_tracking.sql`](../supabase/migrations/20260728130000_portfolio_tracking.sql)
