# Tally testing strategy

<!-- keel:start -->
| Level | Tool and command | Where |
|---|---|---|
| L0 | TypeScript, ESLint, Knip, `npm run lint` | Linux on pushes and PRs |
| L1 | Vitest, `npm run test:unit` | Linux on pushes and PRs |
| L2 | Vitest mock and native contract suite, `npm run test:contracts` | Linux on pushes and PRs |
| L3 | Vitest real filesystem, `npm run test:integration` | All Tier 1 runners |
| L4/L5 | Playwright Chromium against the labelled mock, `npm run test:ui` | All Tier 1 runners |
| L6 | Built Electron with Playwright, `npm run build` then `npm run test:e2e` | All Tier 1 runners |
| L7 | `installers` and pre-tag `release` workflows | All Tier 1 runners |

## Critical journeys

| Journey | Planned proof | Test files |
|---|---|---|
| Add, edit, delete and reopen a transaction | L1, L2, L3, L4, L6 | `tests/unit/transactions.test.ts`, `tests/contract/ledger.test.ts`, `tests/integration/ledger-file.test.ts`, `tests/ui/transactions.spec.ts`, `tests/e2e/ledger.spec.ts` |
| Preview and import a CSV atomically, report rejected rows and skip duplicates | L1, L2, L3, L4, L6 | `tests/unit/import.test.ts`, `tests/contract/ledger.test.ts`, `tests/integration/csv-import.test.ts`, `tests/ui/import.spec.ts`, `tests/e2e/import.spec.ts` |
| Manage categories and apply payee rules to existing and imported rows | L1, L2, L3, L4 | `tests/unit/categories.test.ts`, `tests/contract/ledger.test.ts`, `tests/integration/category-store.test.ts`, `tests/ui/categories.spec.ts` |
| Reconcile monthly totals and budget balances | L1, L2, L4, L6 | `tests/unit/month.test.ts`, `tests/contract/ledger.test.ts`, `tests/ui/month.spec.ts`, `tests/e2e/import.spec.ts` |
| Filter, export, import the result and undo | L1, L2, L3, L4, L6 | `tests/unit/find.test.ts`, `tests/contract/ledger.test.ts`, `tests/integration/csv-export.test.ts`, `tests/ui/find.spec.ts`, `tests/e2e/export.spec.ts` |
| Install, launch and uninstall each native bundle | L7 | `scripts/installer-test.ps1` and `scripts/installer-test.sh` |

Visuals use shared ARIA and 8 px geometry baselines, and hosted per-OS pixel
baselines at a 0.002 maximum difference ratio. The real-shell workflow uploads
screenshots and a contact sheet. `VERIFICATION.md` records evidence.

Budgets are 3 minutes for L0–L2, 5 for L4/L5 per OS, 15 for L6 per OS,
25 for L7 per OS and 20 for the PR. Follow `keel-test` §§4–6 for mutation
checks, triage and flakes. A new test must fail against a defect and pass after
the fix. One retry is allowed at L6/L7 only.

Manual assistive-technology use, real power-loss fault injection, and Linux
distributions beyond the Tier 1 runner remain outside automated coverage.
Native dialog journeys use an injected path and exercise the real file I/O.
<!-- keel:end -->
