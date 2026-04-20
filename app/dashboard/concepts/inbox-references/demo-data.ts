export type InboxReferenceStatus = "new" | "in_review" | "approved" | "archived"

export type InboxReference = {
  id: string
  title: string
  company: string
  snippet: string
  body: string
  tags: string[]
  status: InboxReferenceStatus
  createdAt: string // ISO date
  score?: number
}

export const DEMO_INBOX_REFERENCES: InboxReference[] = [
  {
    id: "ref_001",
    title: "CRM Migration (HubSpot) – Erfolgsgeschichte",
    company: "Acme GmbH",
    snippet:
      "Vom Legacy-CRM zu HubSpot in 6 Wochen – inkl. Datenbereinigung, Pipeline-Redesign und Sales Enablement.",
    body:
      "Kurzfassung:\n\n- Ausgangslage: uneinheitliche Daten, geringe Adoption\n- Ziel: saubere Pipeline, Reporting, Automatisierung\n- Ergebnis: +18% Conversion in Q2\n\nDetails:\nWir haben zunächst die Datenqualität über Regeln/Validierungen stabilisiert, anschließend die Pipeline neu modelliert und E-Mail Sequenzen eingeführt. Training + Playbooks sorgten für schnelle Adoption.",
    tags: ["crm", "hubspot", "sales"],
    status: "approved",
    createdAt: "2026-03-18",
    score: 92,
  },
  {
    id: "ref_002",
    title: "RFP: Enterprise Security Review",
    company: "BluePeak AG",
    snippet:
      "Security Questionnaire, DSGVO/AVV, SOC2-Alignment, Threat Model – inklusive Kompensationsmaßnahmen.",
    body:
      "Diese Referenz beschreibt ein Enterprise Security Review mit Fokus auf:\n\n- Zugriffskontrollen & Rollenmodell\n- Logging/Auditing\n- Datenklassifizierung\n- Incident Response\n\nOutcome: Freigabe nach 2 Iterationen, plus Roadmap für 3 Quick Wins.",
    tags: ["security", "compliance", "soc2"],
    status: "in_review",
    createdAt: "2026-04-02",
    score: 78,
  },
  {
    id: "ref_003",
    title: "Case Study: Pricing Experiment (B2B SaaS)",
    company: "Indeedly Labs",
    snippet:
      "A/B Test neuer Pakete, Nutzungsbasierte Add-ons und Sales Assist – Auswirkung auf ARPA und Win Rate.",
    body:
      "Wir haben 3 Preispunkte getestet und parallel ein Add-on Modell eingeführt.\n\nKey Learnings:\n- Klarere Value Metrik reduziert Einwände\n- Add-ons steigern Expansion\n\nResultat: +12% ARPA, stabile Churn.",
    tags: ["pricing", "experiment", "b2b"],
    status: "new",
    createdAt: "2026-04-09",
    score: 85,
  },
  {
    id: "ref_004",
    title: "Integration: Supabase Auth + SSO (Pilot)",
    company: "Northwind SE",
    snippet:
      "SSO Pilot mit Rollenmapping, Session Handling und Audit Trails – inkl. Migration bestehender Accounts.",
    body:
      "Pilot Setup:\n- SSO Provider Anbindung\n- Rollen-/Gruppenmapping\n- Migration bestehender Nutzer\n\nWichtig: saubere Back/Forward Navigation in UI sowie klare Zuständigkeiten bei IdP-Konfiguration.",
    tags: ["supabase", "auth", "sso"],
    status: "approved",
    createdAt: "2026-02-27",
    score: 88,
  },
  {
    id: "ref_005",
    title: "Projekt: Knowledge Base Re-Structure",
    company: "KiloWorks",
    snippet:
      "Taxonomie neu aufgebaut, Tagging-Richtlinien, Suche verbessert – Ergebnis: deutlich weniger Duplicate Content.",
    body:
      "Wir haben eine Taxonomie mit 4 Ebenen eingeführt und Guidelines für Tags definiert.\n\nErgebnis:\n- weniger Duplicate Content\n- bessere Suchtreffer\n- klarere Ownership pro Bereich",
    tags: ["knowledge", "search", "taxonomy"],
    status: "archived",
    createdAt: "2025-12-15",
    score: 70,
  },
]

// Fülle für Scroll/Filter-Demos auf ~30 Items auf (deterministisch).
const BASE = DEMO_INBOX_REFERENCES.slice()
for (let i = 6; i <= 30; i++) {
  const base = BASE[(i - 1) % BASE.length]!
  DEMO_INBOX_REFERENCES.push({
    ...base,
    id: `ref_${String(i).padStart(3, "0")}`,
    title: `${base.title} #${i}`,
    createdAt: `2026-04-${String(((i - 1) % 20) + 1).padStart(2, "0")}`,
    score: typeof base.score === "number" ? Math.max(40, (base.score + i) % 100) : undefined,
    status:
      i % 7 === 0 ? "archived" : i % 5 === 0 ? "in_review" : i % 3 === 0 ? "new" : "approved",
    tags: i % 4 === 0 ? [...base.tags, "concept"] : base.tags,
  })
}

