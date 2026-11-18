# Verification ledger

Append-only. Each row says what was proven, where, and by which run. "Built"
is never rounded up to "tested"; anything not listed here is unverified.

| Date | Level | Claim | Platforms | Evidence |
|---|---|---|---|---|
| 2026-11-18 | L0–L2 | Scaffold lint and mock contract | ubuntu-latest | [CI 44351534657](https://github.com/itsdanielyc/tally-h4/actions/runs/44351534657), unit job green. Local mutation expected `Hello, Keel!` and received `Hello, Keel broken!` before restoration. |
| 2026-11-18 | L4–L5 | Scaffold browser flow, shared ARIA and geometry, and per-OS pixels | ubuntu-latest, windows-latest, macos-latest | [Capture 44348498234](https://github.com/itsdanielyc/tally-h4/actions/runs/44348498234) and [CI 44351534657](https://github.com/itsdanielyc/tally-h4/actions/runs/44351534657), all three UI jobs green. Reviewed the three PNGs. |
| 2026-11-18 | L6 | Scaffold launches Electron and reaches the native contract through the sandboxed preload | linux-x64, windows-x64, macos-arm64 | [CI 44351534657](https://github.com/itsdanielyc/tally-h4/actions/runs/44351534657) Linux and Windows jobs and [isolated CI 44357294005](https://github.com/itsdanielyc/tally-h4/actions/runs/44357294005) macOS job. Only the workflow matrix differs. Reviewed all three shell screenshots. |
| 2026-11-18 | L7 | Scaffold installer install, launch and uninstall | linux-x64, windows-x64, macos-arm64 | [Installers 44348501461](https://github.com/itsdanielyc/tally-h4/actions/runs/44348501461), three jobs green. Demo bundles only. |
| 2026-11-18 | L0-L3, L6 | Slice 1. Exact minor units, native and mock CRUD, prior schema, interrupted replacement, real Electron restart. | L0-L2 Linux x64. L3 and L6 Windows x64, macOS arm64, Linux x64. | [CI 44359857292](https://github.com/itsdanielyc/tally-h4/actions/runs/44359857292) unit and the Windows/Linux real-shell jobs green. [Apple silicon 44366645346](https://github.com/itsdanielyc/tally-h4/actions/runs/44366645346) checkpoint 1 at 7943a1d05ce5db2ffe2decadf82282420fd0cdae. Local mutation failures are in [PR #2](https://github.com/itsdanielyc/tally-h4/pull/2). |
| 2026-11-18 | L4-L5 | Slice 1. Browser feature checks and three visual tiers. | Windows x64, macOS arm64, Linux x64 | [Capture 44359680908](https://github.com/itsdanielyc/tally-h4/actions/runs/44359680908) verified the new baselines on Windows and Linux. [Apple silicon 44366645346](https://github.com/itsdanielyc/tally-h4/actions/runs/44366645346) verified the same checkpoint on macOS. Reviewed the three PNGs. |

## Unverified

- Slices 2 through 6 are pending proof.
