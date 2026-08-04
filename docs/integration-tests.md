# Integrationstests (E3)

## Strategie

| Ebene           | Ort                                          | Lauf                                                              |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| **Unit**        | `lib/**/*.test.ts`                           | jeder PR (`npm test`)                                             |
| **Integration** | `tests/integration/**/*.integration.test.ts` | jeder PR (`npm run test:integration`, CI-Job `integration-tests`) |

Integrationstests brauchen einen lokalen Supabase-Stack mit Auth + RLS (nicht nur Postgres wie `db-migrations`).

## Lokal

```bash
supabase start
eval "$(supabase status -o env | sed 's/^/export /')"
export SUPABASE_TEST_URL="$API_URL"
export SUPABASE_TEST_ANON_KEY="$ANON_KEY"
export SUPABASE_TEST_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
npm run test:integration
```

Alternativ nach `supabase status -o env` die Variablen `API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` werden vom Harness automatisch gelesen.

Ohne Stack: Integration-Suite wird per `describe.skip` übersprungen; Unit-Tests laufen normal.

## Abgedeckte sicherheitskritische Flows

- **RLS Sichtbarkeit:** `sales_rep` sieht keine fremden Entwürfe/NDA; `account_manager` schon
- **Mandanten-Isolierung:** Org A sieht keine Referenzen/Companies von Org B
- **Approval:** interner Review-Token + `complete_client_approval` RPC
- **Auth-Gating (Unit):** `profileIsSalesRestricted` / `profileCanManageOrgData` für Import & Org-Aktionen

## Harness

- `lib/test/integration-supabase.ts` — Clients, Login
- `lib/test/integration-fixtures.ts` — Seed/Cleanup (Orgs, User, Referenzen)

Regress bei gelockerter RLS-Policy: `reference-visibility-rls.integration.test.ts` muss rot werden.
