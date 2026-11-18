# Changelog

## [Unreleased]

## [0.1.0] - 2026-11-18

### Added

- Record, edit and delete transactions in a local ledger that reopens after a restart.
- Preview bank CSVs, map date and amount columns, and see which rows were skipped or rejected.
- Manage categories and apply payee rules to imports and uncategorised transactions.
- Compare monthly income, spending and category budgets.
- Search and filter the ledger, export matching transactions to a CSV Tally can reimport, and undo the latest delete, category merge or import.

### Fixed

- Preserve original imported text during edits and report blank records and repeated headers by line.
- Infer decimal separators from the selected column and flag ambiguous amounts before import.
- Keep Undo and Export aligned with the ledger on screen while saves are pending.
- Clear previous totals when navigating to another month.

### Bundles and signing

- Windows x64 uses a per-user NSIS installer. Without publisher signing, SmartScreen may show “Windows protected your PC.” Publisher signing needs an OV or EV certificate or a service such as Azure Trusted Signing.
- macOS Apple silicon uses a DMG without Developer ID signing or notarization. Gatekeeper may show “Apple could not verify ‘Tally’ is free of malware.” Notarization needs a paid Apple Developer membership with a yearly fee.
- Linux x64 uses a DEB or AppImage. The unsigned bundles have SHA-256 checksum files.
