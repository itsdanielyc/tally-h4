# Tally

<!-- keel:start -->
Tally is a local desktop expense ledger for one person on Windows x64,
macOS Apple silicon or Linux x64. See `PRODUCT.md` and the decisions in
`docs/adr/`. The browser is the test surface with a labelled mock.

## Commands

- `npm run lint`, `npm run test:unit`, `npm run test:contracts`, `npm run test:integration`
- `npm run test:ui` uses the labelled mock.
- `npm run build` then `npm run test:e2e` runs the real Electron shell.
- `npm run triage -- <run-id>` summarizes a hosted run.

## Layout and ownership

One agent owns the whole repository. `src/` reaches the backend through
`src/api.ts`. `contracts/` contains shared types. `application/` orchestrates
commands, `domain/` contains pure ledger rules, and `electron/` contains
IPC, storage and platform integration. `tests/` contains the verification
suites.

## Keel rules

1. Record level, platform and run for each verification claim in append-only `VERIFICATION.md`.
2. Prove that new tests fail on the intended defect. Restore the code and prove green again.
3. Update types, mock, native implementation and contract checks together in a solo slice.
4. Capture pixels on hosted runners with `snapshots`. Keep ARIA and geometry baselines shared.
5. Quarantine flakes and record the cause or tracking issue. Keep retries to one at L6 or L7 only.
6. Test the shipped entry points. Keep harnesses outside production code.
7. Keep lint and the size limits in `ARCHITECTURE.md` green without suppressions.

See `PLAN.md` for the slices, `TESTING.md` for strategy and `VERIFICATION.md`
for evidence. Use the repository copies of Keel under `.agents/skills/` and
`.claude/skills/`.
<!-- keel:end -->
