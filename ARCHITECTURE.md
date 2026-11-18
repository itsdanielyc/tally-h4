# Tally architecture

<!-- keel:start -->
## Module map

| Module | Responsibility | May call | Must stay independent of |
|---|---|---|---|
| `src/` | Render the ledger and its workflows | `src/api.ts`, shared data and presentation types | Node, files and Electron |
| `src/api.ts`, `src/mock/`, `electron/preload.ts` | Route the shared API to the native bridge or explicitly labelled mock | Shared contracts and the platform transport | Screen state |
| `application/`, `electron/ipc.ts` | Execute ledger operations at the API boundary | Domain and injected persistence and file ports | DOM and OS dialogs |
| `domain/` | Enforce ledger, money and CSV rules | Shared contracts and other pure domain functions | Files, Electron and renderer state |
| `electron/store/` | Load and commit the versioned ledger | Node filesystem and domain validation | Renderer and dialogs |
| `electron/files.ts`, `electron/main.ts` | Isolate platform integration and compose the desktop app | Electron, filesystem and application ports | Product policy and screen state |

## Contract and state

`contracts/` is the TypeScript source of truth for requests, results and the
preload bridge. The same compiled contract types the browser mock and the
native service. L2 exercises both implementations, and L6 calls the contract
through the sandboxed preload. The mock stores an independent in-memory ledger
and uses browser fixtures for files. The packaged UI talks only to the main
process and keeps transient form, navigation and selection state in the renderer.

The main process serializes operations that read or write the ledger. The live
file is JSON in Electron's user data directory. Reads validate the schema and
migrate older formats in memory before the next commit. A commit writes and
syncs a temporary sibling, replaces the live file atomically, and syncs its
directory where supported. A failed save leaves the last committed state in use.
An undoable mutation retains one previous committed state for the current session.

Dates are calendar strings in `YYYY-MM-DD`. Single-currency amounts are signed
safe integers in minor units, with exact integer arithmetic for parsing and
aggregation. IDs identify individual transactions even when the date, payee and
amount match. A set indexes existing transaction identities during CSV import.

## Platform integration

The main process owns native file selection and file access. L6 substitutes a
preselected file path through a small test-environment bypass. The release
workflow packages the same renderer and Electron entry points used by L6.

## Ownership and size limits

Solo ownership covers all paths. `npm run lint` enforces types, dead-code
checks and limits of 400 lines per file and 80 per production function. Review
also checks 400 lines and 25 public members across the files of any class,
component, hook or view model. Each pipeline has one orchestrator. A slice
splits anything that crosses a limit, and an ADR is required to raise a limit.

## Deliberately simple

- A JSON file keeps upgrades and commits inspectable. Measure open or save time
  with realistic years of data before considering a database.
- Ordered payee rules use the first match. Consider more rule controls when
  actual ledgers need precedence beyond list order.
- Undo holds one in-memory snapshot. Persisting history belongs to a future
  decision if users need undo across restarts.
<!-- keel:end -->
