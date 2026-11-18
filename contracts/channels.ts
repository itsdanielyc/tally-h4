import type { LedgerApi } from "./ledger";

export const channels = {
  loadLedger: "tally:load-ledger",
  saveTransaction: "tally:save-transaction",
  deleteTransaction: "tally:delete-transaction",
  setCurrency: "tally:set-currency",
  chooseImportFile: "tally:choose-import-file",
  previewImport: "tally:preview-import",
  confirmImport: "tally:confirm-import",
} satisfies Record<keyof LedgerApi, string>;
