# Verification ledger

Append-only. Each row says what was proven, where, and by which run. "Built"
is never rounded up to "tested"; anything not listed here is unverified.

| Date | Level | Claim | Platforms | Evidence |
|---|---|---|---|---|
| 2026-11-18 | L0–L2 | Scaffold lint and mock contract | ubuntu-latest | [CI 44351534657](https://github.com/itsdanielyc/tally-h4/actions/runs/44351534657), unit job green. Local mutation expected `Hello, Keel!` and received `Hello, Keel broken!` before restoration. |
| 2026-11-18 | L4–L5 | Scaffold browser flow, shared ARIA and geometry, and per-OS pixels | ubuntu-latest, windows-latest, macos-latest | [Capture 44348498234](https://github.com/itsdanielyc/tally-h4/actions/runs/44348498234) and [CI 44351534657](https://github.com/itsdanielyc/tally-h4/actions/runs/44351534657), all three UI jobs green. Reviewed the three PNGs. |
| 2026-11-18 | L6 | Scaffold launches Electron and reaches the native contract through the sandboxed preload | linux-x64, windows-x64, macos-arm64 | [CI 44351534657](https://github.com/itsdanielyc/tally-h4/actions/runs/44351534657) Linux and Windows jobs and [isolated CI 44357294005](https://github.com/itsdanielyc/tally-h4/actions/runs/44357294005) macOS job. Only the workflow matrix differs. Reviewed all three shell screenshots. |
| 2026-11-18 | L7 | Scaffold installer install, launch and uninstall | linux-x64, windows-x64, macos-arm64 | [Installers 44348501461](https://github.com/itsdanielyc/tally-h4/actions/runs/44348501461), three jobs green. Demo bundles only. |

## Unverified

- Tally's ledger features and final release bundles are pending slices 1–6.
