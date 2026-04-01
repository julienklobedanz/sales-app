# Refactoring-Welle 2 (Plan + Umsetzung)

Ziel dieser zweiten Refaktorisierungswelle ist **Perfektion im Sinne von Wartbarkeit, Konsistenz und Professionalität**, basierend auf unseren bestehenden Standards:

- `docs/ai-coding-agent-guide.md` (Session-Standard)
- `docs/design-system.md` (Tokens, Badges, Copy, Icons)
- `docs/qc-struktur-plan.md` (Slices, Server Actions Pattern)

**Ausgeschlossen:** Punkt 6 (Nicht-Funktionales wie Monitoring/Security/Rate-Limits etc.) ist **nicht Teil** dieses Plans.

---

## Stand (Umsetzung abgeschlossen für die geplanten P2-Kernpunkte)

- **P0 erledigt:** CI (`lint` → `test` → `build`), Prettier-Skripte, `lucide-react` entfernt, Vitest + Tests für `lib/format` und `lib/slug`, `engines.node` in `package.json`.
- **P1 (dashboard-overview):** Extrahiert: `overview/bulk-delete-references-dialog.tsx`, `overview/trash-dialog.tsx`, `overview/reference-detail-sheet.tsx` (Bulk-Löschen, Papierkorb inkl. „Papierkorb leeren“-Alert, Referenz-Detail-Sheet).
- **P2 – erledigt (Kern):**
  - **(6)** `reference-form.tsx`: Feldkomponenten in `reference-form-fields.tsx` (Dropzones, Combobox).
  - **(8)** COPY-Rollout 2: `lib/copy.ts` um Tabellen-, Evidence-, Dashboard- und Command-Palette-Strings erweitert; Verwendung u. a. in Evidence-DataTable, `dashboard-overview`, `components/ui/app-data-table`, `components/ui/command-palette`.
  - **(9)** DataTable: gemeinsame `DataTablePagination`; später **`AppDataTable`** als eine Basis für Evidence + Deals (siehe `components/ui/app-data-table.tsx`).
  - **(10)** Danger Zone: klare UX + `COPY.settings.*` (kein toter Button ohne Hinweis).
- **P2 – erledigt (Company-Detail):** **(7)** `company-detail-client.tsx` in Tab-, Header- und Dialog-Module unter `app/dashboard/accounts/` aufgeteilt (`company-detail-*`, `company-stakeholder-*`, `company-contact-dialog`).

---

## Prioritäten (P0–P2)

### P0 – maximale Hebel, niedriger Streitwert (sofort)

1. **CI (GitHub Actions):** `npm run lint` + `npm run build` auf PR/Push.
2. **Code-Formatierung:** Prettier minimal konfigurieren (ohne Mass-Reformat), um Diff-Noise zu reduzieren.
3. **Dependencies aufräumen:** `lucide-react` entfernen, sofern wirklich ungenutzt.
4. **Minimale Tests:** Vitest + Unit-Tests für `lib/` (mindestens `format` und `slug`).

### P1 – strukturelle Hauptschuld (große Dateien entkernen)

5. **`app/dashboard/dashboard-overview.tsx` zerlegen** (ohne Behavior-Change):
   - Tabs/Views, Dialoge, Toolbar-Sektionen, Tabellen-Render-Teile in eigene Dateien.
   - Ziel: Page als „Komposition“ (max. grob 200–400 Zeilen).
6. **`app/dashboard/evidence/new/reference-form.tsx` zerlegen** (ohne Behavior-Change):
   - Dropzones/Step-Komponenten/Form-Sections extrahieren.
   - Ziel: „Wizard“-Komposition, klare Props, lokale State-Logik pro Section.
7. **`app/dashboard/accounts/company-detail-client.tsx` verkleinern**:
   - Sektionen und Dialoge extrahieren (analog Deals/Evidence).

### P2 – Konsistenz & Standardisierung (nach dem Aufsplit)

8. **COPY-Rollout 2:** verbleibende wiederkehrende Strings zentralisieren (`lib/copy.ts`).
9. **DataTable-Konsolidierung:** Evidence-Table weiter an `components/ui/data-table.tsx` angleichen oder die Doppelstruktur reduzieren.
10. **Danger Zone TODO** (ohne Security-Work):
   - Mindestens: klare UX (disabled + Hinweis + Tracking-Link/Issue-Text), damit kein „toter“ Button bleibt.

---

## Umsetzungsstrategie (wichtig)

- **Inkrementell und verifizierbar:** Nach jedem größeren Block `npm run lint` + `npm run build` (und später `npm test`).
- **Kein Mass-Reformat:** Prettier einführen, aber nur betroffene Dateien formatieren.
- **Refactor ohne Logikänderung:** Erst Aufsplitten/Extrahieren; danach erst optionale Verbesserungen.
- **Design & Copy:** Tokens/Badges/`COPY` immer nach Standards verwenden (siehe `docs/design-system.md`).

---

## Definition of Done pro Schritt

- CI/Tooling: Workflow läuft, Status wird angezeigt, lokale Scripts funktionieren.
- Refactor-Slices: Keine UI-/Behavior-Regression (Smoke), keine neuen Lints, Build grün.
- Konsistenz: Tokens statt Hardcodes, zentrale Badges/Copy statt Duplikate.

