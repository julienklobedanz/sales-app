# Dashboard-Inhalts-Audit (Spec §3 ↔ Implementierung)

**Datum:** Juni 2026  
**Scope:** MVP-Funktions-Rollen (`sales_rep`, `account_manager`, `sales_leader`) + Generalist-Fallback  
**Quelle Spec:** `docs/arbeitspaket-dashboards-navigation-welle-3.md` § T1 (D1)

---

## Dispatcher

[`lib/dashboard-home/dashboard-home-dispatch.ts`](../lib/dashboard-home/dashboard-home-dispatch.ts) wählt über `function_role` / `system_role`:

| Bedingung | Dashboard-Variante |
|-----------|-------------------|
| `system_role === 'viewer'` | Generalist |
| `function_role === 'account_manager'` | Account Manager |
| `function_role === 'sales_leader'` | Sales Leader (`AdminDashboard`) |
| `function_role === 'sales_rep'` | Sales Rep |
| sonst | Generalist (Fallback) |

`FUNCTION_ROLES` MVP: `sales_rep`, `account_manager`, `sales_leader` — entspricht Entscheidung A2.

**Bewusst nicht im Scope:** Reference Program Manager, Marketing, Bid Manager, Legal, Sales Ops (Capability bzw. vertagt).

---

## Abgleich je Rolle

| Rolle | Spec §3 (Hero + ≤3 Widgets) | Implementierung | Status |
|-------|----------------------------|-----------------|--------|
| **Sales Rep** | Such-Hero; aktive Deals; empfohlene Referenzen; kürzlich geteilt; kein synthetischer Pipeline-Impact | [`CommandCenter`](../components/dashboard/command-center.tsx) als Such-Hero in [`role-home-dashboard.tsx`](../components/dashboard/role-home-dashboard.tsx); Widgets in [`sales-rep-dashboard.tsx`](../components/dashboard/sales-rep-dashboard.tsx) | ✓ |
| **Account Manager** | Hero Neue Ref/Bulk; eigene Ref nach Status; ausstehende Freigaben; Nutzung eigener Ref | [`account-manager-dashboard.tsx`](../components/dashboard/account-manager-dashboard.tsx) | ✓ |
| **Sales Leader** | KPI-Leiste (Win-Rate ehrlich); Adoption; Top-Referenzen; Abdeckungslücken | [`admin-dashboard.tsx`](../components/dashboard/admin-dashboard.tsx) `variant="sales_leader"` — ehrliche Win-Rate, WAU, Pipeline-Signal-Widget (C4) | ✓ |
| **Generalist** | Kombi: Suche + Deals + Freigaben + Nutzung | [`CommandCenter`](../components/dashboard/command-center.tsx) + [`generalist-dashboard.tsx`](../components/dashboard/generalist-dashboard.tsx) | ✓ |

---

## Befunde

### F1 — Toter Code `pipelineImpact` (behoben)

`pipelineImpact` wurde in [`dashboard-home-sales-rep.ts`](../lib/dashboard-home/dashboard-home-sales-rep.ts) berechnet, aber nirgends in der UI gerendert (Proof-over-Promise nach W0/D3). Feld und Berechnung entfernt.

### F2 — Such-Hero Sales Rep (kein Handlungsbedarf)

Der Such-Hero ist **nicht** entfernt: er lebt als `CommandCenter` oberhalb der Sales-Rep-Widgets (nicht innerhalb von `sales-rep-dashboard.tsx`). Semantische Suche ist zusätzlich über Sidebar „Match“ erreichbar (Welle 0).

### Positiv

- Win-Rate Sales Leader: ehrlich („zu wenig Daten" bei &lt;3 Deals) — D3 ✓
- Keine hartkodierten Fake-KPIs im Leader-Dashboard
- `count: 'planned'` in Hot-Paths (Perf-3) ✓

---

## Nächste Schritte (außerhalb dieses Audits)

- Pilot-Block (G2/E1): echte Nutzerdaten, vertagte Rollen (RPM/Marketing)
- Optional: weiterer Loader-Cleanup (`dailyTopActions`, `liveIntent` — derzeit nicht in Sales-Rep-UI gerendert)
